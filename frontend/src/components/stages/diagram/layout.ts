/**
 * Item Definition layout engine (D-51, spec 24). Pure functions, no imports at run time, so the
 * same code runs in the browser and in `node --test`.
 *
 * Rules, all taken from the data:
 *   1. Columns follow the data flow: each component's column is the longest connection path
 *      leading to it. Components with no incoming connection sit just left of their first target.
 *      Outside parties that only send sit in the first column and inside components start after
 *      it; outside parties that only receive sit after the last inside column. A connection
 *      between two outside parties does not move either of them. Components with no connection
 *      at all take the middle column of the box they sit in.
 *   2. Boxes are the zones and containers of the item definition, nested as in the data.
 *   3. A box is drawn in parts when its components fall in columns separated by a gap of
 *      `splitGap` columns or more (for example entry services and back-end services of the same
 *      zone). Every part keeps the box's name.
 *   4. Inside each box, components and inner boxes are packed column by column, and ordered to
 *      sit near what they connect to (repeated barycentre passes), which keeps crossings down.
 *   5. Column gaps are wide enough for the box borders that meet there and for the connections
 *      that run between the columns.
 */

import type { Container, Element, Link, Zone } from '../../../types/stages.ts';

export interface LayoutInput {
  zones: Zone[];
  containers: Container[];
  elements: Element[];
  links: Link[];
}

export interface LayoutOptions {
  /** Zone kinds drawn as outside areas (people, corporate IT, third parties). */
  externalZoneKinds: Set<string>;
  /** Width in pixels a component needs for its name. */
  measure?: (element: Element) => number;
  splitGap?: number;
  nodeHeight?: number;
  /** How many orderings to return in total (best first). */
  alternatives?: number;
}

export interface LayoutBox {
  id: string;
  /** Zone or container id the box stands for. */
  source: string;
  label: string;
  /** Zone kind for outside areas, container kind for containers, `none` for components not placed. */
  kind: string;
  zoneKind?: string;
  part: number;
  parts: number;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutNode {
  id: string;
  column: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  width: number;
  height: number;
  boxes: LayoutBox[];
  nodes: LayoutNode[];
  /** Column of each component, kept for the router and for tests. */
  columns: Map<string, number>;
  /** Next-best orderings, for the caller to try with the router. */
  alternatives?: Layout[];
}

const PAD_X = 14;
const PAD_TOP = 34;
const PAD_BOTTOM = 14;
const GAP_Y = 16;
const BOX_GAP_Y = 20;
const LANE = 8;
const MARGIN = 40;
const PASSES = 24;
const LABEL_CHAR = 7.4;

/** Rule 1: the column of every component. */
export function columnsOf(input: LayoutInput, isOutside: (e: Element) => boolean = () => false): Map<string, number> {
  const ids = input.elements.map((e) => e.element_id);
  const outside = new Set(input.elements.filter(isOutside).map((e) => e.element_id));
  const known = new Set(ids);
  const links = input.links.filter(
    (l) => known.has(l.source_id) && known.has(l.destination_id) && l.source_id !== l.destination_id && !(outside.has(l.source_id) && outside.has(l.destination_id)),
  );
  const first = outside.size && outside.size < ids.length ? 1 : 0;
  const floor = (v: string) => (outside.has(v) ? 0 : first);
  const out = new Map(ids.map((i) => [i, [] as string[]]));
  const inc = new Map(ids.map((i) => [i, [] as string[]]));

  // Drop the links that close a cycle (depth-first back edges), in data order so the result is stable.
  const state = new Map<string, number>();
  const visit = (v: string) => {
    state.set(v, 1);
    for (const l of links) {
      if (l.source_id !== v) continue;
      const w = l.destination_id;
      if (state.get(w) === 1) continue;
      out.get(v)!.push(w);
      inc.get(w)!.push(v);
      if (!state.get(w)) visit(w);
    }
    state.set(v, 2);
  };
  for (const i of ids) if (!state.get(i)) visit(i);

  const order: string[] = [];
  const seen = new Set<string>();
  const topo = (v: string) => {
    if (seen.has(v)) return;
    seen.add(v);
    for (const p of inc.get(v)!) topo(p);
    order.push(v);
  };
  ids.forEach(topo);

  const col = new Map<string, number>();
  for (const v of order) col.set(v, Math.max(floor(v), ...inc.get(v)!.map((p) => col.get(p)! + 1)));
  // Sources sit just left of their earliest target.
  for (const v of [...order].reverse()) {
    if (!inc.get(v)!.length && out.get(v)!.length) col.set(v, Math.max(floor(v), Math.min(...out.get(v)!.map((w) => col.get(w)!)) - 1));
  }
  // Outside parties that only receive from inside sit after the last inside column.
  const insideMax = Math.max(0, ...ids.filter((i) => !outside.has(i) && col.has(i)).map((i) => col.get(i)!));
  for (const v of ids) {
    if (outside.has(v) && inc.get(v)!.length && !out.get(v)!.length && inc.get(v)!.every((p) => !outside.has(p))) col.set(v, insideMax + 1);
  }

  const linked = new Set(links.flatMap((l) => [l.source_id, l.destination_id]));
  for (const id of ids) if (!linked.has(id)) col.delete(id);
  return col;
}

interface Region {
  source: string;
  label: string;
  kind: string;
  zoneKind?: string;
  elements: Element[];
  children: Region[];
}

function regionsOf(input: LayoutInput, externalZoneKinds: Set<string>): Region[] {
  const zoneKind = new Map(input.zones.map((z) => [z.zone_id, z.kind]));
  const containerIds = new Set(input.containers.map((c) => c.container_id));
  const build = (c: Container): Region => ({
    source: c.container_id,
    label: c.name,
    kind: c.kind,
    zoneKind: c.zone_id ? zoneKind.get(c.zone_id) : undefined,
    elements: input.elements.filter((e) => e.parent_container_id === c.container_id),
    children: input.containers.filter((k) => k.parent_id === c.container_id).map(build),
  });
  const top: Region[] = [];
  for (const z of input.zones) {
    if (!externalZoneKinds.has(z.kind)) continue;
    const els = input.elements.filter((e) => e.zone_id === z.zone_id && !(e.parent_container_id && containerIds.has(e.parent_container_id)));
    if (els.length) top.push({ source: z.zone_id, label: z.name, kind: z.kind, zoneKind: z.kind, elements: els, children: [] });
  }
  for (const c of input.containers) if (!c.parent_id || !containerIds.has(c.parent_id)) top.push(build(c));
  const placed = new Set(top.flatMap(function all(r: Region): string[] {
    return [...r.elements.map((e) => e.element_id), ...r.children.flatMap(all)];
  }));
  const loose = input.elements.filter((e) => !placed.has(e.element_id));
  if (loose.length) top.push({ source: 'none', label: 'Not placed', kind: 'none', elements: loose, children: [] });
  return top;
}

const deepElements = (r: Region): Element[] => [...r.elements, ...r.children.flatMap(deepElements)];
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

/** Rule 1, last part: components without connections take the middle column of their box. */
function fillColumns(regions: Region[], col: Map<string, number>, fallback = 0) {
  for (const r of regions) {
    const known = deepElements(r).map((e) => col.get(e.element_id)).filter((c): c is number => c !== undefined);
    const mid = known.length ? median(known) : fallback;
    fillColumns(r.children, col, mid);
    for (const e of r.elements) if (!col.has(e.element_id)) col.set(e.element_id, mid);
  }
}

/** A box part, or a component, packed inside its parent. */
type Item =
  | { type: 'node'; el: Element; lo: number; hi: number }
  | { type: 'box'; region: Region; part: number; parts: number; lo: number; hi: number; items: Item[] };

/** Rule 3: the column ranges a region is drawn in. */
function partsOf(r: Region, col: Map<string, number>, gap: number): [number, number][] {
  const cols = [...new Set(deepElements(r).map((e) => col.get(e.element_id)!))].sort((a, b) => a - b);
  if (!cols.length) return [[0, 0]];
  const ranges: [number, number][] = [[cols[0], cols[0]]];
  for (const c of cols.slice(1)) {
    const last = ranges[ranges.length - 1];
    if (c - last[1] >= gap) ranges.push([c, c]);
    else last[1] = c;
  }
  return ranges;
}

function itemsOf(regions: Region[], elements: Element[], col: Map<string, number>, gap: number, within: [number, number] | null): Item[] {
  const inRange = (c: number) => !within || (c >= within[0] && c <= within[1]);
  const items: Item[] = [];
  for (const e of elements) {
    const c = col.get(e.element_id)!;
    if (inRange(c)) items.push({ type: 'node', el: e, lo: c, hi: c });
  }
  for (const r of regions) {
    const ranges = partsOf(r, col, gap).filter(([lo, hi]) => !within || (lo >= within[0] && hi <= within[1]));
    ranges.forEach(([lo, hi], i) => {
      const inner = itemsOf(r.children, r.elements, col, gap, [lo, hi]);
      if (inner.length) items.push({ type: 'box', region: r, part: i, parts: ranges.length, lo, hi, items: inner });
    });
  }
  return items;
}

const itemElements = (it: Item): Element[] => (it.type === 'node' ? [it.el] : it.items.flatMap(itemElements));

/** Lays out the item definition. Deterministic: the same input gives the same picture. */
export function layoutItemDefinition(input: LayoutInput, options: LayoutOptions): Layout {
  const splitGap = options.splitGap ?? 2;
  const nodeH = options.nodeHeight ?? 36;
  const measure = options.measure ?? ((e: Element) => Math.max(112, Math.round(e.name.length * 6.6 + 28 + (e.internet_exposed?.value === 'yes' ? 14 : 0))));

  const zoneKind = new Map(input.zones.map((z) => [z.zone_id, z.kind]));
  const containerIds = new Set(input.containers.map((c) => c.container_id));
  const isOutside = (e: Element) => options.externalZoneKinds.has(zoneKind.get(e.zone_id) ?? '') && !(e.parent_container_id && containerIds.has(e.parent_container_id));
  const col = columnsOf(input, isOutside);
  const regions = regionsOf(input, options.externalZoneKinds);
  fillColumns(regions, col);
  // Close up empty columns so numbering is dense.
  const used = [...new Set(col.values())].sort((a, b) => a - b);
  const dense = new Map(used.map((c, i) => [c, i]));
  for (const [k, v] of col) col.set(k, dense.get(v)!);
  const nCols = used.length || 1;

  const roots = itemsOf(regions, [], col, splitGap, null);
  const widths = new Map(input.elements.map((e) => [e.element_id, measure(e)]));
  const colW = Array.from({ length: nCols }, (_, c) => Math.max(0, ...input.elements.filter((e) => col.get(e.element_id) === c).map((e) => widths.get(e.element_id)!)));
  // A box that sits in one column must be wide enough for its label (10 px mono capitals).
  const labelFit = (items: Item[]) => {
    for (const it of items) {
      if (it.type !== 'box') continue;
      if (it.lo === it.hi) colW[it.lo] = Math.max(colW[it.lo], Math.ceil(it.region.label.length * LABEL_CHAR + 24 - 2 * PAD_X));
      labelFit(it.items);
    }
  };
  labelFit(roots);

  // Rule 5: how many box borders meet at each column edge.
  const leftNest = new Array(nCols).fill(0);
  const rightNest = new Array(nCols).fill(0);
  const nest = (items: Item[]): { l: Map<number, number>; r: Map<number, number> } => {
    const l = new Map<number, number>();
    const r = new Map<number, number>();
    for (const it of items) {
      if (it.type !== 'box') continue;
      const inner = nest(it.items);
      const li = 1 + (inner.l.get(it.lo) ?? 0);
      const ri = 1 + (inner.r.get(it.hi) ?? 0);
      l.set(it.lo, Math.max(l.get(it.lo) ?? 0, li));
      r.set(it.hi, Math.max(r.get(it.hi) ?? 0, ri));
      for (const [c, n] of inner.l) if (c !== it.lo) l.set(c, Math.max(l.get(c) ?? 0, n));
      for (const [c, n] of inner.r) if (c !== it.hi) r.set(c, Math.max(r.get(c) ?? 0, n));
      (it as Item & { nl?: number; nr?: number }).nl = li;
      (it as Item & { nl?: number; nr?: number }).nr = ri;
    }
    return { l, r };
  };
  const top = nest(roots);
  for (const [c, n] of top.l) leftNest[c] = Math.max(leftNest[c], n);
  for (const [c, n] of top.r) rightNest[c] = Math.max(rightNest[c], n);

  // Connections that run between two columns need lanes there.
  const lanes = new Array(nCols).fill(0);
  for (const l of input.links) {
    const a = col.get(l.source_id);
    const b = col.get(l.destination_id);
    if (a === undefined || b === undefined) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (lo === hi) lanes[lo] += 1;
    for (let c = lo; c < hi; c++) lanes[c] += 1;
  }
  const colX: number[] = [];
  let x = MARGIN + PAD_X * leftNest[0];
  for (let c = 0; c < nCols; c++) {
    colX.push(x);
    if (c < nCols - 1) x += colW[c] + PAD_X * (rightNest[c] + leftNest[c + 1]) + Math.max(32, Math.ceil(lanes[c] * 0.6) * LANE + 16);
  }
  const width = colX[nCols - 1] + colW[nCols - 1] + PAD_X * rightNest[nCols - 1] + MARGIN;

  // Rule 4: pack every box column by column; order items by where their connections are.
  const neighbours = new Map<string, string[]>(input.elements.map((e) => [e.element_id, []]));
  for (const l of input.links) {
    neighbours.get(l.source_id)?.push(l.destination_id);
    neighbours.get(l.destination_id)?.push(l.source_id);
  }
  const yOf = new Map<string, number>();
  // Sweep direction for the ordering passes: neighbours on both sides, then left only, then right only.
  let side: 'both' | 'left' | 'right' = 'both';
  // The current order of every item list; the sweeps set it, the exchange step refines it.
  const orderOf = new Map<Item[], Item[]>();
  const pack = (items: Item[], keyed: boolean): { height: number; place: (dy: number, depth: number, sink: { boxes: LayoutBox[]; nodes: LayoutNode[] }) => void } => {
    const current = orderOf.get(items) ?? items;
    const sized = current.map((it, index) => {
      if (it.type === 'node') return { it, index, h: nodeH, inner: null as ReturnType<typeof pack> | null };
      const inner = pack(it.items, keyed);
      return { it, index, h: PAD_TOP + inner.height + PAD_BOTTOM, inner };
    });
    if (keyed) {
      const key = (it: Item) => {
        const ys = itemElements(it).flatMap((e) =>
          neighbours
            .get(e.element_id)!
            .filter((n) => side === 'both' || (side === 'left' ? col.get(n)! < col.get(e.element_id)! : col.get(n)! > col.get(e.element_id)!))
            .map((n) => yOf.get(n))
            .filter((v): v is number => v !== undefined),
        );
        const own = itemElements(it).map((e) => yOf.get(e.element_id) ?? 0);
        return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : own.reduce((a, b) => a + b, 0) / Math.max(1, own.length);
      };
      const keys = new Map(sized.map((s) => [s, key(s.it)]));
      sized.sort((a, b) => keys.get(a)! - keys.get(b)! || a.index - b.index);
      orderOf.set(items, sized.map((x) => x.it));
    }
    const sky = new Map<number, number>();
    const rel: { s: (typeof sized)[number]; y: number }[] = [];
    for (const s of sized) {
      let y = 0;
      for (let c = s.it.lo; c <= s.it.hi; c++) y = Math.max(y, sky.get(c) ?? 0);
      rel.push({ s, y });
      const gap = s.it.type === 'box' ? BOX_GAP_Y : GAP_Y;
      for (let c = s.it.lo; c <= s.it.hi; c++) sky.set(c, y + s.h + gap);
    }
    const height = Math.max(0, ...rel.map((r) => r.y + r.s.h));
    return {
      height,
      place: (dy, depth, sink) => {
        for (const { s, y } of rel) {
          const top = dy + y;
          if (s.it.type === 'node') {
            const e = s.it.el;
            const w = widths.get(e.element_id)!;
            const cx = colX[s.it.lo] + (colW[s.it.lo] - w) / 2;
            sink.nodes.push({ id: e.element_id, column: s.it.lo, x: Math.round(cx), y: Math.round(top), w, h: nodeH });
          } else {
            const it = s.it as Item & { nl?: number; nr?: number };
            const x0 = colX[it.lo] - PAD_X * (it.nl ?? 1);
            const x1 = colX[it.hi] + colW[it.hi] + PAD_X * (it.nr ?? 1);
            const r = (it as Extract<Item, { type: 'box' }>).region;
            sink.boxes.push({
              id: `${r.source}#${(it as Extract<Item, { type: 'box' }>).part}`,
              source: r.source,
              label: r.label,
              kind: r.kind,
              zoneKind: r.zoneKind,
              part: (it as Extract<Item, { type: 'box' }>).part,
              parts: (it as Extract<Item, { type: 'box' }>).parts,
              depth,
              x: Math.round(x0),
              y: Math.round(top),
              w: Math.round(x1 - x0),
              h: Math.round(s.h),
            });
            s.inner!.place(top + PAD_TOP, depth + 1, sink);
          }
        }
      },
    };
  };

  const candidates: { boxes: LayoutBox[]; nodes: LayoutNode[]; height: number; score: number; sig: string }[] = [];
  for (let pass = 0; pass <= PASSES; pass++) {
    side = pass === 0 ? 'both' : (['both', 'left', 'right'] as const)[pass % 3];
    const packed = pack(roots, pass > 0);
    const sink = { boxes: [] as LayoutBox[], nodes: [] as LayoutNode[] };
    packed.place(MARGIN, 0, sink);
    for (const n of sink.nodes) yOf.set(n.id, n.y + n.h / 2);
    const sig = sink.nodes.map((n) => `${n.id}:${n.y}`).join('|');
    if (candidates.some((c) => c.sig === sig)) continue;
    const score = straightCrossings(sink.nodes, input.links) * 1000 + packed.height;
    candidates.push({ ...sink, height: packed.height, score, sig });
  }
  // Exchange step: starting from the best sweep, swap neighbours inside each list while that
  // removes crossings (cheap estimate), until nothing improves.
  if (candidates.length) {
    const lists: Item[][] = [];
    const collect = (items: Item[]) => {
      lists.push(items);
      for (const it of items) if (it.type === 'box') collect(it.items);
    };
    collect(roots);
    const best0 = candidates.reduce((a, b) => (b.score < a.score ? b : a));
    const yAt = new Map(best0.nodes.map((n) => [n.id, n.y]));
    const itemY = (it: Item) => Math.min(...itemElements(it).map((e) => yAt.get(e.element_id) ?? 0));
    for (const list of lists) orderOf.set(list, [...list].sort((a, b) => itemY(a) - itemY(b)));
    const evaluate = () => {
      const packed = pack(roots, false);
      const sink = { boxes: [] as LayoutBox[], nodes: [] as LayoutNode[] };
      packed.place(MARGIN, 0, sink);
      return { ...sink, height: packed.height, score: straightCrossings(sink.nodes, input.links) * 1000 + packed.height };
    };
    let current = evaluate();
    for (let round = 0; round < 6; round++) {
      let improved = false;
      for (const list of lists) {
        const order = orderOf.get(list)!;
        for (let i = 0; i < order.length - 1; i++) {
          [order[i], order[i + 1]] = [order[i + 1], order[i]];
          const next = evaluate();
          if (next.score < current.score) {
            current = next;
            improved = true;
          } else [order[i], order[i + 1]] = [order[i + 1], order[i]];
        }
      }
      if (!improved) break;
    }
    const sig = current.nodes.map((n) => `${n.id}:${n.y}`).join('|');
    if (!candidates.some((c) => c.sig === sig)) candidates.push({ ...current, sig });
  }
  candidates.sort((a, b) => a.score - b.score);
  const shape = (c: (typeof candidates)[number]): Layout => ({ width: Math.round(width), height: Math.round(c.height + MARGIN * 2), boxes: c.boxes, nodes: c.nodes, columns: col });
  return { ...shape(candidates[0]), alternatives: candidates.slice(1, options.alternatives ?? 3).map(shape) };
}

/** Cheap crossing estimate used while ordering: straight lines between centres. */
function straightCrossings(nodes: LayoutNode[], links: Link[]): number {
  const at = new Map(nodes.map((n) => [n.id, [n.x + n.w / 2, n.y + n.h / 2] as const]));
  const segs = links.map((l) => [at.get(l.source_id), at.get(l.destination_id), l] as const).filter((s) => s[0] && s[1]);
  let count = 0;
  const cross = (p: readonly number[], q: readonly number[], r: readonly number[], s: readonly number[]) => {
    const d = (a: readonly number[], b: readonly number[], c: readonly number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
  };
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [a, b, l1] = segs[i];
      const [c, d, l2] = segs[j];
      if ([l1.source_id, l1.destination_id].some((id) => id === l2.source_id || id === l2.destination_id)) continue;
      if (cross(a!, b!, c!, d!)) count++;
    }
  }
  return count;
}
