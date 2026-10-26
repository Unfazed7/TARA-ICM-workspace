/** Lays out the Item Definition in a Web Worker and returns the result (D-51). */

import { useEffect, useState } from 'react';
import type { Stage02Output } from '@/types/stages';
import type { DiagramResult } from './engine';
import { EXTERNAL_ZONES } from '../words';

type Def = Stage02Output['item_definition'];
type State = { status: 'working' } | { status: 'ready'; result: DiagramResult } | { status: 'failed'; message: string };

let nextId = 0;
const cache = new WeakMap<Def, DiagramResult>();

/** Width each component needs for its name, measured with the page font. */
function measureNames(def: Def): Record<string, number> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = getComputedStyle(document.body).getPropertyValue('--font-sans') || 'sans-serif';
  if (ctx) ctx.font = `12.5px ${font}`;
  const out: Record<string, number> = {};
  for (const e of def.elements) {
    const text = ctx ? ctx.measureText(e.name).width : e.name.length * 6.6;
    out[e.element_id] = Math.max(112, Math.ceil(text + 30 + (e.internet_exposed?.value === 'yes' ? 14 : 0)));
  }
  return out;
}

export function useDiagramLayout(def: Def): State {
  const [state, setState] = useState<State>(() => (cache.has(def) ? { status: 'ready', result: cache.get(def)! } : { status: 'working' }));

  useEffect(() => {
    const cached = cache.get(def);
    if (cached) {
      setState({ status: 'ready', result: cached });
      return;
    }
    setState({ status: 'working' });
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const id = ++nextId;
    worker.onmessage = (event) => {
      if (event.data.id !== id) return;
      if (event.data.error) {
        setState({ status: 'failed', message: event.data.error });
      } else {
        const raw = event.data.result;
        const result: DiagramResult = { ...raw, layout: { ...raw.layout, columns: new Map(raw.layout.columns) } };
        if (import.meta.env.DEV && result.crossings.length) {
          console.warn(`Item Definition layout: ${result.crossings.length} crossing(s) left`, result.crossings);
        }
        cache.set(def, result);
        setState({ status: 'ready', result });
      }
      worker.terminate();
    };
    worker.onerror = (event) => {
      setState({ status: 'failed', message: event.message || 'The diagram could not be laid out.' });
      worker.terminate();
    };
    worker.postMessage({
      id,
      input: { zones: def.zones, containers: def.containers, elements: def.elements, links: def.links },
      external: [...EXTERNAL_ZONES],
      measure: measureNames(def),
    });
    return () => worker.terminate();
  }, [def]);

  return state;
}
