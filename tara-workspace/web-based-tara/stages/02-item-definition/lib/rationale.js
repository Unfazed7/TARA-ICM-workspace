'use strict';

/**
 * Stage 02 Rationale (specs 13a, 13b). Written by code from templates. Attention is set
 * by rule: anything touching exposure, authentication, scope, environment, keys,
 * credentials, audit records or whether a component exists needs attention.
 */

const { topicForText } = require('../../../_engines/topics');

const SENSITIVE_KINDS = new Set(['kms_key', 'secrets_store', 'audit_trail_config_recorder', 'identity_provider', 'certificate_authority', 'signing_service']);
const STATUS_TEXT = {
  in_scope: 'inside the assessment',
  interface: 'an interface: only its connection to the item is assessed',
  out_of_scope: 'outside the assessment',
  ambiguous: 'not decided',
};

function questionNeedsAttention(q, target) {
  if (['FT-04', 'FT-06', 'FT-07'].includes(q.fact_type)) return true;
  if (q.fact_type === 'generic' && /authenticat|token|delete|admin|record|credential|key/i.test(`${q.topic} ${q.text}`)) return true;
  if (q.target_id.startsWith('IF-')) return true;
  return Boolean(target && SENSITIVE_KINDS.has(target.kind));
}

class Book {
  constructor(factsById) {
    this.items = [];
    this.factsById = factsById;
  }

  sources(factIds) {
    const refs = factIds.flatMap((id) => (this.factsById.get(id) || { source_refs: [] }).source_refs);
    const seen = new Set();
    return refs.filter((r) => {
      const k = `${r.doc_id}|${r.location}|${r.quote}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 5);
  }

  add(item, factIds) {
    const sources = this.sources(factIds);
    if (!sources.length) return null;
    const id = `RAT-${200 + this.items.length + 1}`;
    this.items.push({ rationale_id: id, stage: '02', ...item, why: { sources, ...(item.note ? { note: item.note } : {}) }, review: { status: 'unreviewed' } });
    delete this.items[this.items.length - 1].note;
    return id;
  }
}

function writeRationale({ itemDef, questions, decisions, notes, factsById }) {
  const book = new Book(factsById);
  const elements = new Map(itemDef.elements.map((e) => [e.element_id, e]));
  const targets = new Map([
    ...itemDef.elements.map((e) => [e.element_id, { name: e.name, kind: e.asset_type, fact_ids: e.fact_ids }]),
    ...itemDef.links.map((l) => [l.link_id, { name: `the connection from "${elements.get(l.source_id).name}" to "${elements.get(l.destination_id).name}"`, kind: 'link', fact_ids: l.fact_ids }]),
    ...itemDef.containers.map((c) => [c.container_id, { name: c.name, kind: c.kind, fact_ids: c.fact_ids }]),
  ]);
  const covered = new Set();

  for (const d of decisions.filter((x) => x.assumed)) {
    const element = elements.get(d.element_id);
    const linked = questions.filter((q) => d.based_on_question_ids.includes(q.question_id));
    for (const q of linked) covered.add(q.question_id);
    const first = linked[0];
    book.add({
      kind: 'assumption',
      topic: 'scope',
      attention: 'needs_attention',
      title: `The scope of "${element.name}" is assumed`.slice(0, 160),
      concluded: `"${element.name}" is ${STATUS_TEXT[d.status]}. ${d.reason}`,
      assumed: linked.map((q) => q.default_if_unanswered).join(' ') || 'The usual decision for this kind of component is used.',
      would_change: first ? `An answer to: ${first.text}` : 'More facts about this component.',
      question_id: first && first.question_id,
      affects: [d.element_id, d.decision_id, ...linked.map((q) => q.question_id)],
    }, element.fact_ids);
  }

  for (const q of questions.filter((x) => x.status === 'open' && !covered.has(x.question_id))) {
    const target = targets.get(q.target_id);
    book.add({
      kind: 'gap',
      topic: topicForText(`${q.topic || ''} ${q.text}`),
      attention: questionNeedsAttention(q, target) ? 'needs_attention' : 'information',
      title: q.text.slice(0, 160),
      concluded: `The documents do not say this about ${target.kind === 'link' ? target.name : `"${target.name}"`}.`,
      assumed: q.default_if_unanswered,
      would_change: 'An answer from the analyst or the client.',
      question_id: q.question_id,
      affects: [q.target_id, q.question_id],
    }, target.fact_ids);
  }

  for (const a of itemDef.assumptions) {
    const needs = a.based_on.some((id) => (factsById.get(id) || {}).group === 'needs_you') || /internet|exposed|entry point|authenticat|key|credential|environment|scope/i.test(a.text);
    book.add({
      kind: 'assumption',
      topic: topicForText(a.text),
      attention: needs ? 'needs_attention' : 'information',
      title: a.text.length <= 160 ? a.text : `${a.text.slice(0, 157)}...`,
      concluded: `To keep going, this is assumed: ${a.text}`,
      assumed: 'It is used in this Item Definition until the client confirms or corrects it.',
      would_change: 'The client confirming or correcting this.',
      affects: [a.assumption_id, ...a.based_on],
    }, a.based_on);
  }

  for (const n of notes) {
    book.add({
      kind: n.kind,
      topic: { exposure: 'exposure', authentication: 'sign_in', existence: 'scope' }[n.touches] || topicForText(`${n.title} ${n.text}`),
      attention: ['existence', 'authentication', 'exposure'].includes(n.touches) ? 'needs_attention' : 'information',
      title: n.title.slice(0, 160),
      concluded: n.text,
      assumed: n.assumed || 'Nothing is added that the documents do not show.',
      would_change: n.would_change || 'The client confirming how this works.',
      affects: n.affects.length ? n.affects : n.fact_ids.slice(0, 5),
    }, n.fact_ids);
  }

  const unknownLinks = itemDef.links.filter((l) => /^unknown$/i.test(l.authentication) || /^unknown$/i.test(l.encryption))
    .filter((l) => !questions.some((q) => q.target_id === l.link_id && q.status === 'open'));
  if (unknownLinks.length) {
    const names = unknownLinks.map((l) => `"${elements.get(l.source_id).name}" to "${elements.get(l.destination_id).name}"`);
    book.add({
      kind: 'gap',
      topic: 'sign_in',
      attention: 'information',
      title: `${unknownLinks.length} connection(s) do not say how they are authenticated or encrypted`,
      concluded: `The documents do not name the authentication or encryption for: ${names.join('; ')}.`,
      assumed: 'These are recorded as unknown, the weaker option, until stated.',
      would_change: 'The client naming how each of these connections is protected.',
      affects: unknownLinks.map((l) => l.link_id),
    }, unknownLinks.flatMap((l) => l.fact_ids));
  }

  return book.items;
}

module.exports = { writeRationale, questionNeedsAttention };
