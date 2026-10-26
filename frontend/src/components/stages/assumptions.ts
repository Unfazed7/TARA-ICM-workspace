/** Turns the stored Rationale of both stages into Assumption cards (D-46, spec 24). */

import type { Element, Link, RationaleItem, StageKey } from '@/types/stages';
import { TOPIC_ORDER } from './words';

export interface Card {
  id: string;
  item: RationaleItem; // the item the card shows; for a merged card, the Stage 02 one
  found: RationaleItem[]; // Stage 01 items this one was built on (shown as "Found in Stage 01")
}

/** A card needs the analyst when any of its items needs attention and is not yet reviewed. */
export const needsYou = (c: Card) =>
  [c.item, ...c.found].some((i) => i.attention === 'needs_attention' && i.review.status === 'unreviewed');

/**
 * Cards for one stage or both. A Stage 02 item built on Stage 01 items becomes one card;
 * in the all-stages view those Stage 01 items are not shown again on their own.
 */
export function buildCards(items01: RationaleItem[], items02: RationaleItem[], view: StageKey | 'all'): Card[] {
  const byId01 = new Map(items01.map((i) => [i.rationale_id, i]));
  const merged = (i: RationaleItem): Card => ({
    id: i.rationale_id,
    item: i,
    found: (i.why.based_on_rationale_ids || []).map((id) => byId01.get(id)).filter((x): x is RationaleItem => !!x),
  });
  if (view === '01') return items01.map((i) => ({ id: i.rationale_id, item: i, found: [] }));
  const cards02 = items02.map(merged);
  if (view === '02') return cards02;
  const used = new Set(cards02.flatMap((c) => c.found.map((f) => f.rationale_id)));
  return [...cards02, ...items01.filter((i) => !used.has(i.rationale_id)).map((i) => ({ id: i.rationale_id, item: i, found: [] }))];
}

/** Cards grouped by topic in the fixed order; needs-you first inside each group, else stored order. */
export function groupCards(cards: Card[]) {
  return TOPIC_ORDER.map((topic) => ({
    topic,
    cards: cards
      .filter((c) => c.item.topic === topic)
      .sort((a, b) => Number(needsYou(b)) - Number(needsYou(a))),
  })).filter((g) => g.cards.length);
}

/**
 * The elements and links a card affects: ids it names directly, plus those resting on the facts it names.
 */
export function affectedIds(card: Card, elements: Element[], links: Link[]): Set<string> {
  const ids = new Set([card.item, ...card.found].flatMap((i) => i.affects));
  const facts = new Set([...ids].filter((id) => id.startsWith('FCT-')));
  const out = new Set<string>();
  for (const e of elements) if (ids.has(e.element_id) || e.fact_ids.some((f) => facts.has(f))) out.add(e.element_id);
  for (const l of links) if (ids.has(l.link_id) || l.fact_ids.some((f) => facts.has(f))) out.add(l.link_id);
  return out;
}
