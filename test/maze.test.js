import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/grid.js';
import { generate, makeRng, GENERATORS } from '../src/maze.js';

// A perfect maze (the kind these generators produce) is a spanning tree: every
// cell reachable from every other, with exactly one path between any two — i.e.
// connected and with (cells - 1) carved edges.
function carvedEdges(grid) {
  let count = 0;
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      // Count passages to the east and south only, to avoid double counting.
      if (!grid.hasWall(x, y, 2 /* E */) && grid.inBounds(x + 1, y)) count++;
      if (!grid.hasWall(x, y, 4 /* S */) && grid.inBounds(x, y + 1)) count++;
    }
  }
  return count;
}

function reachableCount(grid, start = [0, 0]) {
  const seen = new Set([grid.index(...start)]);
  const stack = [start];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [nx, ny] of grid.passableNeighbours(x, y)) {
      const k = grid.index(nx, ny);
      if (!seen.has(k)) {
        seen.add(k);
        stack.push([nx, ny]);
      }
    }
  }
  return seen.size;
}

for (const name of Object.keys(GENERATORS)) {
  test(`${name}: produces a fully-connected perfect maze`, () => {
    const grid = generate(12, 9, { algorithm: name, seed: 42 });
    const cells = grid.cols * grid.rows;
    assert.equal(reachableCount(grid), cells, 'every cell must be reachable');
    assert.equal(carvedEdges(grid), cells - 1, 'a spanning tree has cells-1 edges');
  });
}

test('the same seed produces an identical maze', () => {
  const a = generate(10, 10, { algorithm: 'backtracker', seed: 7 });
  const b = generate(10, 10, { algorithm: 'backtracker', seed: 7 });
  assert.deepEqual(a.walls, b.walls);
});

test('different seeds produce different mazes', () => {
  const a = generate(10, 10, { algorithm: 'backtracker', seed: 7 });
  const b = generate(10, 10, { algorithm: 'backtracker', seed: 8 });
  assert.notDeepEqual(a.walls, b.walls);
});

test('makeRng is deterministic and within [0, 1)', () => {
  const r1 = makeRng(123);
  const r2 = makeRng(123);
  for (let i = 0; i < 100; i++) {
    const v = r1();
    assert.equal(v, r2());
    assert.ok(v >= 0 && v < 1);
  }
});

test('unknown algorithm throws', () => {
  assert.throws(() => generate(4, 4, { algorithm: 'nope' }), /unknown algorithm/);
});
