// pathfind.js — graph search over a carved Grid.
//
// Like the maze generators these are generator functions that yield search
// "frames" so the UI can animate exploration. Each yielded frame is:
//   { type: 'visit', cell: [x, y] }            a cell was expanded
//   { type: 'frontier', cell: [x, y] }         a cell was added to the frontier
//   { type: 'done', path: [[x,y]...], found }  search finished
//
// All algorithms share the same signature (grid, start, goal) and ultimately
// reconstruct a path via a cameFrom map.

import { MinHeap } from './heap.js';

function key(x, y) {
  return `${x},${y}`;
}

function reconstruct(cameFrom, goalKey, goal) {
  const path = [];
  let cur = goalKey;
  while (cur !== undefined) {
    const [x, y] = cur.split(',').map(Number);
    path.push([x, y]);
    cur = cameFrom.get(cur);
  }
  path.reverse();
  return path;
}

// Breadth-first search. Unweighted shortest path; explores in rings.
export function* bfs(grid, start, goal) {
  const startK = key(...start);
  const goalK = key(...goal);
  const queue = [start];
  const cameFrom = new Map([[startK, undefined]]);
  yield { type: 'frontier', cell: start };

  while (queue.length) {
    const [x, y] = queue.shift();
    const ck = key(x, y);
    yield { type: 'visit', cell: [x, y] };
    if (ck === goalK) {
      yield { type: 'done', path: reconstruct(cameFrom, goalK, goal), found: true };
      return;
    }
    for (const [nx, ny] of grid.passableNeighbours(x, y)) {
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) continue;
      cameFrom.set(nk, ck);
      queue.push([nx, ny]);
      yield { type: 'frontier', cell: [nx, ny] };
    }
  }
  yield { type: 'done', path: [], found: false };
}

// Depth-first search. Not shortest-path, but a nice contrast to BFS.
export function* dfs(grid, start, goal) {
  const startK = key(...start);
  const goalK = key(...goal);
  const stack = [start];
  const cameFrom = new Map([[startK, undefined]]);
  const seen = new Set([startK]);
  yield { type: 'frontier', cell: start };

  while (stack.length) {
    const [x, y] = stack.pop();
    const ck = key(x, y);
    yield { type: 'visit', cell: [x, y] };
    if (ck === goalK) {
      yield { type: 'done', path: reconstruct(cameFrom, goalK, goal), found: true };
      return;
    }
    for (const [nx, ny] of grid.passableNeighbours(x, y)) {
      const nk = key(nx, ny);
      if (seen.has(nk)) continue;
      seen.add(nk);
      cameFrom.set(nk, ck);
      stack.push([nx, ny]);
      yield { type: 'frontier', cell: [nx, ny] };
    }
  }
  yield { type: 'done', path: [], found: false };
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// Dijkstra / A* share a body; A* adds the Manhattan heuristic. With uniform
// edge weights of 1 they both find a shortest path, but A* expands far fewer
// cells. Pass `heuristic = true` for A*.
function* weightedSearch(grid, start, goal, heuristic) {
  const startK = key(...start);
  const goalK = key(...goal);
  const cameFrom = new Map([[startK, undefined]]);
  const gScore = new Map([[startK, 0]]);
  const open = new MinHeap();
  open.push(start, 0);

  while (open.size > 0) {
    const [x, y] = open.pop();
    const ck = key(x, y);
    yield { type: 'visit', cell: [x, y] };
    if (ck === goalK) {
      yield { type: 'done', path: reconstruct(cameFrom, goalK, goal), found: true };
      return;
    }
    const g = gScore.get(ck);
    for (const [nx, ny] of grid.passableNeighbours(x, y)) {
      const nk = key(nx, ny);
      const tentative = g + 1;
      if (gScore.has(nk) && tentative >= gScore.get(nk)) continue;
      cameFrom.set(nk, ck);
      gScore.set(nk, tentative);
      const h = heuristic ? manhattan(nx, ny, goal[0], goal[1]) : 0;
      open.push([nx, ny], tentative + h);
      yield { type: 'frontier', cell: [nx, ny] };
    }
  }
  yield { type: 'done', path: [], found: false };
}

export function* dijkstra(grid, start, goal) {
  yield* weightedSearch(grid, start, goal, false);
}

export function* astar(grid, start, goal) {
  yield* weightedSearch(grid, start, goal, true);
}

export const PATHFINDERS = { bfs, dfs, dijkstra, astar };

// Convenience: run a search to completion and return its result frame.
export function solve(grid, start, goal, algorithm = 'astar') {
  const finder = PATHFINDERS[algorithm];
  if (!finder) throw new Error(`unknown algorithm: ${algorithm}`);
  let visited = 0;
  let last = { type: 'done', path: [], found: false };
  for (const frame of finder(grid, start, goal)) {
    if (frame.type === 'visit') visited++;
    if (frame.type === 'done') last = frame;
  }
  return { ...last, visited };
}
