/**
 * The fixed values of the 03 Assets design (.meta/design/03-assets/Main.dc.html): the property accents,
 * the "would change it" sentences and a helper that turns the design's inline style strings into React styles.
 * The property accents are an approved exception to D-51's "colour marks state only" on this screen (D-60).
 */

import type { CSSProperties } from 'react';
import type { PropertyCode } from '@/types/stages';

export const PROPS: { k: PropertyCode; name: string; h: string; b: string; t: string }[] = [
  { k: 'C', name: 'Confidentiality', h: '#DCEEFB', b: '#F1F8FD', t: '#1F6C9F' },
  { k: 'I', name: 'Integrity', h: '#E1EEDF', b: '#F3F8F2', t: '#346538' },
  { k: 'A', name: 'Availability', h: '#F8ECC8', b: '#FDF8EA', t: '#8A5D00' },
  { k: 'Au', name: 'Authenticity', h: '#EFE5F1', b: '#F9F5FA', t: '#6E3F73' },
  { k: 'Az', name: 'Authorization', h: '#DCEFEC', b: '#F1F8F7', t: '#2A6B63' },
  { k: 'NR', name: 'Non-repudiation', h: '#F5E5DA', b: '#FBF4EF', t: '#8A4B22' },
];

export const PROP_NAME = Object.fromEntries(PROPS.map((p) => [p.k, p.name])) as Record<PropertyCode, string>;

/** What would change a property: [when it applies, when it does not]. Fixed copy from the design. */
export const FLIP: Record<PropertyCode, [string, string]> = {
  C: ['A document showing it keeps no data of its own.', 'A document showing it stores sensitive data that no other row covers.'],
  I: ['The client showing its content cannot affect anything.', 'A document showing its content drives decisions.'],
  A: ['The client confirming the portal keeps working without it.', 'A document showing a function stops without it.'],
  Au: ['Nobody relying on where it comes from.', 'A party relying on proof of its origin.'],
  Az: ['It making no access decision.', 'It deciding who may do what.'],
  NR: ['No need to prove actions afterwards.', 'A requirement to prove who did what.'],
};

/** "a: b; --c: d" -> { a: 'b', '--c': 'd' }, the way the design writes its inline styles. */
export function st(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of css.split(';')) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (!name || !value) continue;
    out[name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = value;
  }
  return out as CSSProperties;
}

/** The thread key of a cell or an asset: `WL-01.C` or `WL-01.asset`. */
export const keyOf = (assetId: string, property: PropertyCode | null) => `${assetId}.${property ?? 'asset'}`;
export const splitKey = (key: string): [string, PropertyCode | 'asset'] => {
  const at = key.indexOf('.');
  return [key.slice(0, at), key.slice(at + 1) as PropertyCode | 'asset'];
};

export function whenWords(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date(now).toDateString();
  return sameDay ? `today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
