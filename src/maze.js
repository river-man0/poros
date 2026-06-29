// maze.js — maze generation algorithms operating on a Grid.
//
// Each generator is written as a generator function (yield*) so the UI can
// animate carving step by step, while tests can simply drain the iterator to
// run it to completion. Each yielded value is the [x, y] cell just visited.

import { Grid, WALL_N, WALL_E, WALL_S, WALL_W, DELTA } from './grid.js';

const SIDES = [WALL_N, WALL_E, WALL_S, WALL_W];

// A tiny deterministic PRNG (mulberry32) so mazes are reproducible in tests
// and shareable via seed in the UI.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Recursive backtracker (depth-first). Produces long, winding corridors.
export function* recursiveBacktracker(grid, rng = Math.random, start = [0, 0]) {
  const visited = new Set();
  const stack = [start];
  visited.add(grid.index(start[0], start[1]));
  yield start;

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const candidates = [];
    for (const side of SIDES) {
      const [dx, dy] = DELTA[side];
      const nx = x + dx;
      const ny = y + dy;
      if (grid.inBounds(nx, ny) && !visited.has(grid.index(nx, ny))) {
        candidates.push(side);
      }
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const side = shuffle(candidates, rng)[0];
    const [dx, dy] = DELTA[side];
    const nx = x + dx;
    const ny = y + dy;
    grid.carve(x, y, side);
    visited.add(grid.index(nx, ny));
    stack.push([nx, ny]);
    yield [nx, ny];
  }
}

// Randomised Prim's algorithm. Produces shorter dead ends and a more uniform,
// "bushy" texture than the backtracker.
export function* randomizedPrim(grid, rng = Math.random, start = [0, 0]) {
  const visited = new Set();
  // Frontier holds candidate edges as [x, y, side] from a visited cell.
  const frontier = [];

  const addFrontier = (x, y) => {
    visited.add(grid.index(x, y));
    for (const side of SIDES) {
      const [dx, dy] = DELTA[side];
      const nx = x + dx;
      const ny = y + dy;
      if (grid.inBounds(nx, ny) && !visited.has(grid.index(nx, ny))) {
        frontier.push([x, y, side]);
      }
    }
  };

  addFrontier(start[0], start[1]);
  yield start;

  while (frontier.length) {
    const idx = Math.floor(rng() * frontier.length);
    const [x, y, side] = frontier.splice(idx, 1)[0];
    const [dx, dy] = DELTA[side];
    const nx = x + dx;
    const ny = y + dy;
    if (visited.has(grid.index(nx, ny))) continue;
    grid.carve(x, y, side);
    addFrontier(nx, ny);
    yield [nx, ny];
  }
}

export const GENERATORS = {
  backtracker: recursiveBacktracker,
  prim: randomizedPrim,
};

// Convenience: build a fully-generated maze in one call (no animation).
export function generate(cols, rows, { algorithm = 'backtracker', seed } = {}) {
  const grid = new Grid(cols, rows);
  const rng = seed === undefined ? Math.random : makeRng(seed);
  const gen = GENERATORS[algorithm];
  if (!gen) throw new Error(`unknown algorithm: ${algorithm}`);
  // Drain the iterator to completion.
  for (const _ of gen(grid, rng)) { /* run to end */ }
  return grid;
}
