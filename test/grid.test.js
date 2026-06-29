import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid, WALL_N, WALL_S, WALL_E, WALL_W } from '../src/grid.js';

test('new grid is fully walled', () => {
  const g = new Grid(3, 3);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      assert.ok(g.hasWall(x, y, WALL_N));
      assert.ok(g.hasWall(x, y, WALL_E));
      assert.ok(g.hasWall(x, y, WALL_S));
      assert.ok(g.hasWall(x, y, WALL_W));
    }
  }
});

test('carving clears the wall on both adjacent cells', () => {
  const g = new Grid(2, 2);
  g.carve(0, 0, WALL_S); // between (0,0) and (0,1)
  assert.ok(!g.hasWall(0, 0, WALL_S));
  assert.ok(!g.hasWall(0, 1, WALL_N));
});

test('carving toward an out-of-bounds neighbour is a no-op', () => {
  const g = new Grid(2, 2);
  g.carve(0, 0, WALL_N); // off the top edge
  assert.ok(g.hasWall(0, 0, WALL_N));
});

test('passableNeighbours only returns reachable cells', () => {
  const g = new Grid(3, 1);
  assert.deepEqual(g.passableNeighbours(1, 0), []);
  g.carve(1, 0, WALL_E);
  assert.deepEqual(g.passableNeighbours(1, 0), [[2, 0]]);
});

test('block reinstates a carved wall on both sides', () => {
  const g = new Grid(2, 1);
  g.carve(0, 0, WALL_E);
  g.block(0, 0, WALL_E);
  assert.ok(g.hasWall(0, 0, WALL_E));
  assert.ok(g.hasWall(1, 0, 8 /* WALL_W */));
});

test('inBounds rejects coordinates outside the grid', () => {
  const g = new Grid(2, 2);
  assert.ok(g.inBounds(1, 1));
  assert.ok(!g.inBounds(2, 0));
  assert.ok(!g.inBounds(-1, 0));
});
