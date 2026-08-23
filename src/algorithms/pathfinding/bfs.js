import { key, neighbors, reconstructPath } from '../grid.js';

/**
 * Breadth-first search. Yields { type: 'frontier' | 'visit', r, c } steps and
 * returns { path, visitedCount }. Finds the shortest path on unweighted grids.
 */
export function* bfs(grid, start, end) {
  const startKey = key(start.r, start.c);
  const endKey = key(end.r, end.c);
  const cameFrom = new Map();
  const seen = new Set([startKey]);
  const queue = [start];
  let head = 0;
  let visitedCount = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    const curKey = key(cur.r, cur.c);
    visitedCount++;
    yield { type: 'visit', r: cur.r, c: cur.c };
    if (curKey === endKey) {
      return { path: reconstructPath(cameFrom, start, end), visitedCount };
    }
    for (const n of neighbors(grid, cur.r, cur.c)) {
      const nk = key(n.r, n.c);
      if (seen.has(nk)) continue;
      seen.add(nk);
      cameFrom.set(nk, curKey);
      queue.push(n);
      yield { type: 'frontier', r: n.r, c: n.c };
    }
  }
  return { path: [], visitedCount };
}
