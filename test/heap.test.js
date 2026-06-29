import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MinHeap } from '../src/heap.js';

test('pops items in priority order', () => {
  const h = new MinHeap();
  const input = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0];
  for (const p of input) h.push(`v${p}`, p);
  const out = [];
  while (h.size > 0) out.push(h.pop());
  assert.deepEqual(out, input.slice().sort((a, b) => a - b).map((p) => `v${p}`));
});

test('handles duplicate priorities', () => {
  const h = new MinHeap();
  h.push('a', 1);
  h.push('b', 1);
  h.push('c', 1);
  const out = [h.pop(), h.pop(), h.pop()];
  assert.equal(out.length, 3);
  assert.ok(out.includes('a') && out.includes('b') && out.includes('c'));
});

test('pop on an empty heap returns undefined', () => {
  const h = new MinHeap();
  assert.equal(h.pop(), undefined);
  assert.equal(h.size, 0);
});

test('size tracks pushes and pops', () => {
  const h = new MinHeap();
  assert.equal(h.size, 0);
  h.push('x', 10);
  h.push('y', 20);
  assert.equal(h.size, 2);
  h.pop();
  assert.equal(h.size, 1);
});
