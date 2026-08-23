/**
 * Canvas renderer for the pathfinding grid. Keeps an overlay of visited /
 * frontier / path cells separate from the grid model so that the model stays pure.
 */
import { key } from '../algorithms/grid.js';

export const COLORS = {
  empty: '#161a23',
  line: '#242a38',
  wall: '#3b4a61',
  weight: '#b45309',
  visited: '#1d4ed8',
  frontier: '#38bdf8',
  path: '#facc15',
  start: '#22c55e',
  end: '#ef4444',
};

export class GridRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = 24;
    this.overlay = new Map(); // key -> 'visited' | 'frontier' | 'path'
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(grid, maxWidth, maxHeight) {
    const size = Math.max(8, Math.floor(Math.min(maxWidth / grid.cols, maxHeight / grid.rows)));
    this.cell = size;
    const w = size * grid.cols;
    const h = size * grid.rows;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clearOverlay() {
    this.overlay.clear();
  }

  mark(r, c, state) {
    this.overlay.set(key(r, c), state);
  }

  /** Convert a pointer event into grid coordinates. */
  cellAt(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return { r: Math.floor(y / this.cell), c: Math.floor(x / this.cell) };
  }

  draw(grid, start, end) {
    const { ctx, cell } = this;
    const w = cell * grid.cols;
    const h = cell * grid.rows;
    ctx.fillStyle = COLORS.empty;
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const k = key(r, c);
        let color = null;
        if (grid.walls.has(k)) color = COLORS.wall;
        else if (this.overlay.has(k)) color = COLORS[this.overlay.get(k)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
        if (grid.weights.has(k) && !grid.walls.has(k)) this.drawWeight(r, c);
      }
    }

    // grid lines
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= grid.cols; c++) {
      ctx.moveTo(c * cell + 0.5, 0);
      ctx.lineTo(c * cell + 0.5, h);
    }
    for (let r = 0; r <= grid.rows; r++) {
      ctx.moveTo(0, r * cell + 0.5);
      ctx.lineTo(w, r * cell + 0.5);
    }
    ctx.stroke();

    this.drawMarker(start, COLORS.start);
    this.drawMarker(end, COLORS.end);
  }

  drawWeight(r, c) {
    const { ctx, cell } = this;
    const pad = Math.max(2, cell * 0.22);
    ctx.fillStyle = COLORS.weight;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2);
    ctx.globalAlpha = 1;
  }

  drawMarker(pos, color) {
    const { ctx, cell } = this;
    const cx = pos.c * cell + cell / 2;
    const cy = pos.r * cell + cell / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.stroke();
  }
}
