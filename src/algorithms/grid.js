/**
 * Pure grid model used by all pathfinding algorithms.
 * A grid is a plain object { rows, cols, walls: Set<key>, weights: Map<key, number> }.
 * Cells are addressed as "r,c" string keys so that they can live in Sets/Maps.
 */

export const DEFAULT_WEIGHT = 5;

export const key = (r, c) => `${r},${c}`;

export function parseKey(k) {
  const [r, c] = k.split(',').map(Number);
  return { r, c };
}

export function createGrid(rows, cols) {
  return { rows, cols, walls: new Set(), weights: new Map() };
}

export function cloneGrid(grid) {
  return {
    rows: grid.rows,
    cols: grid.cols,
    walls: new Set(grid.walls),
    weights: new Map(grid.weights),
  };
}

export function inBounds(grid, r, c) {
  return r >= 0 && c >= 0 && r < grid.rows && c < grid.cols;
}

export function isWall(grid, r, c) {
  return grid.walls.has(key(r, c));
}

/** Movement cost to enter cell (r, c). Defaults to 1. */
export function costOf(grid, r, c) {
  return grid.weights.get(key(r, c)) ?? 1;
}

export function setWall(grid, r, c, on = true) {
  const k = key(r, c);
  if (on) {
    grid.walls.add(k);
    grid.weights.delete(k);
  } else {
    grid.walls.delete(k);
  }
}

export function setWeight(grid, r, c, weight = DEFAULT_WEIGHT) {
  const k = key(r, c);
  if (weight > 1) {
    grid.weights.set(k, weight);
    grid.walls.delete(k);
  } else {
    grid.weights.delete(k);
  }
}

export function clearCell(grid, r, c) {
  const k = key(r, c);
  grid.walls.delete(k);
  grid.weights.delete(k);
}

const DIRS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** 4-connected, non-wall neighbours in a stable (N, E, S, W) order. */
export function neighbors(grid, r, c) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(grid, nr, nc) && !isWall(grid, nr, nc)) out.push({ r: nr, c: nc });
  }
  return out;
}

/** Walk a cameFrom map back from `end` to `start`, returning an array of {r, c}. */
export function reconstructPath(cameFrom, start, end) {
  const path = [];
  let cur = key(end.r, end.c);
  const startKey = key(start.r, start.c);
  if (cur !== startKey && !cameFrom.has(cur)) return [];
  while (cur !== undefined) {
    path.push(parseKey(cur));
    if (cur === startKey) break;
    cur = cameFrom.get(cur);
  }
  return path.reverse();
}
