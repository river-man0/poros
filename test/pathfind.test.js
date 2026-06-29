import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/grid.js';
import { generate } from '../src/maze.js';
import { solve, PATHFINDERS } from '../src/pathfind.js';

// Build a simple open 3x3 room (all internal walls carved) for hand-checking.
function openRoom(cols, rows) {
  const g = new Grid(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) g.carve(x, y, 2 /* E */);
      if (y + 1 < rows) g.carve(x, y, 4 /* S */);
    }
  }
  return g;
}

const SHORTEST = ['bfs', 'dijkstra', 'astar'];

for (const name of SHORTEST) {
  test(`${name}: finds an optimal path across an open room`, () => {
    const g = openRoom(3, 3);
    const res = solve(g, [0, 0], [2, 2], name);
    assert.ok(res.found);
    // Manhattan distance 4 => path of 5 cells inclusive.
    assert.equal(res.path.length, 5);
    assert.deepEqual(res.path[0], [0, 0]);
    assert.deepEqual(res.path.at(-1), [2, 2]);
  });
}

test('every algorithm finds *a* valid path through a generated maze', () => {
  const g = generate(20, 20, { algorithm: 'backtracker', seed: 99 });
  for (const name of Object.keys(PATHFINDERS)) {
    const res = solve(g, [0, 0], [19, 19], name);
    assert.ok(res.found, `${name} should find a path`);
    // Validate path continuity: consecutive cells must be passable neighbours.
    for (let i = 1; i < res.path.length; i++) {
      const [px, py] = res.path[i - 1];
      const neighbours = g.passableNeighbours(px, py).map((c) => c.join(','));
      assert.ok(
        neighbours.includes(res.path[i].join(',')),
        `${name}: step ${i} is not a legal move`
      );
    }
  }
});

test('A* never expands more cells than Dijkstra (heuristic helps)', () => {
  const g = generate(25, 25, { algorithm: 'prim', seed: 5 });
  const a = solve(g, [0, 0], [24, 24], 'astar');
  const d = solve(g, [0, 0], [24, 24], 'dijkstra');
  assert.ok(a.visited <= d.visited);
});

test('BFS, Dijkstra and A* agree on shortest path length', () => {
  const g = generate(30, 30, { algorithm: 'backtracker', seed: 3 });
  const lengths = SHORTEST.map((n) => solve(g, [0, 0], [29, 29], n).path.length);
  assert.equal(new Set(lengths).size, 1, 'all shortest-path finders must agree');
});

test('no path is reported when the goal is walled off', () => {
  // A 2x2 grid with a single cell isolated.
  const g = new Grid(2, 2);
  g.carve(0, 0, 2 /* E */); // connect (0,0)-(1,0) only
  const res = solve(g, [0, 0], [1, 1], 'bfs');
  assert.ok(!res.found);
  assert.equal(res.path.length, 0);
});

test('unknown pathfinder throws', () => {
  const g = openRoom(2, 2);
  assert.throws(() => solve(g, [0, 0], [1, 1], 'nope'), /unknown algorithm/);
});
