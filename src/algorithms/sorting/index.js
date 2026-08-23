/**
 * Sorting algorithms as generators.
 *
 * Each generator receives an array (which it copies, never mutating the input)
 * and yields step objects describing the operation it just performed:
 *
 *   { type: 'compare',   i, j }          - indices compared
 *   { type: 'swap',      i, j }          - a[i] and a[j] were exchanged
 *   { type: 'overwrite', i, value }      - a[i] was set to value (merge/insertion shift)
 *   { type: 'sorted',    i }             - index i is in its final position
 *
 * When the generator finishes it returns the sorted array. `applyStep` lets a
 * consumer replay the steps against its own copy of the array to stay in sync.
 */

export function applyStep(arr, step) {
  if (step.type === 'swap') {
    const t = arr[step.i];
    arr[step.i] = arr[step.j];
    arr[step.j] = t;
  } else if (step.type === 'overwrite') {
    arr[step.i] = step.value;
  }
  return arr;
}

export function* bubbleSort(input) {
  const a = [...input];
  const n = a.length;
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield { type: 'compare', i, j: i + 1 };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
        yield { type: 'swap', i, j: i + 1 };
      }
    }
    yield { type: 'sorted', i: end };
    if (!swapped) {
      for (let i = end - 1; i >= 0; i--) yield { type: 'sorted', i };
      return a;
    }
  }
  if (n > 0) yield { type: 'sorted', i: 0 };
  return a;
}

export function* insertionSort(input) {
  const a = [...input];
  const n = a.length;
  for (let i = 1; i < n; i++) {
    const keyVal = a[i];
    let j = i - 1;
    while (j >= 0) {
      yield { type: 'compare', i: j, j: i };
      if (a[j] <= keyVal) break;
      a[j + 1] = a[j];
      yield { type: 'overwrite', i: j + 1, value: a[j] };
      j--;
    }
    a[j + 1] = keyVal;
    yield { type: 'overwrite', i: j + 1, value: keyVal };
  }
  for (let i = 0; i < n; i++) yield { type: 'sorted', i };
  return a;
}

export function* selectionSort(input) {
  const a = [...input];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      yield { type: 'compare', i: min, j };
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      yield { type: 'swap', i, j: min };
    }
    yield { type: 'sorted', i };
  }
  if (n > 0) yield { type: 'sorted', i: n - 1 };
  return a;
}

export function* mergeSort(input) {
  const a = [...input];
  const n = a.length;

  function* merge(lo, mid, hi) {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      // indices of the two candidates in the (pre-merge) array
      yield { type: 'compare', i: lo + i, j: mid + 1 + j };
      if (left[i] <= right[j]) {
        a[k] = left[i++];
      } else {
        a[k] = right[j++];
      }
      yield { type: 'overwrite', i: k, value: a[k] };
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++];
      yield { type: 'overwrite', i: k, value: a[k] };
      k++;
    }
    while (j < right.length) {
      a[k] = right[j++];
      yield { type: 'overwrite', i: k, value: a[k] };
      k++;
    }
  }

  function* sort(lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    yield* sort(lo, mid);
    yield* sort(mid + 1, hi);
    yield* merge(lo, mid, hi);
  }

  yield* sort(0, n - 1);
  for (let i = 0; i < n; i++) yield { type: 'sorted', i };
  return a;
}

export function* quickSort(input) {
  const a = [...input];
  const n = a.length;

  /** Lomuto partition with middle-element pivot moved to the end. */
  function* partition(lo, hi) {
    const midIdx = Math.floor((lo + hi) / 2);
    if (midIdx !== hi) {
      [a[midIdx], a[hi]] = [a[hi], a[midIdx]];
      yield { type: 'swap', i: midIdx, j: hi };
    }
    const pivot = a[hi];
    let store = lo;
    for (let j = lo; j < hi; j++) {
      yield { type: 'compare', i: j, j: hi };
      if (a[j] < pivot) {
        if (store !== j) {
          [a[store], a[j]] = [a[j], a[store]];
          yield { type: 'swap', i: store, j };
        }
        store++;
      }
    }
    if (store !== hi) {
      [a[store], a[hi]] = [a[hi], a[store]];
      yield { type: 'swap', i: store, j: hi };
    }
    yield { type: 'sorted', i: store };
    return store;
  }

  // explicit stack avoids deep recursion on large arrays
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    if (lo > hi) continue;
    if (lo === hi) {
      yield { type: 'sorted', i: lo };
      continue;
    }
    const p = yield* partition(lo, hi);
    stack.push([p + 1, hi]);
    stack.push([lo, p - 1]);
  }
  return a;
}

export function* heapSort(input) {
  const a = [...input];
  const n = a.length;

  function* siftDown(start, end) {
    let root = start;
    for (;;) {
      const left = 2 * root + 1;
      if (left > end) return;
      const right = left + 1;
      let child = left;
      if (right <= end) {
        yield { type: 'compare', i: left, j: right };
        if (a[right] > a[left]) child = right;
      }
      yield { type: 'compare', i: root, j: child };
      if (a[root] >= a[child]) return;
      [a[root], a[child]] = [a[child], a[root]];
      yield { type: 'swap', i: root, j: child };
      root = child;
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* siftDown(i, n - 1);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    yield { type: 'swap', i: 0, j: end };
    yield { type: 'sorted', i: end };
    yield* siftDown(0, end - 1);
  }
  if (n > 0) yield { type: 'sorted', i: 0 };
  return a;
}

export const SORTERS = {
  bubble: { name: 'Bubble Sort', run: bubbleSort, complexity: 'O(n^2)' },
  insertion: { name: 'Insertion Sort', run: insertionSort, complexity: 'O(n^2)' },
  selection: { name: 'Selection Sort', run: selectionSort, complexity: 'O(n^2)' },
  merge: { name: 'Merge Sort', run: mergeSort, complexity: 'O(n log n)' },
  quick: { name: 'Quick Sort', run: quickSort, complexity: 'O(n log n)' },
  heap: { name: 'Heap Sort', run: heapSort, complexity: 'O(n log n)' },
};

/** Generates `size` random integers in [min, max]. */
export function randomArray(size, { min = 5, max = 100, rng = Math.random } = {}) {
  return Array.from({ length: size }, () => min + Math.floor(rng() * (max - min + 1)));
}
