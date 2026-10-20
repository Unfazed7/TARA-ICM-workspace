/// <reference lib="webworker" />
/** Builds the Item Definition diagram off the main thread, so the page stays responsive. */

import { buildDiagram } from './engine.ts';
import type { LayoutInput } from './layout.ts';

self.onmessage = (event: MessageEvent<{ id: number; input: LayoutInput; external: string[]; measure: Record<string, number> }>) => {
  const { id, input, external, measure } = event.data;
  try {
    const result = buildDiagram(input, external, measure);
    // Maps do not survive postMessage as-is in every browser; send the columns as pairs.
    self.postMessage({ id, result: { ...result, layout: { ...result.layout, columns: [...result.layout.columns] } } });
  } catch (error) {
    self.postMessage({ id, error: (error as Error).message });
  }
};
