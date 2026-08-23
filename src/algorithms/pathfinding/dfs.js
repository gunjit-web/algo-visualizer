import { key, neighbors, reconstructPath } from '../grid.js';

/**
 * Iterative depth-first search. Does NOT guarantee shortest paths, but will
 * find a path whenever one exists.
 */
export function* dfs(grid, start, end) {
  const endKey = key(end.r, end.c);
  const cameFrom = new Map();
  const visited = new Set();
  const stack = [start];
  let visitedCount = 0;

  while (stack.length) {
    const cur = stack.pop();
    const curKey = key(cur.r, cur.c);
    if (visited.has(curKey)) continue;
    visited.add(curKey);
    visitedCount++;
    yield { type: 'visit', r: cur.r, c: cur.c };
    if (curKey === endKey) {
      return { path: reconstructPath(cameFrom, start, end), visitedCount };
    }
    // push in reverse so that the first neighbour (N) is explored first
    const ns = neighbors(grid, cur.r, cur.c);
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      const nk = key(n.r, n.c);
      if (visited.has(nk)) continue;
      cameFrom.set(nk, curKey);
      stack.push(n);
      yield { type: 'frontier', r: n.r, c: n.c };
    }
  }
  return { path: [], visitedCount };
}
