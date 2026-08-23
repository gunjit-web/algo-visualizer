import { key, neighbors, costOf, reconstructPath } from '../grid.js';
import { MinHeap } from '../heap.js';
import { manhattan } from './heuristics.js';

/**
 * Generic best-first search parameterised by g/h weights:
 *   priority = gWeight * g(n) + hWeight * h(n)
 * Dijkstra = (1, 0), A* = (1, 1), Greedy best-first = (0, 1).
 */
function* bestFirst(grid, start, end, { gWeight, hWeight, heuristic = manhattan }) {
  const startKey = key(start.r, start.c);
  const endKey = key(end.r, end.c);
  const gScore = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const closed = new Set();
  const open = new MinHeap();
  open.push(hWeight * heuristic(start, end), start);
  let visitedCount = 0;

  while (open.size) {
    const cur = open.pop();
    const curKey = key(cur.r, cur.c);
    if (closed.has(curKey)) continue;
    closed.add(curKey);
    visitedCount++;
    yield { type: 'visit', r: cur.r, c: cur.c };
    if (curKey === endKey) {
      return { path: reconstructPath(cameFrom, start, end), visitedCount, cost: gScore.get(endKey) };
    }
    const g = gScore.get(curKey);
    for (const n of neighbors(grid, cur.r, cur.c)) {
      const nk = key(n.r, n.c);
      if (closed.has(nk)) continue;
      const tentative = g + costOf(grid, n.r, n.c);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentative);
        cameFrom.set(nk, curKey);
        open.push(gWeight * tentative + hWeight * heuristic(n, end), n);
        yield { type: 'frontier', r: n.r, c: n.c };
      }
    }
  }
  return { path: [], visitedCount, cost: Infinity };
}

/** Dijkstra's algorithm: optimal on weighted grids. */
export function dijkstra(grid, start, end) {
  return bestFirst(grid, start, end, { gWeight: 1, hWeight: 0 });
}

/** A* with Manhattan heuristic: optimal (heuristic is admissible for 4-connected grids). */
export function astar(grid, start, end) {
  return bestFirst(grid, start, end, { gWeight: 1, hWeight: 1 });
}

/** Greedy best-first: fast but not optimal. */
export function greedy(grid, start, end) {
  return bestFirst(grid, start, end, { gWeight: 0, hWeight: 1 });
}
