import { key, setWall } from './grid.js';
import { createRng, randInt } from './random.js';

/**
 * Maze generators. Each returns an array of wall cells {r, c} in the order they
 * should be drawn (so the UI can animate them) and mutates the given grid.
 * Start/end cells are never walled.
 */

function protectedSet(grid, start, end) {
  // Protect the endpoints and their in-bounds neighbours so that they can never be sealed in.
  const set = new Set();
  for (const p of [start, end]) {
    set.add(key(p.r, p.c));
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = p.r + dr;
      const c = p.c + dc;
      if (r >= 0 && c >= 0 && r < grid.rows && c < grid.cols) set.add(key(r, c));
    }
  }
  return set;
}

/** Random scatter: each cell becomes a wall with probability `density`. */
export function randomMaze(grid, start, end, { density = 0.28, seed } = {}) {
  const rng = createRng(seed);
  const keep = protectedSet(grid, start, end);
  const walls = [];
  grid.walls.clear();
  grid.weights.clear();
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (keep.has(key(r, c))) continue;
      if (rng() < density) {
        setWall(grid, r, c, true);
        walls.push({ r, c });
      }
    }
  }
  return walls;
}

/**
 * Recursive division. Builds an outer border then recursively splits chambers
 * with a wall containing one gap. Walls are placed on odd indices and gaps on
 * even indices so that the result is a perfect maze where every open cell is
 * reachable from every other open cell.
 */
export function recursiveDivision(grid, start, end, { seed } = {}) {
  const rng = createRng(seed);
  const keep = protectedSet(grid, start, end);
  const walls = [];
  grid.walls.clear();
  grid.weights.clear();

  const add = (r, c) => {
    if (keep.has(key(r, c)) || grid.walls.has(key(r, c))) return;
    setWall(grid, r, c, true);
    walls.push({ r, c });
  };

  // border
  for (let c = 0; c < grid.cols; c++) {
    add(0, c);
    add(grid.rows - 1, c);
  }
  for (let r = 0; r < grid.rows; r++) {
    add(r, 0);
    add(r, grid.cols - 1);
  }

  const oddBetween = (lo, hi) => {
    // random odd number in [lo, hi]; callers guarantee one exists
    const first = lo % 2 === 0 ? lo + 1 : lo;
    const last = hi % 2 === 0 ? hi - 1 : hi;
    const count = (last - first) / 2 + 1;
    return first + 2 * randInt(rng, 0, count - 1);
  };
  const evenBetween = (lo, hi) => {
    const first = lo % 2 === 0 ? lo : lo + 1;
    const last = hi % 2 === 0 ? hi : hi - 1;
    const count = (last - first) / 2 + 1;
    return first + 2 * randInt(rng, 0, count - 1);
  };

  function divide(top, bottom, left, right) {
    const height = bottom - top;
    const width = right - left;
    if (height < 2 || width < 2) return;
    const horizontal = height > width ? true : width > height ? false : rng() < 0.5;

    if (horizontal) {
      if (bottom - top < 3) return;
      const wr = oddBetween(top + 1, bottom - 1);
      const gap = evenBetween(left, right);
      for (let c = left; c <= right; c++) if (c !== gap) add(wr, c);
      divide(top, wr - 1, left, right);
      divide(wr + 1, bottom, left, right);
    } else {
      if (right - left < 3) return;
      const wc = oddBetween(left + 1, right - 1);
      const gap = evenBetween(top, bottom);
      for (let r = top; r <= bottom; r++) if (r !== gap) add(r, wc);
      divide(top, bottom, left, wc - 1);
      divide(top, bottom, wc + 1, right);
    }
  }

  divide(1, grid.rows - 2, 1, grid.cols - 2);
  return walls;
}

export const MAZES = {
  division: { name: 'Recursive Division', run: recursiveDivision },
  random: { name: 'Random Walls', run: randomMaze },
};
