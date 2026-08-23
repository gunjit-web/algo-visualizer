import { bfs } from './bfs.js';
import { dfs } from './dfs.js';

/** Registry consumed by the UI. `weighted` tells the UI whether weights matter. */
export const PATHFINDERS = {
  bfs: { name: 'Breadth-First Search', run: bfs, weighted: false, optimal: true },
  dfs: { name: 'Depth-First Search', run: dfs, weighted: false, optimal: false },
};

export { bfs, dfs };
