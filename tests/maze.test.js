import { describe, it, expect } from 'vitest';
import { createGrid, key } from '../src/algorithms/grid.js';
import { recursiveDivision, randomMaze, MAZES } from '../src/algorithms/maze.js';
import { bfs } from '../src/algorithms/pathfinding/index.js';
import { createRng } from '../src/algorithms/random.js';

function solve(grid, start, end) {
  const gen = bfs(grid, start, end);
  for (;;) {
    const { value, done } = gen.next();
    if (done) return value;
  }
}

describe('recursive division maze', () => {
  const sizes = [
    [15, 25],
    [21, 41],
    [20, 40],
    [31, 61],
  ];

  for (const [rows, cols] of sizes) {
    for (const seed of [1, 2, 3]) {
      it(`keeps start and end reachable on ${rows}x${cols} (seed ${seed})`, () => {
        const grid = createGrid(rows, cols);
        const start = { r: 2, c: 2 };
        const end = { r: rows - 3, c: cols - 3 };
        recursiveDivision(grid, start, end, { seed });
        expect(grid.walls.has(key(start.r, start.c))).toBe(false);
        expect(grid.walls.has(key(end.r, end.c))).toBe(false);
        const { path } = solve(grid, start, end);
        expect(path.length).toBeGreaterThan(0);
      });
    }
  }

  it('keeps endpoints reachable even when they sit on the border', () => {
    const grid = createGrid(21, 41);
    const start = { r: 0, c: 0 };
    const end = { r: 20, c: 40 };
    recursiveDivision(grid, start, end, { seed: 99 });
    const { path } = solve(grid, start, end);
    expect(path.length).toBeGreaterThan(0);
  });

  it('every open cell is reachable from the start (perfect maze)', () => {
    const grid = createGrid(21, 41);
    const start = { r: 2, c: 2 };
    const end = { r: 18, c: 38 };
    recursiveDivision(grid, start, end, { seed: 5 });
    // flood fill from start
    const seen = new Set([key(start.r, start.c)]);
    const q = [start];
    while (q.length) {
      const { r, c } = q.shift();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        const k = key(nr, nc);
        if (nr < 0 || nc < 0 || nr >= grid.rows || nc >= grid.cols) continue;
        if (grid.walls.has(k) || seen.has(k)) continue;
        seen.add(k);
        q.push({ r: nr, c: nc });
      }
    }
    const openCells = grid.rows * grid.cols - grid.walls.size;
    expect(seen.size).toBe(openCells);
  });

  it('is deterministic for a given seed and returns the wall list in draw order', () => {
    const a = createGrid(15, 25);
    const b = createGrid(15, 25);
    const wallsA = recursiveDivision(a, { r: 2, c: 2 }, { r: 12, c: 22 }, { seed: 42 });
    const wallsB = recursiveDivision(b, { r: 2, c: 2 }, { r: 12, c: 22 }, { seed: 42 });
    expect(wallsA).toEqual(wallsB);
    expect(wallsA.length).toBe(a.walls.size);
    expect([...a.walls]).toEqual([...b.walls]);
  });

  it('clears existing walls and weights before generating', () => {
    const grid = createGrid(15, 25);
    grid.weights.set(key(5, 5), 5);
    grid.walls.add(key(2, 2));
    recursiveDivision(grid, { r: 2, c: 2 }, { r: 12, c: 22 }, { seed: 1 });
    expect(grid.weights.size).toBe(0);
    expect(grid.walls.has(key(2, 2))).toBe(false);
  });
});

describe('random maze', () => {
  it('never walls the start or end cell', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const grid = createGrid(15, 25);
      randomMaze(grid, { r: 2, c: 2 }, { r: 12, c: 22 }, { seed, density: 0.9 });
      expect(grid.walls.has(key(2, 2))).toBe(false);
      expect(grid.walls.has(key(12, 22))).toBe(false);
    }
  });

  it('respects density approximately', () => {
    const grid = createGrid(50, 50);
    randomMaze(grid, { r: 0, c: 0 }, { r: 49, c: 49 }, { seed: 7, density: 0.3 });
    const ratio = grid.walls.size / (50 * 50);
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.35);
  });

  it('registry exposes both generators', () => {
    expect(Object.keys(MAZES).sort()).toEqual(['division', 'random']);
  });
});

describe('seeded rng', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
