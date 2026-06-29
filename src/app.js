// app.js — browser glue: owns the canvas, drives animation, and wires the
// controls to the pure Grid / maze / pathfind modules.

import { Grid, WALL_N, WALL_E, WALL_S, WALL_W } from './grid.js';
import { GENERATORS, makeRng } from './maze.js';
import { PATHFINDERS } from './pathfind.js';

const COLORS = getComputedStyle(document.documentElement);
const c = (name) => COLORS.getPropertyValue(name).trim();

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const els = {
  generator: document.getElementById('generator'),
  seed: document.getElementById('seed'),
  generate: document.getElementById('generate'),
  finder: document.getElementById('finder'),
  solve: document.getElementById('solve'),
  clear: document.getElementById('clear'),
  size: document.getElementById('size'),
  sizeval: document.getElementById('sizeval'),
  speed: document.getElementById('speed'),
  stats: document.getElementById('stats'),
};

const state = {
  grid: null,
  start: [0, 0],
  goal: [0, 0],
  visited: new Set(), // "x,y"
  frontier: new Set(),
  path: [],
  running: false,
  drawMode: null, // 'carve' | 'block' | null while dragging
};

const k = (x, y) => `${x},${y}`;

// ---- rendering -------------------------------------------------------------

function cellSize() {
  return canvas.width / state.grid.cols;
}

function draw() {
  const g = state.grid;
  const s = cellSize();
  ctx.fillStyle = c('--bg-cell');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cell backgrounds: visited / frontier shading first.
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const key = k(x, y);
      let fill = c('--bg-cell');
      if (state.frontier.has(key)) fill = c('--frontier');
      if (state.visited.has(key)) fill = c('--visited');
      ctx.fillStyle = fill;
      ctx.fillRect(x * s + 1, y * s + 1, s - 1, s - 1);
    }
  }

  // Path overlay.
  ctx.fillStyle = c('--path');
  for (const [x, y] of state.path) {
    ctx.fillRect(x * s + s * 0.22, y * s + s * 0.22, s * 0.56, s * 0.56);
  }

  // Walls.
  ctx.strokeStyle = c('--wall');
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const px = x * s;
      const py = y * s;
      if (g.hasWall(x, y, WALL_N)) line(px, py, px + s, py);
      if (g.hasWall(x, y, WALL_W)) line(px, py, px, py + s);
      if (g.hasWall(x, y, WALL_E)) line(px + s, py, px + s, py + s);
      if (g.hasWall(x, y, WALL_S)) line(px, py + s, px + s, py + s);
    }
  }
  ctx.stroke();

  // Start & goal markers.
  marker(state.start, c('--start'));
  marker(state.goal, c('--goal'));
}

function line(x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function marker([x, y], color) {
  const s = cellSize();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x * s + s / 2, y * s + s / 2, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ---- lifecycle -------------------------------------------------------------

function newGrid(cols) {
  state.grid = new Grid(cols, cols);
  state.start = [0, 0];
  state.goal = [cols - 1, cols - 1];
  clearSearch();
}

function clearSearch() {
  state.visited.clear();
  state.frontier.clear();
  state.path = [];
  els.stats.textContent = '';
}

function setControlsEnabled(on) {
  for (const id of ['generator', 'seed', 'generate', 'finder', 'solve', 'size']) {
    els[id].disabled = !on;
  }
}

function generateMaze() {
  clearSearch();
  const cols = state.grid.cols;
  state.grid = new Grid(cols, cols);
  state.start = [0, 0];
  state.goal = [cols - 1, cols - 1];
  const gen = GENERATORS[els.generator.value];
  const seedVal = Number(els.seed.value);
  const rng = Number.isFinite(seedVal) ? makeRng(seedVal) : Math.random;
  const it = gen(state.grid, rng);

  // Animate the carve.
  state.running = true;
  setControlsEnabled(false);
  const stepsPerFrame = Math.max(1, Math.round(state.grid.cols * state.grid.rows / 240));
  const tick = () => {
    let done = false;
    const batch = Math.round(stepsPerFrame * (Number(els.speed.value) / 50));
    for (let i = 0; i < Math.max(1, batch); i++) {
      if (it.next().done) { done = true; break; }
    }
    draw();
    if (done) {
      state.running = false;
      setControlsEnabled(true);
    } else {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function solveMaze() {
  if (state.running) return;
  clearSearch();
  const finder = PATHFINDERS[els.finder.value];
  const it = finder(state.grid, state.start, state.goal);
  state.running = true;
  setControlsEnabled(false);
  let visitedCount = 0;

  const tick = () => {
    const speed = Number(els.speed.value);
    const batch = Math.max(1, Math.round((state.grid.cols * state.grid.rows) / 400 * (speed / 25) + 1));
    let result = null;
    for (let i = 0; i < batch; i++) {
      const { value, done } = it.next();
      if (done) break;
      if (value.type === 'visit') {
        visitedCount++;
        const key = k(...value.cell);
        state.frontier.delete(key);
        state.visited.add(key);
      } else if (value.type === 'frontier') {
        state.frontier.add(k(...value.cell));
      } else if (value.type === 'done') {
        result = value;
        break;
      }
    }
    draw();
    if (result) {
      finishSolve(result, visitedCount);
    } else {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function finishSolve(result, visitedCount) {
  state.running = false;
  setControlsEnabled(true);
  if (result.found) {
    animatePath(result.path);
    els.stats.textContent =
      `${result.path.length} steps · ${visitedCount} cells explored`;
  } else {
    els.stats.textContent = `no path · ${visitedCount} explored`;
  }
}

function animatePath(path) {
  state.path = [];
  let i = 0;
  const step = () => {
    if (i >= path.length) return;
    state.path.push(path[i++]);
    draw();
    requestAnimationFrame(step);
  };
  step();
}

// ---- wall drawing ----------------------------------------------------------

function cellFromEvent(ev) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (ev.clientX - rect.left) * scaleX;
  const py = (ev.clientY - rect.top) * scaleY;
  const s = cellSize();
  return { x: Math.floor(px / s), y: Math.floor(py / s), px, py, s };
}

// Toggle the wall on whichever edge of the cell the pointer is nearest.
function editWall(ev) {
  if (state.running) return;
  const { x, y, px, py, s } = cellFromEvent(ev);
  if (!state.grid.inBounds(x, y)) return;
  const fx = px / s - x; // 0..1 within cell
  const fy = py / s - y;
  // Distance to each edge; pick the closest.
  const edges = [
    [WALL_N, fy],
    [WALL_S, 1 - fy],
    [WALL_W, fx],
    [WALL_E, 1 - fx],
  ].sort((a, b) => a[1] - b[1]);
  const side = edges[0][0];
  const has = state.grid.hasWall(x, y, side);

  // Lock the mode on first contact so a drag consistently adds or removes.
  if (state.drawMode === null) state.drawMode = has ? 'carve' : 'block';
  if (state.drawMode === 'carve') state.grid.carve(x, y, side);
  else state.grid.block(x, y, side);

  clearSearch();
  draw();
}

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  state.drawMode = null;
  editWall(ev);
});
canvas.addEventListener('pointermove', (ev) => {
  if (state.drawMode !== null && ev.buttons) editWall(ev);
});
canvas.addEventListener('pointerup', () => { state.drawMode = null; });

// ---- controls --------------------------------------------------------------

els.generate.addEventListener('click', generateMaze);
els.solve.addEventListener('click', solveMaze);
els.clear.addEventListener('click', () => { clearSearch(); draw(); });
els.size.addEventListener('input', () => {
  els.sizeval.textContent = els.size.value;
});
els.size.addEventListener('change', () => {
  newGrid(Number(els.size.value));
  generateMaze();
});

// ---- boot ------------------------------------------------------------------

newGrid(Number(els.size.value));
generateMaze();
