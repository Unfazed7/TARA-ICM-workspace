/**
 * Connection router for the Item Definition diagram (D-51, spec 24). Pure functions, no imports
 * at run time.
 *
 * Every connection is a right-angle line found by a shortest-path search on an 8 px grid:
 *   - lines never pass through a component or a box label;
 *   - lines never run along another line or along a box border;
 *   - each crossing costs a lot, so a longer path without crossings is preferred;
 *   - each bend costs a little, so lines stay simple.
 * Connections are routed in several orders and then each is routed again with all others in
 * place (rip-up and reroute); the result with fewest crossings wins. Any crossing that is left is
 * reported, and the drawing marks it with a small jump.
 */

import type { LayoutBox, LayoutNode } from './layout.ts';

export type Point = [number, number];

export interface RouteLink {
  id: string;
  source: string;
  target: string;
}

export interface Routed {
  id: string;
  points: Point[];
}

export interface Crossing {
  a: string;
  b: string;
  x: number;
  y: number;
}

const G = 8;
const BEND = 24;
const CROSS = 600;
const OVERLAP = 6000;
const HUG = 80;
const SIDE = 60;
const TRIES = 10;
const REROUTE_PASSES = 2;

type Dir = 0 | 1 | 2 | 3; // right, left, down, up
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

/** Small seeded random numbers so the result is the same on every run. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

class Heap {
  private a: [number, number][] = [];
  push(f: number, v: number) {
    const a = this.a;
    a.push([f, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): [number, number] | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

interface Grid {
  cw: number;
  ch: number;
  blocked: Uint8Array;
  hugH: Uint8Array; // cell sits on a horizontal border line
  hugV: Uint8Array; // cell sits on a vertical border line
}

function makeGrid(width: number, height: number, nodes: LayoutNode[], boxes: LayoutBox[], labelWidth: (b: LayoutBox) => number): Grid {
  // The grid stops at the canvas edge, so no line leaves the drawing.
  const cw = Math.floor(width / G);
  const ch = Math.floor(height / G);
  const blocked = new Uint8Array(cw * ch);
  const hugH = new Uint8Array(cw * ch);
  const hugV = new Uint8Array(cw * ch);
  const fill = (arr: Uint8Array, x0: number, y0: number, x1: number, y1: number) => {
    for (let cx = Math.max(0, Math.ceil(x0 / G)); cx <= Math.min(cw - 1, Math.floor(x1 / G)); cx++)
      for (let cy = Math.max(0, Math.ceil(y0 / G)); cy <= Math.min(ch - 1, Math.floor(y1 / G)); cy++) arr[cy * cw + cx] = 1;
  };
  for (const n of nodes) fill(blocked, n.x - G + 1, n.y - G + 1, n.x + n.w + G - 1, n.y + n.h + G - 1);
  for (const b of boxes) {
    const lw = labelWidth(b);
    fill(blocked, b.x + 6, b.y + 4, b.x + 14 + lw, b.y + 24);
    fill(hugH, b.x, b.y - 6, b.x + b.w, b.y + 6);
    fill(hugH, b.x, b.y + b.h - 6, b.x + b.w, b.y + b.h + 6);
    fill(hugV, b.x - 6, b.y, b.x + 6, b.y + b.h);
    fill(hugV, b.x + b.w - 6, b.y, b.x + b.w + 6, b.y + b.h);
  }
  return { cw, ch, blocked, hugH, hugV };
}

interface Port {
  cell: number;
  dir: Dir; // direction of travel when leaving (start) or arriving (end)
  pen: number;
  side: 'r' | 'l' | 'b' | 't';
}

function ports(grid: Grid, n: LayoutNode, other: LayoutNode, leaving: boolean): Port[] {
  const res: Port[] = [];
  const dx = other.x + other.w / 2 - (n.x + n.w / 2);
  const dy = other.y + other.h / 2 - (n.y + n.h / 2);
  const facing: ('r' | 'l' | 'b' | 't')[] = Math.abs(dx) >= Math.abs(dy) ? [dx > 0 ? 'r' : 'l', dy > 0 ? 'b' : 't'] : [dy > 0 ? 'b' : 't', dx > 0 ? 'r' : 'l'];
  const pen = (s: string) => (s === facing[0] ? 0 : s === facing[1] ? SIDE / 2 : SIDE * 2);
  const add = (cx: number, cy: number, side: 'r' | 'l' | 'b' | 't') => {
    if (cx < 0 || cy < 0 || cx >= grid.cw || cy >= grid.ch) return;
    const out: Dir = side === 'r' ? 0 : side === 'l' ? 1 : side === 'b' ? 2 : 3;
    const dir = (leaving ? out : ([1, 0, 3, 2] as Dir[])[out]) as Dir;
    res.push({ cell: cy * grid.cw + cx, dir, pen: pen(side), side });
  };
  const rx = Math.ceil((n.x + n.w + G) / G);
  const lx = Math.floor((n.x - G) / G);
  const by = Math.ceil((n.y + n.h + G) / G);
  const ty = Math.floor((n.y - G) / G);
  for (let cy = Math.ceil((n.y + 6) / G); cy * G <= n.y + n.h - 6; cy++) {
    add(rx, cy, 'r');
    add(lx, cy, 'l');
  }
  for (let cx = Math.ceil((n.x + 10) / G); cx * G <= n.x + n.w - 10; cx++) {
    add(cx, by, 'b');
    add(cx, ty, 't');
  }
  return res;
}

function snap(p: Point, n: LayoutNode, side: string): Point {
  if (side === 'r') return [n.x + n.w, p[1]];
  if (side === 'l') return [n.x, p[1]];
  if (side === 'b') return [p[0], n.y + n.h];
  return [p[0], n.y];
}

function compress(points: Point[]): Point[] {
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) continue;
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Routes every connection. Deterministic. */
export function routeConnections(
  width: number,
  height: number,
  nodes: LayoutNode[],
  boxes: LayoutBox[],
  links: RouteLink[],
  labelWidth: (b: LayoutBox) => number = (b) => b.label.length * 6.6 + 8,
): { routes: Routed[]; crossings: Crossing[] } {
  const grid = makeGrid(width, height, nodes, boxes, labelWidth);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const usable = links.filter((l) => byId.has(l.source) && byId.has(l.target) && l.source !== l.target);
  const size = grid.cw * grid.ch;

  // Occupancy: how many lines run horizontally / vertically through each cell.
  const occH = new Int16Array(size);
  const occV = new Int16Array(size);
  const cellsOf = new Map<string, { cell: number; o: 0 | 1 }[]>();

  const mark = (id: string, cells: number[], sign: 1 | -1) => {
    const list: { cell: number; o: 0 | 1 }[] = sign > 0 ? [] : cellsOf.get(id) ?? [];
    if (sign > 0) {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const prev = cells[i - 1];
        const next = cells[i + 1];
        const horizontal = (prev !== undefined && Math.abs(prev - c) === 1) || (next !== undefined && Math.abs(next - c) === 1);
        const vertical = (prev !== undefined && Math.abs(prev - c) === grid.cw) || (next !== undefined && Math.abs(next - c) === grid.cw);
        if (horizontal) list.push({ cell: c, o: 0 });
        if (vertical) list.push({ cell: c, o: 1 });
      }
      cellsOf.set(id, list);
    }
    for (const { cell, o } of list) (o === 0 ? occH : occV)[cell] += sign;
    if (sign < 0) cellsOf.delete(id);
  };

  const route = (l: RouteLink): { cells: number[]; start: Port; end: Port } | null => {
    const A = byId.get(l.source)!;
    const B = byId.get(l.target)!;
    const starts = ports(grid, A, B, true).filter((p) => !grid.blocked[p.cell]);
    const ends = new Map<number, Port[]>();
    for (const p of ports(grid, B, A, false)) {
      if (grid.blocked[p.cell]) continue;
      const list = ends.get(p.cell) ?? [];
      list.push(p);
      ends.set(p.cell, list);
    }
    const tx = (B.x + B.w / 2) / G;
    const ty = (B.y + B.h / 2) / G;
    const best = new Float64Array(size * 4).fill(Infinity);
    const prev = new Int32Array(size * 4).fill(-1);
    const startOf = new Map<number, Port>();
    const heap = new Heap();
    const step = (cell: number, d: Dir) => {
      const horizontal = d < 2;
      let cost = G;
      if (horizontal ? occH[cell] : occV[cell]) cost += OVERLAP;
      else if (horizontal ? occV[cell] : occH[cell]) cost += CROSS;
      if (horizontal ? grid.hugH[cell] : grid.hugV[cell]) cost += HUG;
      return cost;
    };
    for (const p of starts) {
      const s = p.cell * 4 + p.dir;
      const g = p.pen + step(p.cell, p.dir);
      if (g < best[s]) {
        best[s] = g;
        startOf.set(s, p);
        const cx = p.cell % grid.cw;
        const cy = Math.floor(p.cell / grid.cw);
        heap.push(g + (Math.abs(cx - tx) + Math.abs(cy - ty)) * G, s);
      }
    }
    let found = -1;
    let foundPort: Port | null = null;
    while (heap.size) {
      const [, s] = heap.pop()!;
      const cell = s >> 2;
      const d = (s & 3) as Dir;
      const g = best[s];
      const arrivals = ends.get(cell);
      if (arrivals) {
        const ok = arrivals.find((p) => p.dir === d);
        if (ok) {
          found = s;
          foundPort = ok;
          break;
        }
      }
      const cx = cell % grid.cw;
      const cy = Math.floor(cell / grid.cw);
      for (let nd = 0 as Dir; nd < 4; nd = (nd + 1) as Dir) {
        if ((d ^ 1) === nd && ((d < 2) === (nd < 2))) continue; // no U-turn
        const nx = cx + DX[nd];
        const ny = cy + DY[nd];
        if (nx < 0 || ny < 0 || nx >= grid.cw || ny >= grid.ch) continue;
        const nc = ny * grid.cw + nx;
        if (grid.blocked[nc] && !ends.has(nc)) continue;
        const ng = g + step(nc, nd) + (nd !== d ? BEND : 0);
        const ns = nc * 4 + nd;
        if (ng < best[ns]) {
          best[ns] = ng;
          prev[ns] = s;
          heap.push(ng + (Math.abs(nx - tx) + Math.abs(ny - ty)) * G, ns);
        }
      }
    }
    if (found < 0 || !foundPort) return null;
    const cells: number[] = [];
    let s = found;
    let first = found;
    while (s >= 0) {
      cells.push(s >> 2);
      first = s;
      s = prev[s];
    }
    cells.reverse();
    return { cells, start: startOf.get(first)!, end: foundPort };
  };

  const toRoute = (l: RouteLink, r: { cells: number[]; start: Port; end: Port }): Routed => {
    const pts: Point[] = r.cells.map((c) => [(c % grid.cw) * G, Math.floor(c / grid.cw) * G]);
    const A = byId.get(l.source)!;
    const B = byId.get(l.target)!;
    return { id: l.id, points: compress([snap(pts[0], A, r.start.side), ...pts, snap(pts[pts.length - 1], B, r.end.side)]) };
  };

  const span = (l: RouteLink) => {
    const a = byId.get(l.source)!;
    const b = byId.get(l.target)!;
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };
  const random = rng(7);
  const orders: RouteLink[][] = [[...usable].sort((a, b) => span(a) - span(b)), [...usable].sort((a, b) => span(b) - span(a))];
  for (let t = 2; t < TRIES; t++) orders.push([...usable].map((l) => [random(), l] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]));

  let bestResult: { routes: Routed[]; crossings: Crossing[]; score: number } | null = null;
  for (const order of orders) {
    occH.fill(0);
    occV.fill(0);
    cellsOf.clear();
    const found = new Map<string, { cells: number[]; start: Port; end: Port }>();
    for (const l of order) {
      const r = route(l);
      if (!r) continue;
      found.set(l.id, r);
      mark(l.id, r.cells, 1);
    }
    for (let pass = 0; pass < REROUTE_PASSES; pass++) {
      for (const l of order) {
        if (!found.has(l.id)) continue;
        mark(l.id, [], -1);
        const r = route(l);
        if (r) found.set(l.id, r);
        mark(l.id, found.get(l.id)!.cells, 1);
      }
    }
    const routes = usable.filter((l) => found.has(l.id)).map((l) => toRoute(l, found.get(l.id)!));
    const crossings = findCrossings(routes);
    const length = routes.reduce((sum, r) => sum + pathLength(r.points), 0);
    const bends = routes.reduce((sum, r) => sum + r.points.length - 2, 0);
    const score = crossings.length * 100000 + (usable.length - routes.length) * 1000000 + bends * 40 + length;
    if (!bestResult || score < bestResult.score) bestResult = { routes, crossings, score };
    if (bestResult.crossings.length === 0 && routes.length === usable.length && orders.indexOf(order) >= 1) break;
  }
  return { routes: bestResult!.routes, crossings: bestResult!.crossings };
}

const pathLength = (p: Point[]) => p.slice(1).reduce((sum, q, i) => sum + Math.abs(q[0] - p[i][0]) + Math.abs(q[1] - p[i][1]), 0);

/** Every point where two different connections cross at a right angle. */
export function findCrossings(routes: Routed[]): Crossing[] {
  const segs: { id: string; a: Point; b: Point }[] = [];
  for (const r of routes) for (let i = 0; i < r.points.length - 1; i++) segs.push({ id: r.id, a: r.points[i], b: r.points[i + 1] });
  const out: Crossing[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      if (s.id === t.id) continue;
      const sh = s.a[1] === s.b[1];
      const th = t.a[1] === t.b[1];
      if (sh === th) continue;
      const h = sh ? s : t;
      const v = sh ? t : s;
      const x = v.a[0];
      const y = h.a[1];
      if (x > Math.min(h.a[0], h.b[0]) && x < Math.max(h.a[0], h.b[0]) && y > Math.min(v.a[1], v.b[1]) && y < Math.max(v.a[1], v.b[1])) {
        out.push({ a: h.id, b: v.id, x, y });
      }
    }
  }
  return out;
}

/** Segments of two connections lying on top of each other (should never happen). */
export function findOverlaps(routes: Routed[]): [string, string][] {
  const segs: { id: string; a: Point; b: Point }[] = [];
  for (const r of routes) for (let i = 0; i < r.points.length - 1; i++) segs.push({ id: r.id, a: r.points[i], b: r.points[i + 1] });
  const out: [string, string][] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      if (s.id === t.id) continue;
      const sh = s.a[1] === s.b[1];
      const th = t.a[1] === t.b[1];
      if (sh !== th) continue;
      const k = sh ? 1 : 0;
      const m = sh ? 0 : 1;
      if (s.a[k] !== t.a[k]) continue;
      const lo = Math.max(Math.min(s.a[m], s.b[m]), Math.min(t.a[m], t.b[m]));
      const hi = Math.min(Math.max(s.a[m], s.b[m]), Math.max(t.a[m], t.b[m]));
      if (hi - lo > 1) out.push([s.id, t.id]);
    }
  }
  return out;
}
