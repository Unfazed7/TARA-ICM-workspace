'use strict';

/**
 * The part of Stage 03 that code decides (spec 26, step 1 and 2): which assets exist and which
 * properties they start with. Source is the stored Item Definition; the rules are `_config/asset-rules.md`.
 * Containers never produce assets, `out_of_scope` components produce none, `interface` components give only
 * the item's side (D-52, G2).
 */

const { typeLabel, defaultProperties } = require('../../../_engines/asset-rules');

const ALWAYS_EXTERNAL = ['Au', 'NR']; // an interface component's identity as the item uses it (rules section 4)
const CREDENTIAL = 'credentials_and_session_tokens';

/** "Certificate service" + "service logic" -> "Certificate service logic" (no repeated word). */
function joinName(name, noun) {
  const nameWords = name.split(/\s+/);
  const nounWords = noun.split(/\s+/);
  const last = nameWords[nameWords.length - 1].toLowerCase();
  if (nounWords[0] && nounWords[0].toLowerCase() === last) nounWords.shift();
  return [...nameWords, ...nounWords].join(' ');
}

const categoriesOf = (element) => new Set((element.data_handled || []).map((d) => d.category).filter(Boolean));

function candidate(fields) {
  return { interface: false, factIds: [], categories: [], hasRow: true, mayAdd: [], ...fields };
}

/**
 * @returns {{candidates: object[], unmatched: {id: string, name: string, type: string}[]}}
 */
function deriveCandidates(def, scopeDecisions, rules) {
  const scope = new Map((scopeDecisions || def.scope_decisions || []).map((d) => [d.element_id, d.status]));
  const statusOf = (id) => scope.get(id) || 'in_scope';
  const elements = new Map((def.elements || []).map((e) => [e.element_id, e]));
  const out = [];
  const unmatched = [];

  for (const e of def.elements || []) {
    const status = statusOf(e.element_id);
    if (status === 'out_of_scope') continue;
    const label = `${e.element_id} ${e.name}`;
    if (status === 'interface') {
      out.push(candidate({
        prefix: 'EXT', name: `${e.name} identity`, noun: 'identity', kind: 'element', sourceIds: [e.element_id], sourceLabel: label, scope: status,
        interface: true, factIds: e.fact_ids || [], defaults: ALWAYS_EXTERNAL, typeKey: e.asset_type, elementType: e.asset_type,
      }));
      continue;
    }
    const row = rules.components.get(e.asset_type);
    if (!row) {
      unmatched.push({ id: e.element_id, name: e.name, type: e.asset_type });
      continue;
    }
    const categories = categoriesOf(e);
    if (e.asset_type === 'secrets_store') {
      const items = (e.data_handled || []).filter((d) => d.category === CREDENTIAL && d.item);
      if (items.length) {
        const credential = rules.sources.get('credential');
        for (const item of items) {
          out.push(candidate({
            prefix: credential.prefix, name: item.item, noun: 'credential', kind: 'item', sourceIds: [e.element_id], sourceLabel: `${label}: ${item.item}`,
            scope: status, factIds: e.fact_ids || [], defaults: credential.defaults, mayAdd: credential.mayAdd, typeKey: 'credential', elementType: e.asset_type,
            categories: [CREDENTIAL],
          }));
        }
        continue;
      }
    }
    out.push(candidate({
      prefix: row.prefix, name: joinName(e.name, row.noun), noun: row.noun, kind: 'element', sourceIds: [e.element_id], sourceLabel: label, scope: status,
      factIds: e.fact_ids || [], defaults: defaultProperties(row, categories), mayAdd: row.mayAdd, typeKey: e.asset_type, elementType: e.asset_type,
      categories: [...categories],
    }));
  }

  const fn = rules.sources.get('function');
  for (const f of def.functions || []) {
    const members = [...(f.element_ids || []), ...(f.actor_ids || [])];
    if (members.length && members.every((id) => statusOf(id) === 'out_of_scope')) continue;
    const defaults = new Set(fn.defaults);
    if (f.privileged) fn.ifRules.filter((r) => r.when.includes('privileged')).forEach((r) => r.properties.forEach((p) => defaults.add(p)));
    out.push(candidate({
      prefix: fn.prefix, name: f.name, noun: 'business function', kind: 'function', sourceIds: [f.function_id], sourceLabel: `${f.function_id} ${f.name}`, scope: 'in_scope',
      factIds: f.fact_ids || [], defaults: ['C', 'I', 'A', 'Au', 'Az', 'NR'].filter((p) => defaults.has(p)), mayAdd: fn.mayAdd, typeKey: 'function', description: f.description,
    }));
  }

  // Connections that carry sensitive data across a trust boundary, one asset per destination.
  const comm = rules.sources.get('link');
  const byDestination = new Map();
  for (const l of def.links || []) {
    if (!l.crosses_trust_boundary) continue;
    const ends = [statusOf(l.source_id), statusOf(l.destination_id)];
    if (!ends.some((s) => s === 'in_scope' || s === 'ambiguous')) continue;
    const sensitive = (l.data_carried || []).map((d) => d.category).filter((c) => rules.sensitive.has(c));
    if (!sensitive.length) continue;
    const group = byDestination.get(l.destination_id) || { links: [], categories: new Set() };
    group.links.push(l);
    sensitive.forEach((c) => group.categories.add(c));
    byDestination.set(l.destination_id, group);
  }
  for (const [destinationId, group] of byDestination) {
    const dest = elements.get(destinationId);
    const destName = dest ? dest.name : destinationId;
    out.push(candidate({
      prefix: comm.prefix, name: `Data sent to ${destName}`, noun: 'data in transit', kind: 'link', sourceIds: group.links.map((l) => l.link_id),
      sourceLabel: group.links.map((l) => l.link_id).join(', '), scope: 'in_scope', interface: statusOf(destinationId) === 'interface',
      factIds: [...new Set(group.links.flatMap((l) => l.fact_ids || []))], defaults: comm.defaults, mayAdd: comm.mayAdd, typeKey: 'link',
      categories: [...group.categories],
    }));
  }

  // Order by family, then by where it came from; number each prefix from 01.
  const order = rules.families.map((f) => f.prefix);
  const rank = (c) => (order.includes(c.prefix) ? order.indexOf(c.prefix) : order.length);
  const sorted = out.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
  const counter = {};
  for (const c of sorted) {
    counter[c.prefix] = (counter[c.prefix] || 0) + 1;
    c.assetId = `${c.prefix}-${String(counter[c.prefix]).padStart(2, '0')}`;
    c.typeLabel = typeLabel(rules, c.prefix, c.typeKey || 'any');
  }
  return { candidates: sorted, unmatched };
}

module.exports = { deriveCandidates, joinName };
