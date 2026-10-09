/**
 * Item Definition diagram (spec 24): zones as bands, containers as nested frames, elements as
 * boxes and links as arrows. Laid out by the browser (flex), arrows drawn after layout. No
 * canvas library and no animation.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { Container, Element, Link, ScopeStatus, Stage02Output, Zone } from '@/types/stages';
import { ACTOR_TYPES, EXTERNAL_ZONES } from './words';

type Def = Stage02Output['item_definition'];

interface Props {
  def: Def;
  scope: Map<string, ScopeStatus>;
  selectedId: string | null;
  highlight: Set<string> | null;
  onSelect: (id: string) => void;
}

const LEFT_ZONES = ['internet_external', 'corporate_it'];

export function Diagram({ def, scope, selectedId, highlight, onSelect }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  const register = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) boxes.current.set(id, el);
    else boxes.current.delete(id);
  }, []);

  // Arrows go from edge to edge of the two boxes, along the line between their centres.
  const measure = useCallback(() => {
    const root = frame.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const rect = (id: string) => {
      const el = boxes.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    };
    const next = [];
    for (const l of def.links) {
      const a = rect(l.source_id);
      const b = rect(l.destination_id);
      if (!a || !b) continue;
      const [x1, y1] = edgePoint(a, b);
      const [x2, y2] = edgePoint(b, a);
      next.push({ id: l.link_id, x1, y1, x2, y2 });
    }
    setLines(next);
  }, [def.links]);

  useLayoutEffect(() => {
    measure();
    const root = frame.current;
    if (!root) return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure, def]);

  const elementsIn = (pred: (e: Element) => boolean) => def.elements.filter(pred);
  const zoneOf = new Map(def.zones.map((z) => [z.zone_id, z]));
  const external = def.zones.filter((z) => EXTERNAL_ZONES.has(z.kind));
  const left = external.filter((z) => LEFT_ZONES.includes(z.kind));
  const right = external.filter((z) => !LEFT_ZONES.includes(z.kind));
  const roots = def.containers.filter((c) => !c.parent_id);
  const placed = new Set(def.elements.filter((e) => e.parent_container_id || EXTERNAL_ZONES.has(zoneOf.get(e.zone_id)?.kind || '')).map((e) => e.element_id));
  const orphans = def.elements.filter((e) => !placed.has(e.element_id));

  const box = (e: Element) => (
    <ElementBox
      key={e.element_id}
      element={e}
      status={scope.get(e.element_id)}
      selected={selectedId === e.element_id}
      dimmed={!!highlight && !highlight.has(e.element_id)}
      marked={!!highlight && highlight.has(e.element_id)}
      onSelect={onSelect}
      boxRef={register(e.element_id)}
    />
  );

  const zoneBand = (z: Zone) => (
    <section key={z.zone_id} aria-label={z.name} className="aegis-zone flex min-w-[180px] flex-col gap-2.5 p-3">
      <span className="aegis-label">{z.name}</span>
      {elementsIn((e) => e.zone_id === z.zone_id && !e.parent_container_id).map(box)}
    </section>
  );

  const containerFrame = (c: Container, depth: number): JSX.Element => {
    const kids = def.containers.filter((k) => k.parent_id === c.container_id);
    const els = elementsIn((e) => e.parent_container_id === c.container_id);
    const zoned = !!c.zone_id;
    const style =
      c.kind === 'cluster'
        ? 'border border-dashed border-muted-foreground bg-card/60'
        : zoned
          ? 'aegis-zone'
          : depth === 0
            ? 'border border-foreground bg-card'
            : 'border border-border bg-card';
    const leaf = kids.length === 0;
    const cols = leaf && els.length > 3 ? 'grid-cols-2' : leaf ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]';
    return (
      <section
        key={c.container_id}
        aria-label={c.name}
        className={`flex flex-col gap-2.5 rounded-md p-3 ${style} ${leaf ? 'shrink-0' : 'min-w-[300px] flex-1'}`}
      >
        <span className="aegis-label">{c.name}</span>
        <div className="flex flex-wrap items-start gap-3">
          {kids.map((k) => containerFrame(k, depth + 1))}
          {els.length > 0 && <div className={`grid ${cols} gap-2.5 ${leaf ? '' : 'min-w-[160px] flex-1'}`}>{els.map(box)}</div>}
        </div>
      </section>
    );
  };

  return (
    <div ref={frame} className="relative">
      <div className="flex items-stretch gap-4">
        {left.length > 0 && <div className="flex flex-col gap-4">{left.map(zoneBand)}</div>}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {roots.map((c) => containerFrame(c, 0))}
          {orphans.length > 0 && (
            <section aria-label="Not placed" className="flex flex-col gap-2.5 rounded-md border border-dashed border-border p-3">
              <span className="aegis-label">Not placed in a container</span>
              <div className="flex flex-wrap gap-2.5">{orphans.map(box)}</div>
            </section>
          )}
        </div>
        {right.length > 0 && <div className="flex flex-col gap-4">{right.map(zoneBand)}</div>}
      </div>
      <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" aria-hidden="false" role="group" aria-label="Connections">
        <defs>
          {['line', 'strong', 'mark'].map((k) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={k === 'mark' ? 'fill-signal-ink' : k === 'strong' ? 'fill-primary' : 'fill-muted-foreground'} />
            </marker>
          ))}
        </defs>
        {lines.map((ln) => {
          const link = def.links.find((l) => l.link_id === ln.id) as Link;
          const touches = selectedId && (selectedId === ln.id || link.source_id === selectedId || link.destination_id === selectedId);
          const marked = !!highlight && highlight.has(ln.id);
          const dim = !!highlight && !marked;
          const kind = marked ? 'mark' : touches ? 'strong' : 'line';
          return (
            <g key={ln.id} className={dim ? 'opacity-20' : ''}>
              <line
                x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                className={kind === 'mark' ? 'stroke-signal-ink' : kind === 'strong' ? 'stroke-primary' : 'stroke-muted-foreground/60'}
                strokeWidth={kind === 'line' ? 1.2 : 2}
                markerEnd={`url(#arrow-${kind})`}
                markerStart={link.direction === 'bidirectional' ? `url(#arrow-${kind})` : undefined}
              />
              <line
                x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                stroke="transparent" strokeWidth={10}
                className="pointer-events-auto cursor-pointer"
                onClick={() => onSelect(ln.id)}
              >
                <title>{link.usage_at_destination || 'Connection'}</title>
              </line>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function edgePoint(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): [number, number] {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  const dx = b.x + b.w / 2 - ax, dy = b.y + b.h / 2 - ay;
  if (dx === 0 && dy === 0) return [ax, ay];
  const sx = dx === 0 ? Infinity : (a.w / 2 + 3) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (a.h / 2 + 3) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [ax + dx * s, ay + dy * s];
}

function ElementBox({
  element,
  status,
  selected,
  dimmed,
  marked,
  onSelect,
  boxRef,
}: {
  element: Element;
  status?: ScopeStatus;
  selected: boolean;
  dimmed: boolean;
  marked: boolean;
  onSelect: (id: string) => void;
  boxRef: (el: HTMLElement | null) => void;
}) {
  const actor = ACTOR_TYPES.has(element.asset_type);
  const look = selected
    ? 'aegis-fault'
    : status === 'interface'
      ? 'aegis-interface-mark'
      : status === 'out_of_scope'
        ? 'border border-border bg-muted text-muted-foreground'
        : status === 'ambiguous'
          ? 'border border-dotted border-foreground bg-card'
          : 'border border-foreground bg-card';
  return (
    <button
      ref={boxRef}
      type="button"
      onClick={() => onSelect(element.element_id)}
      aria-pressed={selected}
      className={`relative z-[2] min-h-[40px] px-3 py-2 text-left text-[13px] leading-4 ${actor ? 'rounded-full text-center' : 'rounded-md'} ${look} ${
        marked && !selected ? 'ring-2 ring-signal ring-offset-2' : ''
      } ${dimmed ? 'opacity-30' : ''} hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {element.name}
    </button>
  );
}

export function Legend() {
  const item = (cls: string, label: string) => (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-4 w-7 ${cls}`} aria-hidden="true" />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-5 text-[13px] text-muted-foreground">
      {item('rounded-sm border border-foreground bg-card', 'In scope')}
      {item('rounded-sm aegis-interface-mark', 'Interface (connects to the item, not assessed inside)')}
      {item('rounded-sm border border-border bg-muted', 'Out of scope')}
      {item('rounded-full border border-foreground bg-card', 'People and outside systems')}
      {item('rounded-sm aegis-fault', 'Selected')}
    </div>
  );
}
