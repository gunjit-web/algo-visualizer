/**
 * Minimal binary min-heap keyed by a numeric priority.
 * Ties are broken by insertion order so that traversal is deterministic.
 */
export class MinHeap {
  constructor() {
    this.items = [];
    this.counter = 0;
  }

  get size() {
    return this.items.length;
  }

  push(priority, value) {
    this.items.push({ priority, order: this.counter++, value });
    this.#up(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      this.#down(0);
    }
    return top.value;
  }

  #less(a, b) {
    return a.priority < b.priority || (a.priority === b.priority && a.order < b.order);
  }

  #up(i) {
    const items = this.items;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.#less(items[i], items[p])) break;
      [items[i], items[p]] = [items[p], items[i]];
      i = p;
    }
  }

  #down(i) {
    const items = this.items;
    const n = items.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.#less(items[l], items[m])) m = l;
      if (r < n && this.#less(items[r], items[m])) m = r;
      if (m === i) return;
      [items[i], items[m]] = [items[m], items[i]];
      i = m;
    }
  }
}
