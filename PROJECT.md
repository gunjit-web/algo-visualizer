# Algo Visualizer — Project Overview

**Live demo:** https://gunjit-web.github.io/algo-visualizer/
**Repository:** https://github.com/gunjit-web/algo-visualizer

An interactive pathfinding and sorting visualizer written in vanilla JavaScript ES modules. Every algorithm is a pure generator that yields fine-grained steps; the UI merely replays those steps onto a `<canvas>`. This document explains the problem the project addresses, how the code is structured, how it is tested, and what was learned building it.

---

## 1. Problem Statement

Algorithms are usually taught from text and pseudocode. A learner reads that BFS explores "level by level", that A* "uses a heuristic", or that quicksort is "O(n log n) on average" — but none of that conveys *what actually happens*. It is hard to see, from a textbook, why A* visits a fraction of the cells Dijkstra does on an open grid, why Greedy Best-First sometimes returns a visibly worse path, or why bubble sort's quadratic behaviour feels so much slower than merge sort's at 300 elements.

Existing browser visualizers tend to solve the *display* problem but create a second one: the algorithm code is tangled with DOM manipulation, `setTimeout` chains and colour changes. That means:

- the algorithms cannot be unit-tested (they need a DOM and a timer to run at all);
- adding a new algorithm means also writing new rendering code;
- there is no way to run an algorithm "instantly" for comparison, because the animation *is* the algorithm.

This project separates the two concerns completely.

## 2. Purpose & Goals

The goal was a visualizer where **the algorithm code looks like the textbook version** and is independently verifiable, while the UI can animate it at any speed, stop it mid-run, or execute it instantly.

Success criteria:

| Goal | How it is met |
|------|---------------|
| Algorithms contain zero UI code | `src/algorithms/` imports nothing from `src/ui/`; it never touches `document` or `window` |
| Every algorithm is tested for correctness, not just "runs" | 120 Vitest tests assert optimality, cost, sorted output and step-replay equivalence |
| Same code path for animated and instant runs | `Animator.play()` and `Animator.runToEnd()` consume the *same* generator |
| Adding an algorithm touches one file | Register it in `PATHFINDERS` / `SORTERS`; the views read the registry |
| Deploys itself | GitHub Actions runs tests, builds and publishes to Pages on every push to `main` |
| No framework or runtime dependencies | Only `vite` and `vitest` as dev dependencies |

## 3. Who It's For / Use Cases

- **Students** learning graph search and sorting who want to *watch* the frontier expand or the bars settle, at a speed they control.
- **Interview candidates** who need an intuition for when BFS is enough, when Dijkstra is required (weighted cells), and what an admissible heuristic buys A*. The stats panel (visited cells, path length, path cost, time) makes the trade-offs concrete.
- **Teachers** demonstrating in class: draw a maze, run A*, then switch the dropdown to Greedy — the board re-solves instantly on the same layout so the difference is side-by-side.
- **Developers** prototyping or benchmarking heuristics: `bestFirst()` accepts any `heuristic(a, b)` function and the `visitedCount` returned by each run is a direct measure of work done.

## 4. How It Works

### Architecture

```
  src/algorithms/ (pure, no DOM)              src/ui/ (browser only)
  ┌──────────────────────────────┐            ┌───────────────────────────────────────────┐
  │ grid.js  heap.js  random.js  │            │ animator.js                               │
  │ maze.js                      │   step     │   play(gen)     -- rAF loop --------+     │
  │ pathfinding/                 │ ---------> │   runToEnd(gen) -- synchronous -----+     │
  │   bfs  dfs  bestFirst        │  generator │                                     v     │
  │   heuristics  index.js       │            │ pathfindingView.js -> gridRenderer.js -> <canvas>
  │ sorting/index.js             │            │ sortingView.js     -> bar renderer    -> <canvas>
  └──────────────┬───────────────┘            └───────────────────────────────────────────┘
                 │
     PATHFINDERS / SORTERS registries  { name, run, weighted, optimal }
```

The only thing crossing the boundary is a JavaScript generator object. `src/main.js` mounts the two views; `src/ui/tabs.js` switches between them.

### The step protocol

**Sorting** (`src/algorithms/sorting/index.js`): each of `bubbleSort`, `insertionSort`, `selectionSort`, `mergeSort`, `quickSort`, `heapSort` is a `function*` that copies its input and yields one of:

```js
{ type: 'compare',   i, j }        // indices compared
{ type: 'swap',      i, j }        // a[i] <-> a[j]
{ type: 'overwrite', i, value }    // a[i] = value   (merge, insertion shift)
{ type: 'sorted',    i }           // index i is in its final position
```

The generator's return value is the sorted array. `applyStep(arr, step)` is the single function that knows how to mutate an array from a step; `sortingView.js` calls it on its own `values` array so the bars stay in sync, and `tests/sorting.test.js` calls it to prove the step stream reproduces the sorted result exactly.

**Pathfinding** (`src/algorithms/pathfinding/`): generators yield `{ type: 'visit' | 'frontier', r, c }` and return `{ path, visitedCount, cost }`. `path` is an array of `{ r, c }` from start to end, or `[]` if unreachable.

### One search, three algorithms

`src/algorithms/pathfinding/bestFirst.js` implements a single priority-queue search whose priority is `gWeight * g(n) + hWeight * h(n)`:

```js
dijkstra = bestFirst(grid, start, end, { gWeight: 1, hWeight: 0 })
astar    = bestFirst(grid, start, end, { gWeight: 1, hWeight: 1 })
greedy   = bestFirst(grid, start, end, { gWeight: 0, hWeight: 1 })
```

This is not just a code-size trick: it makes the relationship between the three algorithms explicit. Greedy is A* with the path-cost term deleted, which is exactly why it is fast and non-optimal. BFS and DFS live in their own files (`bfs.js`, `dfs.js`) because they use a queue/stack rather than a heap.

Supporting modules:

- **`grid.js`** — the grid is a plain `{ rows, cols, walls: Set, weights: Map }` keyed by `"r,c"` strings. `neighbors()` returns 4-connected non-wall cells in a fixed N, E, S, W order so traversal is deterministic; `costOf()` defaults to 1; `reconstructPath()` walks a `cameFrom` map.
- **`heap.js`** — `MinHeap` with an insertion-order tiebreak (`#less` compares `priority` then `order`), so equal-priority cells are popped FIFO and runs are reproducible.
- **`heuristics.js`** — `manhattan(a, b)`, admissible on a 4-connected grid with unit-or-greater costs, so A* stays optimal.
- **`random.js`** — `createRng(seed)` is a Mulberry32 PRNG; maze tests pass fixed seeds and get identical mazes every time.
- **`maze.js`** — `recursiveDivision()` builds a border, then recursively splits chambers with a wall on an odd index and a gap on an even index, producing a perfect maze. `randomMaze()` scatters walls at a given density. Both call `protectedSet()` so the start/end cells and their neighbours are never walled, and both return the wall list in draw order so the UI can animate construction.

### Animation and instant re-solve

`src/ui/animator.js` is a small class that drives any generator with `requestAnimationFrame`. `#rate()` maps the speed slider (1–100) to steps-per-frame (1 to 60) and an optional delay, so slow speeds single-step with a pause while fast speeds batch 60 steps per frame. `stop()` cancels the frame and drops the generator. The static `Animator.runToEnd(gen, onStep)` drains the same generator synchronously.

`pathfindingView.js` uses both: `run()` calls `animator.play(PATHFINDERS[algo].run(grid, start, end))`, while `solveInstant()` calls `Animator.runToEnd(...)` with the same arguments. A `dirty` flag is set once a run has finished; `afterEdit()` then re-solves instantly whenever the user paints a wall, drags an endpoint or changes the algorithm dropdown. Both paths end in the same `finish(result, elapsed)`, which paints the path and fills the stats panel.

### Rendering

`src/ui/gridRenderer.js` draws the whole grid with `fillRect` per cell onto a device-pixel-ratio-aware canvas, keeps a separate overlay map of `visited` / `frontier` / `path` marks, and draws start/end as circles. `sortingView.js` draws bars directly and keeps a `highlights` map keyed by index for the compare/swap colours.

### Deployment pipeline

`.github/workflows/deploy.yml` runs on every push to `main`: checkout, Node 24 with npm cache, `npm ci`, `npm test -- --run`, `npm run build`, then `upload-pages-artifact` and `deploy-pages`. A failing test blocks the deploy. `vite.config.js` sets `base: '/algo-visualizer/'` so asset URLs resolve under the Pages sub-path.

### Walkthrough: one A* run end to end

1. The user picks "A* (Manhattan)" and presses **Visualize**. `run()` in `pathfindingView.js` clears the overlay, records `performance.now()`, and calls `PATHFINDERS.astar.run(grid, start, end)`, which returns a generator from `bestFirst()` with `gWeight: 1, hWeight: 1`.
2. `animator.play(gen)` schedules a rAF tick. At speed 50, each tick calls `gen.next()` four times.
3. Inside `bestFirst`, the start cell is pushed with priority `0 + manhattan(start, end)`. Each `pop()` takes the lowest `f`, adds it to `closed`, and yields `{ type: 'visit', r, c }`. For each non-wall neighbour, `tentative = g + costOf(grid, n.r, n.c)`; if cheaper than any known `gScore`, it is recorded in `cameFrom`, pushed with `f = tentative + manhattan(n, end)`, and `{ type: 'frontier', r, c }` is yielded.
4. The view's `onStep` marks each cell `visited` or `frontier` in `gridRenderer` and redraws.
5. When the popped cell is the end, `bestFirst` returns `{ path: reconstructPath(cameFrom, start, end), visitedCount, cost }`. The generator's `done` becomes `true` and `Animator` calls `onDone(result)`.
6. `finish()` paints the path cells, recomputes the cost from the grid's weight map, and writes visited count, path length, cost, elapsed time and "Path found (optimal)" (because `PATHFINDERS.astar.optimal` is true) to the stats panel.
7. The user now drags the end marker. `afterEdit()` sees `dirty === true` and calls `solveInstant()`, which drains a fresh A* generator synchronously and repaints — no animation, same code.

## 5. Tech Stack & Why

| Choice | Why |
|--------|-----|
| Vanilla JS ES modules | No framework overhead; the point is to show the algorithms, and the UI is a few hundred lines of DOM code. Import boundaries make the algorithm/UI split physical. |
| Generators (`function*`) | The cleanest way to pause an algorithm between steps without rewriting it as a state machine or sprinkling callbacks through the loops. The algorithm reads like the textbook version. |
| `<canvas>` | A 31x61 grid is 1,891 cells and a sort can have 300 bars updated 60 times a frame; DOM nodes would not keep up. |
| `requestAnimationFrame` | Ties stepping to display refresh and pauses when the tab is hidden. |
| Vite | Zero-config dev server with native ES modules, and a one-line `base` setting for the Pages sub-path. |
| Vitest | Runs the pure algorithm modules in Node with no DOM shim needed; shares its config with Vite. |
| GitHub Actions + Pages | Free, tests gate the deploy, and the live URL is in the README. |
| Mulberry32 PRNG | `Math.random` cannot be seeded; a 10-line PRNG makes maze tests deterministic. |

## 6. Testing & Quality

`npm test -- --run` executes **120 tests** across three files. They run against `src/algorithms/` only; no browser environment is required.

**`tests/pathfinding.test.js`**
- Every one of the five pathfinders finds a contiguous path (each step is a 4-neighbour of the previous) from start to end on an open grid.
- BFS, Dijkstra and A* return a path whose length equals the Manhattan distance on an open grid, and the optimal detour length around a wall.
- Every pathfinder returns `path: []` when the end is fully enclosed.
- On weighted grids, Dijkstra and A* choose the cheaper-but-longer route; BFS ignores weights and takes the geometrically shortest.
- Dijkstra and A* agree on total cost for a seeded random weighted grid (a check that the Manhattan heuristic is admissible in practice).
- Step semantics: every yielded step is `visit` or `frontier` with in-bounds coordinates, and `visitedCount` equals the number of `visit` steps.
- `MinHeap` pops in priority order and breaks ties by insertion order.

**`tests/sorting.test.js`**
- Each of the six sorters produces sorted output for random, already-sorted, reversed, all-duplicates, single-element, empty and 500-element inputs, and never mutates its input.
- Replaying the yielded steps through `applyStep` on a copy of the input reproduces the generator's returned array exactly — proving the step stream is a faithful record of the algorithm.
- Every step is well-formed; every index is marked `sorted` by the end.
- Algorithm-specific invariants: swap-based sorts never emit `overwrite`; merge sort never emits `swap`; bubble sort performs zero swaps on sorted input; selection sort does at most n-1 swaps; merge sort's comparison count on 256 elements is within the O(n log n) bound.

**`tests/maze.test.js`**
- Recursive division keeps start and end reachable across every grid size the UI offers and several seeds, including when an endpoint sits on the border.
- The result is a perfect maze: a BFS from the start reaches every open cell.
- Generation is deterministic for a fixed seed, returns walls in draw order, and clears existing walls/weights first.
- Random maze never walls the endpoints and respects the requested density approximately.
- `createRng` is deterministic and yields values in `[0, 1)`.

**CI:** `.github/workflows/deploy.yml` runs this suite before `vite build`; a red test means nothing is deployed.

## 7. Challenges & Learnings

1. **Keeping start/end reachable in recursive division.** The textbook algorithm happily walls in an endpoint that sits on a chamber boundary or on the outer border. The fix was `protectedSet()` in `maze.js`, which reserves the endpoint cells *and their in-bounds neighbours*, plus the odd/even index discipline so gaps always line up with corridors. The border-endpoint test case exists because the first version failed it.

2. **Making runs reproducible.** A heap with arbitrary tie-breaking produces a different visited pattern on every run for the same board, which makes screenshots inconsistent and tests flaky. Adding an insertion-order counter to `MinHeap` and fixing `neighbors()` to N, E, S, W order made every algorithm deterministic; seeding the PRNG did the same for mazes.

3. **Speed control without busy-waiting.** Driving each step with `setTimeout` caps the fastest speed at a few hundred steps per second and makes "Stop" laggy. A single rAF loop that consumes a variable number of steps per frame (`Animator.#rate()`) gives a 60x range from the slider, lets speed change mid-run, and makes stopping instant because there is only one pending frame to cancel.

4. **Testing the behaviour, not just the result.** It is easy to test that a sort returns sorted output; it is more valuable to test that the step stream is a faithful trace. The `applyStep` replay tests in `tests/sorting.test.js` are what guarantee the animation shows the same bars the algorithm actually moved — a returned array can be correct while the emitted steps are wrong, and only the replay test would catch that.

## 8. Future Improvements

- **Diagonal movement and more heuristics** (Euclidean, Chebyshev, octile) — `bestFirst` already takes a `heuristic` option; the grid needs an 8-neighbour mode.
- **Bidirectional search and Jump Point Search** as further entries in `PATHFINDERS`.
- **More sorters**: shell, radix, counting and Tim sort, to contrast comparison-based and non-comparison-based approaches.
- **Side-by-side mode**: run two algorithms on the same board simultaneously and compare visited counts live.
- **Shareable boards**: encode walls, weights and endpoints in the URL hash.
- **Sound** keyed to bar height during sorting, via the Web Audio API.
- **Coverage gating in CI** via `npm run test:coverage`, and a lightweight Playwright smoke test for the UI layer, which is currently untested.
