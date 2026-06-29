// grid.js — a pure, DOM-free grid model shared by the maze generators,
// pathfinders, and the renderer. Keeping it free of browser APIs means the
// same code runs under Node's test runner and inside the browser.

export const WALL_N = 1;
export const WALL_E = 2;
export const WALL_S = 4;
export const WALL_W = 8;

// Opposite wall bit for a given direction, used when carving passages so that
// removing a wall between two cells clears it from both sides.
export const OPPOSITE = {
  [WALL_N]: WALL_S,
  [WALL_E]: WALL_W,
  [WALL_S]: WALL_N,
  [WALL_W]: WALL_E,
};

// Unit deltas for each wall direction: [dx, dy].
export const DELTA = {
  [WALL_N]: [0, -1],
  [WALL_E]: [1, 0],
  [WALL_S]: [0, 1],
  [WALL_W]: [-1, 0],
};

export class Grid {
  constructor(cols, rows) {
    if (cols < 1 || rows < 1) throw new Error('grid must be at least 1x1');
    this.cols = cols;
    this.rows = rows;
    // Every cell starts fully walled in. Maze generation carves passages by
    // clearing wall bits.
    this.walls = new Array(cols * rows).fill(WALL_N | WALL_E | WALL_S | WALL_W);
  }

  index(x, y) {
    return y * this.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  // Is the wall on `side` of cell (x, y) present?
  hasWall(x, y, side) {
    return (this.walls[this.index(x, y)] & side) !== 0;
  }

  // Carve a passage between (x, y) and its neighbour on `side`, clearing the
  // wall from both cells.
  carve(x, y, side) {
    const [dx, dy] = DELTA[side];
    const nx = x + dx;
    const ny = y + dy;
    if (!this.inBounds(nx, ny)) return;
    this.walls[this.index(x, y)] &= ~side;
    this.walls[this.index(nx, ny)] &= ~OPPOSITE[side];
  }

  // Reinstate a wall between (x, y) and its neighbour (used for hand-drawing).
  block(x, y, side) {
    const [dx, dy] = DELTA[side];
    const nx = x + dx;
    const ny = y + dy;
    this.walls[this.index(x, y)] |= side;
    if (this.inBounds(nx, ny)) this.walls[this.index(nx, ny)] |= OPPOSITE[side];
  }

  // Neighbours reachable from (x, y) — i.e. those with no wall between them.
  // Returned in N, E, S, W order for deterministic traversal.
  passableNeighbours(x, y) {
    const out = [];
    for (const side of [WALL_N, WALL_E, WALL_S, WALL_W]) {
      if (this.hasWall(x, y, side)) continue;
      const [dx, dy] = DELTA[side];
      const nx = x + dx;
      const ny = y + dy;
      if (this.inBounds(nx, ny)) out.push([nx, ny]);
    }
    return out;
  }

  // Fill every cell back in (all four walls). Resets the maze.
  reset() {
    this.walls.fill(WALL_N | WALL_E | WALL_S | WALL_W);
  }
}
