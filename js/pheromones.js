import { PW, PH } from './constants.js';
import { W, H } from './state.js';

export function pIdx(x, y) {
  const gx = Math.floor(x / W() * PW);
  const gy = Math.floor(y / H() * PH);
  return Math.max(0, Math.min(PW * PH - 1, gy * PW + gx));
}

export function depositPher(grid, x, y, v) {
  const i = pIdx(x, y);
  grid[i] = Math.min(1.0, grid[i] + v);
}

export function getPher(grid, x, y) {
  return grid[pIdx(x, y)];
}

export function evaporatePher(grid, rate) {
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.max(0, grid[i] - rate);
  }
}
