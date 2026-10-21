/**
 * Runs the layout and the router together and keeps the result with fewest crossings
 * (D-51, spec 24). Pure; used by the worker and by the tests.
 */

import { layoutItemDefinition, type Layout, type LayoutInput } from './layout.ts';
import { routeConnections, type Crossing, type Routed } from './route.ts';

export interface DiagramResult {
  layout: Layout;
  routes: Routed[];
  crossings: Crossing[];
}

export function buildDiagram(input: LayoutInput, externalZoneKinds: string[], measure?: Record<string, number>): DiagramResult {
  const layout = layoutItemDefinition(input, {
    externalZoneKinds: new Set(externalZoneKinds),
    measure: measure ? (e) => measure[e.element_id] ?? 120 : undefined,
    alternatives: 3,
  });
  const links = input.links.map((l) => ({ id: l.link_id, source: l.source_id, target: l.destination_id }));
  let best: DiagramResult | null = null;
  for (const candidate of [layout, ...(layout.alternatives ?? [])]) {
    const { routes, crossings } = routeConnections(candidate.width, candidate.height, candidate.nodes, candidate.boxes, links);
    if (!best || crossings.length < best.crossings.length) best = { layout: { ...candidate, alternatives: undefined }, routes, crossings };
    if (best.crossings.length === 0) break;
  }
  return best!;
}
