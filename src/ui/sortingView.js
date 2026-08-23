import { SORTERS, randomArray, applyStep } from '../algorithms/sorting/index.js';
import { Animator } from './animator.js';
import { el, select, slider, stat } from './dom.js';

const BAR_COLORS = {
  base: '#6366f1',
  compare: '#38bdf8',
  swap: '#ef4444',
  overwrite: '#f59e0b',
  sorted: '#22c55e',
};

export function mountSorting(root) {
  // ---- state ----
  let algo = 'quick';
  let size = 60;
  let values = randomArray(size);
  let highlights = new Map(); // index -> color key
  const sorted = new Set();
  let comparisons = 0;
  let swaps = 0;
  let writes = 0;
  let t0 = 0;

  // ---- DOM ----
  const canvas = el('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const compStat = stat('Comparisons');
  const swapStat = stat('Swaps');
  const writeStat = stat('Writes');
  const timeStat = stat('Time');
  const status = el('span.status');

  const runBtn = el('button.btn.primary', { onclick: run, textContent: 'Sort' });
  const stopBtn = el('button.btn', { onclick: stop, textContent: 'Stop', disabled: true });
  const shuffleBtn = el('button.btn', { onclick: shuffle, textContent: 'New Array' });

  const algoSelect = select(
    Object.fromEntries(Object.entries(SORTERS).map(([k, v]) => [k, v.name + '  ' + v.complexity])),
    algo,
    (v) => {
      algo = v;
    },
  );
  const sizeSlider = slider('Size', { min: 5, max: 300, value: size }, (v) => {
    size = v;
    shuffle();
  });
  const speedSlider = slider('Speed', { min: 1, max: 100, value: 70 }, (v) => animator.setSpeed(v));

  const controls = el(
    'div.controls',
    {},
    el('div.control', {}, el('label', { textContent: 'Algorithm' }), algoSelect),
    sizeSlider,
    speedSlider,
    el('div.spacer'),
    shuffleBtn,
    stopBtn,
    runBtn,
  );

  const legend = el(
    'div.legend',
    {},
    ...[
      ['Unsorted', BAR_COLORS.base],
      ['Comparing', BAR_COLORS.compare],
      ['Swapping', BAR_COLORS.swap],
      ['Writing', BAR_COLORS.overwrite],
      ['Sorted', BAR_COLORS.sorted],
    ].map(([label, color]) =>
      el('span.legend-item', {}, el('span.swatch', { style: 'background:' + color }), label),
    ),
  );

  const stats = el('div.stats', {}, compStat, swapStat, writeStat, timeStat, status);
  const stage = el('div.stage', {}, canvas);
  const hint = el('div.hint', {
    textContent:
      'Each algorithm is a generator that yields compare / swap / overwrite steps; the engine replays them against the bar array.',
  });

  root.append(controls, el('div.stats', {}, legend), stats, stage, hint);

  // ---- animation ----
  const animator = new Animator({
    onStep: (step) => {
      highlights = new Map();
      if (step.type === 'compare') {
        comparisons++;
        highlights.set(step.i, 'compare');
        highlights.set(step.j, 'compare');
      } else if (step.type === 'swap') {
        swaps++;
        applyStep(values, step);
        highlights.set(step.i, 'swap');
        highlights.set(step.j, 'swap');
      } else if (step.type === 'overwrite') {
        writes++;
        applyStep(values, step);
        highlights.set(step.i, 'overwrite');
      } else if (step.type === 'sorted') {
        sorted.add(step.i);
      }
      updateStats();
      draw();
    },
    onDone: () => {
      highlights = new Map();
      for (let i = 0; i < values.length; i++) sorted.add(i);
      timeStat.set((performance.now() - t0).toFixed(0) + ' ms');
      status.textContent = 'Sorted';
      status.className = 'status ok';
      setRunning(false);
      draw();
    },
  });
  animator.setSpeed(70);

  function setRunning(on) {
    runBtn.disabled = on;
    stopBtn.disabled = !on;
    shuffleBtn.disabled = on;
    algoSelect.disabled = on;
    sizeSlider.querySelector('input').disabled = on;
  }

  function resetStats() {
    comparisons = 0;
    swaps = 0;
    writes = 0;
    updateStats();
    timeStat.set('0 ms');
    status.textContent = '';
    status.className = 'status';
  }

  function updateStats() {
    compStat.set(comparisons);
    swapStat.set(swaps);
    writeStat.set(writes);
  }

  function run() {
    if (sorted.size === values.length) shuffle();
    sorted.clear();
    highlights = new Map();
    resetStats();
    setRunning(true);
    status.textContent = 'Sorting...';
    t0 = performance.now();
    animator.play(SORTERS[algo].run(values));
  }

  function stop() {
    animator.stop();
    setRunning(false);
    status.textContent = 'Stopped';
    status.className = 'status';
    highlights = new Map();
    draw();
  }

  function shuffle() {
    animator.stop();
    setRunning(false);
    values = randomArray(size);
    sorted.clear();
    highlights = new Map();
    resetStats();
    draw();
  }

  // ---- rendering ----
  function draw() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    const n = values.length;
    const gap = n > 120 ? 0 : n > 60 ? 1 : 2;
    const barW = (w - gap * (n - 1)) / n;
    const max = Math.max(...values, 1);
    for (let i = 0; i < n; i++) {
      const barH = (values[i] / max) * (h - 12);
      const x = i * (barW + gap);
      const state = highlights.get(i) ?? (sorted.has(i) ? 'sorted' : 'base');
      ctx.fillStyle = BAR_COLORS[state];
      ctx.fillRect(x, h - barH, Math.max(1, barW), barH);
    }
  }

  function fit() {
    const w = Math.max(240, stage.clientWidth - 32);
    const h = Math.max(200, Math.min(520, window.innerHeight - stage.getBoundingClientRect().top - 64));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('tabchange', (e) => {
    if (e.detail === 'sorting') requestAnimationFrame(fit);
  });
  requestAnimationFrame(fit);
}
