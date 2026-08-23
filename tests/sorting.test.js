import { describe, it, expect } from 'vitest';
import { SORTERS, applyStep, randomArray } from '../src/algorithms/sorting/index.js';

function collect(gen) {
  const steps = [];
  for (;;) {
    const { value, done } = gen.next();
    if (done) return { result: value, steps };
    steps.push(value);
  }
}

const sortedCopy = (arr) => [...arr].sort((a, b) => a - b);

const CASES = {
  random: [38, 27, 43, 3, 9, 82, 10, 27, 55, 1, 99, 64, 12, 12, 7],
  sorted: [1, 2, 3, 4, 5, 6, 7, 8],
  reversed: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  duplicates: [5, 5, 5, 2, 2, 9, 9, 1, 1, 5],
  single: [42],
  empty: [],
};

describe('sorting: correctness', () => {
  for (const [name, { run }] of Object.entries(SORTERS)) {
    for (const [label, input] of Object.entries(CASES)) {
      it(`${name} sorts a ${label} array`, () => {
        const { result } = collect(run(input));
        expect(result).toEqual(sortedCopy(input));
      });
    }

    it(`${name} does not mutate its input`, () => {
      const input = [...CASES.random];
      collect(run(input));
      expect(input).toEqual(CASES.random);
    });

    it(`${name} sorts a large random array`, () => {
      let seed = 123;
      const rng = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
      const input = randomArray(500, { rng });
      const { result } = collect(run(input));
      expect(result).toEqual(sortedCopy(input));
    });
  }
});

describe('sorting: step semantics', () => {
  for (const [name, { run }] of Object.entries(SORTERS)) {
    it(`${name} steps replay to the same sorted array via applyStep`, () => {
      const input = [...CASES.random];
      const replay = [...input];
      const { result, steps } = collect(run(input));
      for (const step of steps) applyStep(replay, step);
      expect(replay).toEqual(result);
      expect(replay).toEqual(sortedCopy(input));
    });

    it(`${name} yields only well-formed compare/swap/overwrite/sorted steps`, () => {
      const input = [...CASES.random];
      const n = input.length;
      const { steps } = collect(run(input));
      expect(steps.length).toBeGreaterThan(0);
      for (const s of steps) {
        expect(['compare', 'swap', 'overwrite', 'sorted']).toContain(s.type);
        expect(s.i).toBeGreaterThanOrEqual(0);
        expect(s.i).toBeLessThan(n);
        if (s.type === 'compare' || s.type === 'swap') {
          expect(s.j).toBeGreaterThanOrEqual(0);
          expect(s.j).toBeLessThan(n);
        }
        if (s.type === 'overwrite') expect(typeof s.value).toBe('number');
      }
    });

    it(`${name} marks every index as sorted exactly by the end`, () => {
      const input = [...CASES.random];
      const { steps } = collect(run(input));
      const sortedIdx = new Set(steps.filter((s) => s.type === 'sorted').map((s) => s.i));
      expect(sortedIdx.size).toBe(input.length);
    });
  }

  it('swap-based sorts never emit overwrite steps', () => {
    for (const name of ['bubble', 'selection', 'quick', 'heap']) {
      const { steps } = collect(SORTERS[name].run(CASES.random));
      expect(steps.some((s) => s.type === 'overwrite')).toBe(false);
    }
  });

  it('merge sort never emits swap steps', () => {
    const { steps } = collect(SORTERS.merge.run(CASES.random));
    expect(steps.some((s) => s.type === 'swap')).toBe(false);
  });

  it('bubble sort performs zero swaps on already sorted input', () => {
    const { steps } = collect(SORTERS.bubble.run(CASES.sorted));
    expect(steps.filter((s) => s.type === 'swap').length).toBe(0);
    expect(steps.filter((s) => s.type === 'compare').length).toBe(CASES.sorted.length - 1);
  });

  it('selection sort performs at most n-1 swaps', () => {
    const { steps } = collect(SORTERS.selection.run(CASES.reversed));
    expect(steps.filter((s) => s.type === 'swap').length).toBeLessThanOrEqual(CASES.reversed.length - 1);
  });

  it('merge sort uses O(n log n) comparisons on a 256-element array', () => {
    const input = randomArray(256);
    const { steps } = collect(SORTERS.merge.run(input));
    const comparisons = steps.filter((s) => s.type === 'compare').length;
    expect(comparisons).toBeLessThanOrEqual(256 * 8);
  });
});

describe('randomArray', () => {
  it('produces the requested size within bounds', () => {
    const arr = randomArray(50, { min: 10, max: 20 });
    expect(arr).toHaveLength(50);
    expect(arr.every((v) => v >= 10 && v <= 20)).toBe(true);
  });
});
