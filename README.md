# Algo Visualizer

[![Deploy to GitHub Pages](https://github.com/gunjit-web/algo-visualizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/gunjit-web/algo-visualizer/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS%20ES%20modules-f7df1e?logo=javascript&logoColor=000)
![Vite](https://img.shields.io/badge/built%20with-Vite-646cff?logo=vite&logoColor=fff)
![Tests](https://img.shields.io/badge/tests-120%20passing-22c55e)

An interactive **pathfinding and sorting algorithm visualizer** written in vanilla JavaScript (ES modules) with no framework. Every algorithm is a pure generator that yields fine-grained steps, so the rendering layer can animate it at any speed while the algorithm code stays completely decoupled from the UI and fully unit-tested.

**Live demo:** https://gunjit-web.github.io/algo-visualizer/

📄 See [PROJECT.md](PROJECT.md) for the problem statement, design and implementation walkthrough.

## Features

### Pathfinding
- Resizable grid (15x25, 21x41, 31x61) rendered on a `<canvas>`
- Click / drag to draw walls, weighted cells (cost 5) or erase
- Drag the start and end markers; the board re-solves instantly if it has already been visualised
- Algorithms: **BFS**, **DFS**, **Dijkstra**, **A\*** (Manhattan heuristic), **Greedy Best-First**
- Maze generation: **Recursive Division** (perfect maze) and **Random Walls**, animated as they are drawn
- Animated visited / frontier / path states with an adjustable speed slider
- Stats panel: visited cells, path length, path cost, elapsed time, optimality indicator

### Sorting
- Bar-array view with 5 to 300 elements
- Algorithms: **Bubble**, **Insertion**, **Selection**, **Merge**, **Quick**, **Heap**
- Generator-based, step-by-step animation: each algorithm yields `compare`, `swap`, `overwrite` and `sorted` steps that the engine replays against its own copy of the array
- Size and speed sliders, live comparison / swap / write counters and timing

## Algorithm complexity

### Pathfinding (V = cells, E = edges, 4-connected grid so E ~ 4V)

| Algorithm | Time | Space | Weighted | Optimal |
|-----------|------|-------|----------|---------|
| Breadth-First Search | O(V + E) | O(V) | No | Yes (unweighted) |
| Depth-First Search | O(V + E) | O(V) | No | No |
| Dijkstra | O((V + E) log V) | O(V) | Yes | Yes |
| A\* (Manhattan) | O((V + E) log V) worst, usually far less | O(V) | Yes | Yes (admissible heuristic) |
| Greedy Best-First | O((V + E) log V) | O(V) | Yes | No |

### Sorting

| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|--------|
| Bubble Sort | O(n) | O(n^2) | O(n^2) | O(1) | Yes |
| Insertion Sort | O(n) | O(n^2) | O(n^2) | O(1) | Yes |
| Selection Sort | O(n^2) | O(n^2) | O(n^2) | O(1) | No |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick Sort | O(n log n) | O(n log n) | O(n^2) | O(log n) | No |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |

## Controls and usage

**Pathfinding tab**

| Action | How |
|--------|-----|
| Draw walls | Select *Wall*, then click or drag on the grid |
| Add weighted cells | Select *Weight (5)*, then click or drag |
| Erase | Select *Erase*, then click or drag |
| Move start / end | Drag the green (start) or red (end) marker |
| Run | Pick an algorithm and press **Visualize**; **Stop** cancels |
| Maze | Pick a maze type and press **Generate Maze** |
| Clear Path | Removes the visited / path overlay but keeps walls |
| Reset Board | Clears everything and restores the default start / end |

After a run has finished, editing the board or switching algorithm re-solves instantly so you can compare algorithms on the same layout.

**Sorting tab**

| Action | How |
|--------|-----|
| New array | Press **New Array** or move the *Size* slider |
| Run | Pick an algorithm and press **Sort**; **Stop** cancels |
| Speed | Adjust the *Speed* slider at any time, even mid-run |

## Getting started

Requires Node 18+ (developed on Node 24).

```bash
git clone https://github.com/gunjit-web/algo-visualizer.git
cd algo-visualizer
npm install
npm run dev        # start the Vite dev server
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Project structure

```
algo-visualizer/
├── index.html                  # app shell (header, tabs, panels)
├── vite.config.js              # base '/algo-visualizer/' for GitHub Pages, Vitest config
├── src/
│   ├── main.js                 # mounts the two views
│   ├── styles.css
│   ├── algorithms/             # pure, UI-free, unit-tested
│   │   ├── grid.js             # grid model: walls, weights, neighbours, path reconstruction
│   │   ├── heap.js             # binary min-heap used by Dijkstra / A* / Greedy
│   │   ├── random.js           # seedable PRNG (Mulberry32)
│   │   ├── maze.js             # recursive division + random maze generators
│   │   ├── pathfinding/
│   │   │   ├── bfs.js
│   │   │   ├── dfs.js
│   │   │   ├── bestFirst.js    # Dijkstra, A*, Greedy share one priority-queue search
│   │   │   ├── heuristics.js
│   │   │   └── index.js        # PATHFINDERS registry
│   │   └── sorting/
│   │       └── index.js        # six sort generators + applyStep + SORTERS registry
│   └── ui/
│       ├── animator.js         # rAF-driven generator player with speed control
│       ├── dom.js              # tiny element / slider / select helpers
│       ├── tabs.js
│       ├── gridRenderer.js     # canvas renderer for the grid
│       ├── pathfindingView.js  # pathfinding controls, interaction, stats
│       └── sortingView.js      # sorting controls, bar renderer, stats
├── tests/
│   ├── pathfinding.test.js
│   ├── sorting.test.js
│   └── maze.test.js
└── .github/workflows/deploy.yml
```

### Step protocol

Pathfinders yield `{ type: 'visit' | 'frontier', r, c }` and return `{ path, visitedCount }`.

Sorters copy their input and yield:

```js
{ type: 'compare',   i, j }        // indices compared
{ type: 'swap',      i, j }        // a[i] <-> a[j]
{ type: 'overwrite', i, value }    // a[i] = value
{ type: 'sorted',    i }           // index i is final
```

`applyStep(arr, step)` replays a step so any consumer can keep an independent copy in sync; the test-suite uses this to prove that the emitted steps reproduce the sorted result exactly.

## Running tests

```bash
npm test -- --run     # run once
npm test              # watch mode
```

The suite (120 tests) covers:

- every pathfinder finds a contiguous path, returns an empty path when the end is enclosed, and BFS / Dijkstra / A\* return provably shortest paths around obstacles
- Dijkstra and A\* pick the cheapest (not the shortest) route through weighted cells, and agree on cost for random weighted grids
- every sorter produces sorted output for random, sorted, reversed, duplicate, single-element, empty and 500-element inputs without mutating its input
- step semantics: replaying steps via `applyStep` reproduces the result; swap-based sorts never overwrite; merge never swaps; every index is marked sorted
- recursive-division mazes keep start and end reachable on all grid sizes (including border endpoints) and are perfect mazes (every open cell reachable)
- heap ordering and tie-breaking, seeded RNG determinism

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which installs dependencies, runs the tests, builds with Vite and deploys `dist/` to GitHub Pages.

## License

[MIT](LICENSE) - Copyright (c) 2026 Gunjit
