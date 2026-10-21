/**
 * Item Definition diagram (D-51, spec 24). Our layout engine (`diagram/`) places zones,
 * containers and components and routes every connection with right-angle lines; React Flow
 * draws the result and handles zoom and pan. A crossing the engine could not avoid is drawn with
 * a small jump.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, BaseEdge, Controls, Handle, Position, ReactFlowProvider, useReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import type { ScopeStatus, Stage02Output } from '@/types/stages';
import type { LayoutBox } from './diagram/layout';
import type { Crossing, Point } from './diagram/route';
import { useDiagramLayout } from './diagram/useDiagramLayout';
import { ACTOR_TYPES } from './words';

type Def = Stage02Output['item_definition'];

const MIN_ZOOM = 0.72;

interface Props {
  def: Def;
  scope: Map<string, ScopeStatus>;
  selectedId: string | null;
  highlight: Set<string> | null;
  onSelect: (id: string) => void;
  /** Changes when the space around the diagram changes, so it fits again. */
  fitKey?: string | number;
}

/** Box look by what the box stands for. Colour marks state only, so zones stay pastel and quiet. */
function boxLook(b: LayoutBox): { cls: string; label: string } {
  if (b.kind === 'internet_external') return { cls: 'bg-state-red border border-state-red-border', label: 'text-state-red-foreground' };
  if (b.kind === 'cloud_account') return { cls: 'bg-card border border-[hsl(47_8%_78%)]', label: 'text-foreground' };
  if (b.kind === 'vpc') return { cls: 'border border-[hsl(47_8%_78%)]', label: 'text-foreground' };
  if (b.kind === 'cluster') return { cls: 'border-[1.25px] border-dashed border-[hsl(122_17%_67%)] bg-card/60', label: 'text-state-green-foreground' };
  if (b.kind === 'subnet' && b.zoneKind?.includes('public')) return { cls: 'bg-state-yellow border border-state-yellow-border', label: 'text-state-yellow-foreground' };
  if (b.kind === 'subnet') return { cls: 'bg-state-green border border-state-green-border', label: 'text-state-green-foreground' };
  if (b.kind.includes('managed')) return { cls: 'bg-state-blue border border-state-blue-border', label: 'text-state-blue-foreground' };
  if (b.kind === 'none') return { cls: 'border border-dashed border-border', label: 'text-muted-foreground' };
  return { cls: 'bg-state-grey border border-border', label: 'text-state-grey-foreground' };
}

type BoxData = { box: LayoutBox };
const BoxNode = memo(({ data }: NodeProps<BoxData>) => {
  const { box } = data;
  const look = boxLook(box);
  return (
    <div className={cn('pointer-events-none relative h-full w-full rounded-[12px]', look.cls)} style={{ width: box.w, height: box.h }}>
      <span title={box.label} className={cn('aegis-label absolute left-3 right-3 top-2.5 truncate whitespace-nowrap text-[10px]', look.label)}>
        {box.label}
      </span>
    </div>
  );
});
BoxNode.displayName = 'BoxNode';

type ElementData = {
  name: string;
  actor: boolean;
  status?: ScopeStatus;
  exposed: boolean;
  selected: boolean;
  marked: boolean;
  dimmed: boolean;
  onSelect: () => void;
  w: number;
  h: number;
};
const handle = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, top: '50%', left: '50%' } as const;
const ElementNode = memo(({ data }: NodeProps<ElementData>) => {
  const look = data.selected
    ? 'bg-foreground text-primary-foreground shadow-[4px_4px_0_hsl(var(--state-blue-foreground))] font-medium'
    : data.marked
      ? 'bg-state-yellow text-[hsl(var(--aegis-decide-text))] shadow-[0_0_0_2px_hsl(var(--state-yellow-foreground))] font-medium'
      : data.status === 'interface'
        ? 'bg-card/70 text-foreground/90 outline-dashed outline-[1.25px] -outline-offset-[1.25px] outline-[hsl(var(--aegis-interface))]'
        : data.status === 'out_of_scope'
          ? 'bg-state-grey text-muted-foreground'
          : data.status === 'ambiguous'
            ? 'bg-card text-foreground outline-dotted outline-[1.5px] -outline-offset-[1.5px] outline-foreground'
            : 'bg-card text-foreground shadow-[0_0_0_1px_hsl(47_6%_80%),0_2px_4px_-2px_hsl(40_6%_10%/0.12)]';
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={handle} />
      <button
        type="button"
        aria-pressed={data.selected}
        onClick={data.onSelect}
        style={{ width: data.w, height: data.h }}
        className={cn(
          'nodrag flex items-center gap-1.5 px-2.5 text-left text-[12.5px] leading-tight transition-[opacity,box-shadow,background-color,transform] duration-300 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          data.actor ? 'justify-center rounded-full text-center' : 'rounded-[10px]',
          look,
          data.dimmed && 'opacity-30',
        )}
      >
        <span className="min-w-0 flex-1">{data.name}</span>
        {data.exposed && <span title="Reachable from the internet" className={cn('h-[7px] w-[7px] shrink-0 rounded-full', data.selected ? 'bg-[hsl(2_77%_83%)]' : 'bg-state-red-foreground')} />}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} style={handle} />
    </>
  );
});
ElementNode.displayName = 'ElementNode';

/** Rounded right-angle path through the points, with a small jump at each listed crossing. */
function pathOf(points: Point[], jumps: Point[]): string {
  const R = 6;
  const J = 5;
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const last = i === points.length - 1;
    const next = points[i + 1];
    const len = Math.abs(x - px) + Math.abs(y - py);
    const r = last ? 0 : Math.min(R, len / 2, (Math.abs(next[0] - x) + Math.abs(next[1] - y)) / 2);
    const ux = Math.sign(x - px);
    const uy = Math.sign(y - py);
    if (uy === 0) {
      // Horizontal run: jump over crossings in the order they are met.
      const hops = jumps.filter(([jx, jy]) => jy === y && (jx - px) * ux > J && (x - jx) * ux > J + r).sort((a, b) => (a[0] - b[0]) * ux);
      for (const [jx] of hops) d += ` L${jx - ux * J} ${y} A${J} ${J} 0 0 ${ux > 0 ? 1 : 0} ${jx + ux * J} ${y}`;
    }
    d += ` L${x - ux * r} ${y - uy * r}`;
    if (!last && r > 0) d += ` Q${x} ${y} ${x + Math.sign(next[0] - x) * r} ${y + Math.sign(next[1] - y) * r}`;
  }
  return d;
}

type RoutedData = { points: Point[]; jumps: Point[]; tone: 'grey' | 'blue' | 'amber'; dim: boolean; label: string; bidirectional: boolean; onSelect: () => void };
const TONE = { grey: '#A3A29D', blue: 'hsl(var(--state-blue-foreground))', amber: 'hsl(var(--state-yellow-foreground))' };
const RoutedEdge = memo(({ id, data }: EdgeProps<RoutedData>) => {
  if (!data) return null;
  const d = pathOf(data.points, data.jumps);
  const strong = data.tone !== 'grey';
  return (
    <g style={{ opacity: data.dim ? 0.15 : 1, transition: 'opacity .3s cubic-bezier(.16,1,.3,1)' }}>
      <BaseEdge
        id={id}
        path={d}
        markerEnd={`url(#arrow-${data.tone})`}
        markerStart={data.bidirectional ? `url(#arrow-start-${data.tone})` : undefined}
        style={{ stroke: TONE[data.tone], strokeWidth: strong ? 2 : 1.25, strokeLinejoin: 'round', fill: 'none' }}
      />
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} className="cursor-pointer" onClick={data.onSelect}>
        <title>{data.label}</title>
      </path>
    </g>
  );
});
RoutedEdge.displayName = 'RoutedEdge';

const nodeTypes = { box: BoxNode, element: ElementNode };
const edgeTypes = { routed: RoutedEdge };

function Markers() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        {(Object.keys(TONE) as (keyof typeof TONE)[]).map((t) => (
          <g key={t}>
            <marker id={`arrow-${t}`} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0.5 L8 4 L0 7.5 z" fill={t === 'grey' ? '#8E8D89' : TONE[t]} />
            </marker>
            <marker id={`arrow-start-${t}`} viewBox="0 0 8 8" refX="0" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M8 0.5 L0 4 L8 7.5 z" fill={t === 'grey' ? '#8E8D89' : TONE[t]} />
            </marker>
          </g>
        ))}
      </defs>
    </svg>
  );
}

export function Diagram(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramCanvas {...props} />
    </ReactFlowProvider>
  );
}

function DiagramCanvas({ def, scope, selectedId, highlight, onSelect, fitKey }: Props) {
  const state = useDiagramLayout(def);
  const flow = useReactFlow();
  const frame = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const result = state.status === 'ready' ? state.result : null;
  const elementById = useMemo(() => new Map(def.elements.map((e) => [e.element_id, e])), [def]);
  const linkById = useMemo(() => new Map(def.links.map((l) => [l.link_id, l])), [def]);

  const nodes = useMemo<Node[]>(() => {
    if (!result) return [];
    const boxes: Node[] = result.layout.boxes.map((b) => ({
      id: `box:${b.id}`,
      type: 'box',
      position: { x: b.x, y: b.y },
      data: { box: b },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -10 + b.depth,
      style: { width: b.w, height: b.h },
    }));
    const elements: Node[] = result.layout.nodes.map((n) => {
      const e = elementById.get(n.id)!;
      const marked = !!highlight && highlight.has(n.id);
      return {
        id: n.id,
        type: 'element',
        position: { x: n.x, y: n.y },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: 10,
        data: {
          name: e.name,
          actor: ACTOR_TYPES.has(e.asset_type),
          status: scope.get(n.id),
          exposed: e.internet_exposed?.value === 'yes',
          selected: selectedId === n.id,
          marked,
          dimmed: (!!highlight && !marked) || (!!selectedId && selectedId !== n.id && !touches(selectedId, n.id, def)),
          onSelect: () => onSelect(n.id),
          w: n.w,
          h: n.h,
        } satisfies ElementData,
      };
    });
    return [...boxes, ...elements];
  }, [result, elementById, highlight, scope, selectedId, onSelect, def]);

  const edges = useMemo<Edge[]>(() => {
    if (!result) return [];
    const jumpsFor = (id: string): Point[] => result.crossings.filter((c: Crossing) => c.a === id).map((c) => [c.x, c.y] as Point);
    return result.routes.map((r) => {
      const l = linkById.get(r.id)!;
      const from = elementById.get(l.source_id)?.name ?? l.source_id;
      const to = elementById.get(l.destination_id)?.name ?? l.destination_id;
      const touched = !!selectedId && (selectedId === r.id || l.source_id === selectedId || l.destination_id === selectedId);
      const marked = !!highlight && highlight.has(r.id);
      const tone: RoutedData['tone'] = marked ? 'amber' : touched ? 'blue' : 'grey';
      return {
        id: r.id,
        source: l.source_id,
        target: l.destination_id,
        type: 'routed',
        zIndex: tone === 'grey' ? 1 : 2,
        data: {
          points: r.points,
          jumps: jumpsFor(r.id),
          tone,
          dim: (!!highlight && !marked) || (!!selectedId && !touched),
          label: `${r.id}: ${from} to ${to}`,
          bidirectional: l.direction === 'bidirectional',
          onSelect: () => onSelect(r.id),
        } satisfies RoutedData,
      };
    });
  }, [result, linkById, elementById, selectedId, highlight, onSelect]);

  // Fit the whole diagram whenever it is laid out or the space around it changes.
  useEffect(() => {
    if (!result) return;
    // Names stay readable: never shrink below MIN_ZOOM. A wider diagram starts at its left edge
    // and pans; a narrower one is centred.
    const t = window.setTimeout(() => {
      const { width: w } = result.layout;
      const z = Math.max(MIN_ZOOM, Math.min(1, (frameWidth || 1) / w));
      const x = w * z <= frameWidth ? (frameWidth - w * z) / 2 : 0;
      flow.setViewport({ x, y: 4, zoom: z }, { duration: 300 });
    }, 30);
    return () => window.clearTimeout(t);
  }, [result, frameWidth, fitKey, flow]);

  const zoom = result ? Math.max(MIN_ZOOM, Math.min(1, (frameWidth || 1) / result.layout.width)) : 1;
  const height = result ? Math.min(Math.max(420, result.layout.height * zoom + 8), 900) : 480;

  return (
    <div ref={frame} className="relative w-full" style={{ height }}>
      <Markers />
      {state.status === 'working' && (
        <div className="absolute inset-0 flex flex-col gap-3 p-6" aria-live="polite">
          <span className="text-[13px] text-muted-foreground">Laying out the item definition</span>
          <span className="h-24 w-1/3 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <span className="h-40 w-2/3 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
      )}
      {state.status === 'failed' && <p className="m-0 p-6 text-state-red-foreground">{state.message}</p>}
      {result && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch
          panOnDrag
          preventScrolling={false}
          minZoom={0.2}
          maxZoom={1.6}
          onNodeClick={(_, node) => node.type === 'element' && onSelect(node.id)}
          onEdgeClick={(_, edge) => onSelect(edge.id)}
          proOptions={{ hideAttribution: true }}
          aria-label="Item definition diagram"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(28,27,25,.09)" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      )}
    </div>
  );
}

/** Whether an element is one end of the selected connection or connected to the selected element. */
function touches(selectedId: string, elementId: string, def: Def): boolean {
  return def.links.some(
    (l) =>
      (l.link_id === selectedId && (l.source_id === elementId || l.destination_id === elementId)) ||
      (l.source_id === selectedId && l.destination_id === elementId) ||
      (l.destination_id === selectedId && l.source_id === elementId),
  );
}

export function Legend() {
  const item = (cls: string, label: string) => (
    <span className="inline-flex items-center gap-2">
      <span className={cn('inline-block h-[13px] w-6', cls)} aria-hidden="true" />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[12.5px] text-[#4A4946]">
      {item('rounded border border-[hsl(47_6%_80%)] bg-card', 'In scope')}
      {item('rounded border-[1.25px] border-dashed border-[hsl(var(--aegis-interface))] bg-card/60', 'Interface')}
      {item('rounded bg-state-grey', 'Out of scope')}
      {item('rounded-full border border-[hsl(47_6%_80%)] bg-card', 'People and outside systems')}
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-state-red-foreground" aria-hidden="true" />
        Reachable from the internet
      </span>
    </div>
  );
}
