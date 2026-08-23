import { describe, it, expect } from 'vitest';
import { createGrid, setWall, setWeight, key } from '../src/algorithms/grid.js';
import { PATHFINDERS, bfs, dfs, dijkstra, astar, greedy } from '../src/algorithms/pathfinding/index.js';
import { MinHeap } from '../src/algorithms/heap.js';

function runToEnd(gen) {
  const steps = [];
  for (;;) {
    const { value, done } = gen.next();
    if (done) return { result: value, steps };
    steps.push(value);
  }
}

function pathCost(grid, path) {
  return path.slice(1).reduce((sum, p) => sum + (grid.weights.get(key(p.r, p.c)) ?? 1), 0);
}

function isContiguous(path) {
  for (let i = 1; i < path.length; i++) {
    const d = Math.abs(path[i].r - path[i - 1].r) + Math.abs(path[i].c - path[i - 1].c);
    if (d !== 1) return false;
  }
  return true;
}

/** Grid with a vertical wall that forces a detour through row 0. */
function detourGrid() {
  const grid = createGrid(7, 7);
  for (let r = 1; r < 7; r++) setWall(grid, r, 3, true);
  return grid;
}

const ALL = { bfs, dfs, dijkstra, astar, greedy };
const OPTIMAL_UNWEIGHTED = { bfs, dijkstra, astar };
const WEIGHTED_OPTIMAL = { dijkstra, astar };

describe('pathfinding: open grid', () => {
  for (const [name, algo] of Object.entries(ALL)) {
    it(`${name} finds a contiguous path from start to end`, () => {
      const grid = createGrid(10, 10);
      const start = { r: 0, c: 0 };
      const end = { r: 9, c: 9 };
      const { result } = runToEnd(algo(grid, start, end));
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[0]).toEqual(start);
      expect(result.path.at(-1)).toEqual(end);
      expect(isContiguous(result.path)).toBe(true);
      expect(result.visitedCount).toBeGreaterThan(0);
    });
  }

  for (const [name, algo] of Object.entries(OPTIMAL_UNWEIGHTED)) {
    it(`${name} returns the shortest path (Manhattan distance) on an open grid`, () => {
      const grid = createGrid(10, 10);
      const { result } = runToEnd(algo(grid, { r: 0, c: 0 }, { r: 9, c: 9 }));
      expect(result.path.length - 1).toBe(18);
    });
  }

  it('start === end yields a single-cell path', () => {
    const grid = createGrid(5, 5);
    for (const algo of Object.values(ALL)) {
      const { result } = runToEnd(algo(grid, { r: 2, c: 2 }, { r: 2, c: 2 }));
      expect(result.path).toEqual([{ r: 2, c: 2 }]);
    }
  });
});

describe('pathfinding: obstacles', () => {
  for (const [name, algo] of Object.entries(OPTIMAL_UNWEIGHTED)) {
    it(`${name} routes around a wall with the optimal detour`, () => {
      const grid = detourGrid();
      const { result } = runToEnd(algo(grid, { r: 6, c: 0 }, { r: 6, c: 6 }));
      // up 6, across 6, down 6
      expect(result.path.length - 1).toBe(18);
      expect(result.path.every((p) => !grid.walls.has(key(p.r, p.c)))).toBe(true);
    });
  }

  for (const [name, algo] of Object.entries(ALL)) {
    it(`${name} returns an empty path when the end is enclosed`, () => {
      const grid = createGrid(8, 8);
      const end = { r: 4, c: 4 };
      setWall(grid, 3, 4, true);
      setWall(grid, 5, 4, true);
      setWall(grid, 4, 3, true);
      setWall(grid, 4, 5, true);
      const { result } = runToEnd(algo(grid, { r: 0, c: 0 }, end));
      expect(result.path).toEqual([]);
      expect(result.visitedCount).toBeGreaterThan(0);
    });
  }

  it('dfs never passes through walls and the path is contiguous', () => {
    const grid = detourGrid();
    const { result } = runToEnd(dfs(grid, { r: 6, c: 0 }, { r: 6, c: 6 }));
    expect(result.path.length).toBeGreaterThan(0);
    expect(isContiguous(result.path)).toBe(true);
    expect(result.path.every((p) => !grid.walls.has(key(p.r, p.c)))).toBe(true);
  });
});

describe('pathfinding: weights', () => {
  function weightedGrid() {
    // A 3x5 grid; the straight middle row is expensive, so the cheap route goes around.
    const grid = createGrid(3, 5);
    for (let c = 1; c < 4; c++) setWeight(grid, 1, c, 10);
    return grid;
  }

  for (const [name, algo] of Object.entries(WEIGHTED_OPTIMAL)) {
    it(`${name} chooses the cheapest path, not the shortest`, () => {
      const grid = weightedGrid();
      const { result } = runToEnd(algo(grid, { r: 1, c: 0 }, { r: 1, c: 4 }));
      // straight: 3*10 + 1 = 31; detour: 1 + 3 + 1 + 1 = 6
      expect(pathCost(grid, result.path)).toBe(6);
      expect(result.path.length - 1).toBe(6);
    });
  }

  it('bfs ignores weights and takes the geometrically shortest path', () => {
    const grid = weightedGrid();
    const { result } = runToEnd(bfs(grid, { r: 1, c: 0 }, { r: 1, c: 4 }));
    expect(result.path.length - 1).toBe(4);
  });

  it('dijkstra and A* agree on cost for a random weighted grid', () => {
    const grid = createGrid(12, 12);
    let seed = 7;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let r = 0; r < 12; r++)
      for (let c = 0; c < 12; c++) {
        const x = rng();
        if (x < 0.2) setWall(grid, r, c, true);
        else if (x < 0.45) setWeight(grid, r, c, 5);
      }
    grid.walls.delete(key(0, 0));
    grid.walls.delete(key(11, 11));
    const d = runToEnd(dijkstra(grid, { r: 0, c: 0 }, { r: 11, c: 11 })).result;
    const a = runToEnd(astar(grid, { r: 0, c: 0 }, { r: 11, c: 11 })).result;
    expect(pathCost(grid, a.path)).toBe(pathCost(grid, d.path));
    expect(a.visitedCount).toBeLessThanOrEqual(d.visitedCount);
  });
});

describe('pathfinding: step semantics', () => {
  it('every step is a visit or frontier event with in-bounds coordinates', () => {
    const grid = createGrid(6, 6);
    for (const algo of Object.values(ALL)) {
      const { steps } = runToEnd(algo(grid, { r: 0, c: 0 }, { r: 5, c: 5 }));
      expect(steps.length).toBeGreaterThan(0);
      for (const s of steps) {
        expect(['visit', 'frontier']).toContain(s.type);
        expect(s.r).toBeGreaterThanOrEqual(0);
        expect(s.c).toBeGreaterThanOrEqual(0);
        expect(s.r).toBeLessThan(6);
        expect(s.c).toBeLessThan(6);
      }
    }
  });

  it('visitedCount matches the number of visit steps', () => {
    const grid = detourGrid();
    for (const algo of Object.values(ALL)) {
      const { steps, result } = runToEnd(algo(grid, { r: 6, c: 0 }, { r: 6, c: 6 }));
      expect(steps.filter((s) => s.type === 'visit').length).toBe(result.visitedCount);
    }
  });

  it('greedy explores no more cells than BFS on an open grid', () => {
    const grid = createGrid(20, 20);
    const g = runToEnd(greedy(grid, { r: 0, c: 0 }, { r: 19, c: 19 })).result;
    const b = runToEnd(bfs(grid, { r: 0, c: 0 }, { r: 19, c: 19 })).result;
    expect(g.visitedCount).toBeLessThan(b.visitedCount);
  });

  it('registry exposes all five algorithms with metadata', () => {
    expect(Object.keys(PATHFINDERS).sort()).toEqual(['astar', 'bfs', 'dfs', 'dijkstra', 'greedy']);
    for (const entry of Object.values(PATHFINDERS)) {
      expect(typeof entry.run).toBe('function');
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.weighted).toBe('boolean');
    }
  });
});

describe('MinHeap', () => {
  it('pops items in priority order and breaks ties by insertion order', () => {
    const h = new MinHeap();
    const items = [5, 1, 4, 1, 3, 9, 2];
    items.forEach((p, i) => h.push(p, `${p}-${i}`));
    const out = [];
    while (h.size) out.push(h.pop());
    expect(out).toEqual(['1-1', '1-3', '2-6', '3-4', '4-2', '5-0', '9-5']);
  });

  it('returns undefined when empty', () => {
    expect(new MinHeap().pop()).toBeUndefined();
  });
});
