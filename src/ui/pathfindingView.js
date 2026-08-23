import { createGrid, setWall, setWeight, clearCell, isWall, key, DEFAULT_WEIGHT } from '../algorithms/grid.js';
import { PATHFINDERS } from '../algorithms/pathfinding/index.js';
import { MAZES } from '../algorithms/maze.js';
import { GridRenderer, COLORS } from './gridRenderer.js';
import { Animator } from './animator.js';
import { el, select, slider, stat } from './dom.js';

const SIZES = {
  small: { rows: 15, cols: 25, label: 'Small (15 x 25)' },
  medium: { rows: 21, cols: 41, label: 'Medium (21 x 41)' },
  large: { rows: 31, cols: 61, label: 'Large (31 x 61)' },
};

export function mountPathfinding(root) {
  // ---- state ----
  let size = 'medium';
  let grid = createGrid(SIZES[size].rows, SIZES[size].cols);
  let start = { r: 2, c: 2 };
  let end = { r: grid.rows - 3, c: grid.cols - 3 };
  let algo = 'astar';
  let mazeType = 'division';
  let tool = 'wall'; // 'wall' | 'weight' | 'erase'
  let drag = null; // { kind: 'paint' | 'start' | 'end' }
  let lastPainted = null;
  let dirty = false; // has the grid been solved (overlay present)?
  let t0 = 0;

  // ---- DOM ----
  const canvas = el('canvas');
  const renderer = new GridRenderer(canvas);

  const visitedStat = stat('Visited');
  const pathStat = stat('Path length');
  const costStat = stat('Path cost');
  const timeStat = stat('Time');
  const status = el('span.status');

  const runBtn = el('button.btn.primary', { onclick: run, textContent: 'Visualize' });
  const stopBtn = el('button.btn', { onclick: stopRun, textContent: 'Stop', disabled: true });
  const mazeBtn = el('button.btn', { onclick: generateMaze, textContent: 'Generate Maze' });
  const clearPathBtn = el('button.btn', { onclick: clearOverlay, textContent: 'Clear Path' });
  const resetBtn = el('button.btn.danger', { onclick: resetBoard, textContent: 'Reset Board' });

  const toolBtns = {
    wall: el('button.btn.active-mode', { onclick: () => setTool('wall'), textContent: 'Wall' }),
    weight: el('button.btn', { onclick: () => setTool('weight'), textContent: 'Weight (' + DEFAULT_WEIGHT + ')' }),
    erase: el('button.btn', { onclick: () => setTool('erase'), textContent: 'Erase' }),
  };

  const speedSlider = slider('Speed', { min: 1, max: 100, value: 60 }, (v) => animator.setSpeed(v));

  const algoSelect = select(
    Object.fromEntries(Object.entries(PATHFINDERS).map(([k, v]) => [k, v.name])),
    algo,
    (v) => {
      algo = v;
      if (dirty) solveInstant();
    },
  );
  const mazeSelect = select(
    Object.fromEntries(Object.entries(MAZES).map(([k, v]) => [k, v.name])),
    mazeType,
    (v) => {
      mazeType = v;
    },
  );
  const sizeSelect = select(
    Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.label])),
    size,
    (v) => {
      size = v;
      resetBoard();
    },
  );

  const controls = el(
    'div.controls',
    {},
    el('div.control', {}, el('label', { textContent: 'Algorithm' }), algoSelect),
    el('div.control', {}, el('label', { textContent: 'Maze' }), mazeSelect),
    el('div.control', {}, el('label', { textContent: 'Grid' }), sizeSelect),
    speedSlider,
    el('div.control', {}, el('label', { textContent: 'Draw' }), ...Object.values(toolBtns)),
    el('div.spacer'),
    mazeBtn,
    clearPathBtn,
    resetBtn,
    stopBtn,
    runBtn,
  );

  const legend = el(
    'div.legend',
    {},
    ...[
      ['Start', COLORS.start],
      ['End', COLORS.end],
      ['Wall', COLORS.wall],
      ['Weight', COLORS.weight],
      ['Frontier', COLORS.frontier],
      ['Visited', COLORS.visited],
      ['Path', COLORS.path],
    ].map(([label, color]) =>
      el('span.legend-item', {}, el('span.swatch', { style: 'background:' + color }), label),
    ),
  );

  const stats = el('div.stats', {}, visitedStat, pathStat, costStat, timeStat, status);
  const stage = el('div.stage', {}, canvas);
  const hint = el('div.hint', {
    textContent:
      'Click or drag on the grid to draw. Drag the green start or red end marker to move it. ' +
      'Weighted cells cost ' + DEFAULT_WEIGHT + ' to enter (Dijkstra, A* and Greedy respect weights; BFS and DFS ignore them).',
  });

  root.append(controls, el('div.stats', {}, legend), stats, stage, hint);

  // ---- animation ----
  const animator = new Animator({
    onStep: (step) => {
      if (!isEndpoint(step.r, step.c)) renderer.mark(step.r, step.c, step.type === 'visit' ? 'visited' : 'frontier');
      renderer.draw(grid, start, end);
    },
    onDone: (result) => finish(result, performance.now() - t0),
  });
  animator.setSpeed(60);

  function setRunning(on) {
    runBtn.disabled = on;
    stopBtn.disabled = !on;
    mazeBtn.disabled = on;
    resetBtn.disabled = on;
    clearPathBtn.disabled = on;
    algoSelect.disabled = on;
    sizeSelect.disabled = on;
  }

  function run() {
    clearOverlay();
    setRunning(true);
    status.textContent = 'Running...';
    status.className = 'status';
    t0 = performance.now();
    animator.play(PATHFINDERS[algo].run(grid, start, end));
  }

  function stopRun() {
    animator.stop();
    setRunning(false);
    status.textContent = 'Stopped';
    status.className = 'status';
  }

  /** Re-run instantly (used after the user edits an already-solved board). */
  function solveInstant() {
    renderer.clearOverlay();
    const t = performance.now();
    const result = Animator.runToEnd(PATHFINDERS[algo].run(grid, start, end), (step) => {
      if (!isEndpoint(step.r, step.c)) renderer.mark(step.r, step.c, step.type === 'visit' ? 'visited' : 'frontier');
    });
    finish(result, performance.now() - t);
  }

  function finish(result, elapsed) {
    setRunning(false);
    dirty = true;
    const { path, visitedCount } = result;
    for (const p of path) if (!isEndpoint(p.r, p.c)) renderer.mark(p.r, p.c, 'path');
    renderer.draw(grid, start, end);
    visitedStat.set(visitedCount);
    pathStat.set(path.length ? path.length - 1 : '-');
    const cost = path.length
      ? path.slice(1).reduce((sum, p) => sum + (grid.weights.get(key(p.r, p.c)) ?? 1), 0)
      : null;
    costStat.set(cost ?? '-');
    timeStat.set(elapsed.toFixed(1) + ' ms');
    if (path.length) {
      status.textContent = PATHFINDERS[algo].optimal ? 'Path found (optimal)' : 'Path found';
      status.className = 'status ok';
    } else {
      status.textContent = 'No path';
      status.className = 'status fail';
    }
  }

  function clearOverlay() {
    animator.stop();
    setRunning(false);
    dirty = false;
    renderer.clearOverlay();
    visitedStat.set(0);
    pathStat.set(0);
    costStat.set(0);
    timeStat.set('0 ms');
    status.textContent = '';
    status.className = 'status';
    renderer.draw(grid, start, end);
  }

  function resetBoard() {
    animator.stop();
    grid = createGrid(SIZES[size].rows, SIZES[size].cols);
    start = { r: 2, c: 2 };
    end = { r: grid.rows - 3, c: grid.cols - 3 };
    fit();
    clearOverlay();
  }

  function generateMaze() {
    clearOverlay();
    const walls = MAZES[mazeType].run(grid, start, end);
    // Animate the maze being drawn: hide the walls, then re-add them one by one.
    const all = new Set(grid.walls);
    grid.walls = new Set();
    function* drawWalls() {
      for (const w of walls) {
        grid.walls.add(key(w.r, w.c));
        yield { type: 'maze', r: w.r, c: w.c };
      }
    }
    setRunning(true);
    const mazeAnimator = new Animator({
      onStep: () => renderer.draw(grid, start, end),
      onDone: () => {
        grid.walls = all;
        setRunning(false);
        stopBtn.onclick = stopRun;
        renderer.draw(grid, start, end);
      },
    });
    mazeAnimator.setSpeed(95);
    mazeAnimator.play(drawWalls());
    stopBtn.onclick = () => {
      mazeAnimator.stop();
      grid.walls = all;
      setRunning(false);
      stopBtn.onclick = stopRun;
      renderer.draw(grid, start, end);
    };
  }

  function setTool(t) {
    tool = t;
    for (const [k, b] of Object.entries(toolBtns)) b.classList.toggle('active-mode', k === t);
  }

  function isEndpoint(r, c) {
    return (r === start.r && c === start.c) || (r === end.r && c === end.c);
  }

  function paint(r, c) {
    if (isEndpoint(r, c)) return;
    if (tool === 'wall') setWall(grid, r, c, true);
    else if (tool === 'weight') setWeight(grid, r, c, DEFAULT_WEIGHT);
    else clearCell(grid, r, c);
  }

  // ---- pointer interaction ----
  canvas.addEventListener('pointerdown', (e) => {
    if (runBtn.disabled) return; // busy (solving or drawing a maze)
    const { r, c } = renderer.cellAt(e);
    if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return;
    canvas.setPointerCapture(e.pointerId);
    if (r === start.r && c === start.c) drag = { kind: 'start' };
    else if (r === end.r && c === end.c) drag = { kind: 'end' };
    else {
      drag = { kind: 'paint' };
      paint(r, c);
      lastPainted = key(r, c);
    }
    afterEdit();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { r, c } = renderer.cellAt(e);
    if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return;
    if (drag.kind === 'paint') {
      const k = key(r, c);
      if (k === lastPainted) return;
      lastPainted = k;
      paint(r, c);
    } else if (!isWall(grid, r, c) && !isEndpoint(r, c)) {
      if (drag.kind === 'start') start = { r, c };
      else end = { r, c };
    }
    afterEdit();
  });

  const endDrag = () => {
    drag = null;
    lastPainted = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function afterEdit() {
    if (dirty) solveInstant();
    else renderer.draw(grid, start, end);
  }

  // ---- layout ----
  function fit() {
    const maxW = Math.max(200, stage.clientWidth - 32);
    const maxH = Math.max(200, window.innerHeight - stage.getBoundingClientRect().top - 64);
    renderer.resize(grid, maxW, maxH);
    renderer.draw(grid, start, end);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('tabchange', (e) => {
    if (e.detail === 'pathfinding') requestAnimationFrame(fit);
  });
  requestAnimationFrame(fit);
}
