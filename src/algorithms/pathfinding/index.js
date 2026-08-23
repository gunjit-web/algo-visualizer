import { bfs } from './bfs.js';
import { dfs } from './dfs.js';
import { dijkstra, astar, greedy } from './bestFirst.js';

/** Registry consumed by the UI. `weighted` tells the UI whether weights matter. */
export const PATHFINDERS = {
  bfs: { name: 'Breadth-First Search', run: bfs, weighted: false, optimal: true },
  dfs: { name: 'Depth-First Search', run: dfs, weighted: false, optimal: false },
  dijkstra: { name: "Dijkstra's Algorithm", run: dijkstra, weighted: true, optimal: true },
  astar: { name: 'A* (Manhattan)', run: astar, weighted: true, optimal: true },
  greedy: { name: 'Greedy Best-First', run: greedy, weighted: true, optimal: false },
};

export { bfs, dfs, dijkstra, astar, greedy };
