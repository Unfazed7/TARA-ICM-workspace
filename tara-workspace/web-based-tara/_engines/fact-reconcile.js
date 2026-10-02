'use strict';

/**
 * Fact reconciliation (spec .meta/specs/20-fact-reconciliation.md, D-44).
 *
 * One model call compares the per-document facts from Stage 01 reading and reports
 * duplicates, names that mean the same component, and disagreements, with a fixed
 * reading per side. Everything after that is code: ids are checked, defaults follow
 * spec 13b, attention is set by rule, and Rationale text comes from templates.
 */

const fs = require('fs');
const path = require('path');
const { callLLM, isRefusal } = require('../stages/llm-client');

const PROMPT = path.resolve(__dirname, '..', 'stages', '01-input-normalization', 'prompts', 'compare-facts.md');

const CONFLICT_KINDS = [
  'internet_exposure', 'environment', 'component_existence', 'ownership', 'entry_point_authentication',
  'older_higher_precedence', 'naming', 'instance_size', 'count', 'version', 'other',
];
const AUTO_KINDS = new Set(['naming', 'instance_size', 'count', 'version']);
const ASPECTS = ['exposure', 'existence', 'environment', 'ownership', 'authentication', 'encryption', 'size', 'count', 'version', 'naming', 'other'];
const READINGS = ['exposed', 'not_exposed', 'exists', 'absent', 'prod', 'staging', 'dev', 'unknown', 'item_team', 'other_party', 'none', 'present', 'stated'];
const EXISTENCE_TYPES = new Set(['component_exists', 'actor']);

/** For each aspect, the reading that means more security work (spec 13b), and the sentence that goes with it. */
const CAUTIOUS = {
  exposure: { reading: 'exposed', assumed: (s) => `${s} is treated as reachable from the internet, an entry point of its own, until this is settled.` },
  existence: { reading: 'exists', assumed: (s) => `${s} is treated as existing and in scope.` },
  environment: { reading: 'prod', assumed: () => 'Production is assessed. Statements about other environments are assumed to hold for production too.' },
  ownership: { reading: 'item_team', assumed: (s) => `${s} is treated as run by the item's own team, so it stays in scope.` },
  authentication: { reading: 'none', assumed: (s) => `The weaker option is assumed for ${s}: no authentication unless confirmed.` },
  encryption: { reading: 'none', assumed: (s) => `The weaker option is assumed for ${s}: no encryption unless confirmed.` },
};
const KIND_ASPECT = {
  internet_exposure: 'exposure', component_existence: 'existence', environment: 'environment',
  ownership: 'ownership', entry_point_authentication: 'authentication',
};
const WOULD_CHANGE = {
  exposure: (s) => `The client confirming whether ${s} can be reached from the internet.`,
  existence: (s) => `The client confirming whether ${s} exists.`,
  environment: () => 'The client confirming which environment is assessed and whether the documents describe the same setup.',
  ownership: (s) => `The client confirming who runs ${s}.`,
  authentication: (s) => `The client confirming how callers of ${s} are authenticated.`,
  encryption: (s) => `The client confirming how traffic to ${s} is encrypted.`,
};

const nullableString = { type: ['string', 'null'] };
const COMPARE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['same_names', 'duplicates', 'conflicts'],
  properties: {
    same_names: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['names', 'why'], properties: { names: { type: 'array', items: { type: 'string' } }, why: { type: 'string' } } },
    },
    duplicates: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['fact_ids'], properties: { fact_ids: { type: 'array', items: { type: 'string' } } } },
    },
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'aspect', 'subject', 'description', 'sides'],
        properties: {
          kind: { type: 'string', enum: CONFLICT_KINDS },
          aspect: { type: 'string', enum: ASPECTS },
          subject: { type: 'string' },
          description: { type: 'string' },
          sides: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['fact_ids', 'reading', 'says'],
              properties: { fact_ids: { type: 'array', items: { type: 'string' } }, reading: { type: 'string', enum: READINGS }, says: nullableString },
            },
          },
        },
      },
    },
  },
};

/** Lowercases a sentence start ("The load balancer" -> "the load balancer") but not an acronym ("API gateway"). */
function midSentence(text) {
  const t = String(text || '').replace(/\.$/, '');
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
}

function norm(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// ── Documents ─────────────────────────────────────────────────────────────────

function docInfo(register) {
  const docs = new Map(register.map((d) => [d.doc_id, d]));
  const date = (d) => d.date_on_document || d.date_received || '';
  /** Negative when a outranks b: higher rank (lower number), then newer. */
  const compareDocs = (a, b) => (docs.get(a).precedence_rank - docs.get(b).precedence_rank) || date(docs.get(b)).localeCompare(date(docs.get(a)));
  return { docs, date, compareDocs };
}

function bestDoc(fact, compareDocs) {
  return fact.source_refs.map((s) => s.doc_id).sort(compareDocs)[0];
}

// ── Model call ────────────────────────────────────────────────────────────────

async function compareWithModel(rawFacts, register, fetchImpl, redactor) {
  const docs = new Map(register.map((d) => [d.doc_id, d]));
  const hide = (t) => (redactor ? redactor.hide(t) : t);
  const lines = rawFacts.map((f) => {
    const s = f.source_refs[0];
    const d = docs.get(s.doc_id);
    return JSON.stringify({ id: f.fact_id, document: hide(d.client_doc_ref), doc_type: d.doc_type, rank: d.precedence_rank, subject: hide(f.subject), fact_type: f.fact_type, value: hide(f.value), quote: hide(s.quote) });
  });
  const response = await callLLM({
    stage: '01-reconcile-leftovers',
    system: fs.readFileSync(PROMPT, 'utf8'),
    messages: [{ role: 'user', content: `Facts, one per line:\n${lines.join('\n')}` }],
    response_schema: { name: 'fact_comparison', schema: COMPARE_SCHEMA },
  }, fetchImpl);
  if (isRefusal(response)) throw new Error('the model declined to compare the facts');
  const text = (response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  const parsed = JSON.parse(text);
  return redactor ? redactor.restoreDeep(parsed) : parsed;
}

// ── Checking the reply ────────────────────────────────────────────────────────

function checkReply(reply, rawFacts) {
  const byId = new Map(rawFacts.map((f) => [f.fact_id, f]));
  const docOf = (id) => byId.get(id).source_refs[0].doc_id;
  const subjects = new Map();
  for (const f of rawFacts) subjects.set(norm(f.subject), f.subject);
  const log = [];
  const known = (ids) => ids.filter((id) => byId.has(id));

  const sameNames = [];
  for (const group of reply.same_names || []) {
    const names = [...new Set(group.names.map(norm))].filter((n) => subjects.has(n));
    if (names.length >= 2) sameNames.push({ names: names.map((n) => subjects.get(n)), why: group.why });
    else log.push({ dropped: 'same_names', reason: 'fewer than two known names', group });
  }

  const duplicates = [];
  for (const group of reply.duplicates || []) {
    const ids = [...new Set(known(group.fact_ids))];
    const types = new Set(ids.map((id) => byId.get(id).fact_type));
    if (ids.length >= 2 && types.size === 1) duplicates.push(ids);
    else log.push({ dropped: 'duplicates', reason: 'unknown ids or mixed fact types', group });
  }

  const conflicts = [];
  for (const conflict of reply.conflicts || []) {
    const sides = conflict.sides.map((s) => ({ ...s, fact_ids: [...new Set(known(s.fact_ids))] })).filter((s) => s.fact_ids.length);
    const documents = new Set(sides.flatMap((s) => s.fact_ids.map(docOf)));
    if (sides.length < 2 || documents.size < 2) {
      log.push({ dropped: 'conflict', reason: 'needs two sides from two documents', conflict });
      continue;
    }
    const kind = CONFLICT_KINDS.includes(conflict.kind) ? conflict.kind : 'other';
    conflicts.push({ ...conflict, kind, sides });
  }
  return { sameNames, duplicates, conflicts, log };
}

// ── Building the result ───────────────────────────────────────────────────────

function unionFind(ids) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const join = (a, b) => parent.set(find(a), find(b));
  return { find, join };
}

/**
 * @returns {{facts, conflicts, rationale, mergeMap, newKinds, log}}
 */
function buildResult({ register, rawFacts, reply, rationale, compared }) {
  const { docs, compareDocs } = docInfo(register);
  const raw = rawFacts.map((f) => ({ ...f, source_refs: [...f.source_refs] }));
  const byId = new Map(raw.map((f) => [f.fact_id, f]));
  const log = [...(reply.log || [])];

  // 1. Names that mean the same thing: the name from the best document wins.
  const renames = new Map();
  const namingConflicts = [];
  for (const group of reply.sameNames) {
    const factsFor = (name) => raw.filter((f) => norm(f.subject) === norm(name));
    const existence = (name) => {
      const all = factsFor(name);
      const ex = all.filter((f) => EXISTENCE_TYPES.has(f.fact_type));
      return ex.length ? ex : all.slice(0, 1);
    };
    const ranked = group.names
      .map((name) => ({ name, facts: existence(name) }))
      .filter((n) => n.facts.length)
      .sort((a, b) => compareDocs(bestDoc(a.facts[0], compareDocs), bestDoc(b.facts[0], compareDocs)));
    if (ranked.length < 2) continue;
    const [winner, ...losers] = ranked;
    for (const loser of losers) for (const f of factsFor(loser.name)) renames.set(f.fact_id, winner.name);
    namingConflicts.push({ winner, losers, why: group.why });
  }

  // 2. Duplicates become one fact; existence facts with the same name and type always merge.
  const uf = unionFind(raw.map((f) => f.fact_id));
  for (const group of reply.duplicates) for (const id of group.slice(1)) uf.join(id, group[0]);
  const loserIds = new Set(namingConflicts.flatMap((c) => c.losers.flatMap((l) => l.facts.map((f) => f.fact_id))));
  const existenceKey = new Map();
  for (const f of raw) {
    if (!EXISTENCE_TYPES.has(f.fact_type) || loserIds.has(f.fact_id)) continue;
    const key = `${f.fact_type}|${norm(renames.get(f.fact_id) || f.subject)}`;
    if (existenceKey.has(key)) uf.join(f.fact_id, existenceKey.get(key));
    else existenceKey.set(key, f.fact_id);
  }

  const groups = new Map();
  for (const f of raw) {
    const root = uf.find(f.fact_id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(f);
  }

  const facts = [];
  const mergeMap = {};
  for (const members of groups.values()) {
    const lead = [...members].sort((a, b) => compareDocs(bestDoc(a, compareDocs), bestDoc(b, compareDocs)))[0];
    const id = `FCT-${String(facts.length + 1).padStart(3, '0')}`;
    const confidences = ['high', 'medium', 'low'];
    facts.push({
      fact_id: id,
      subject: renames.get(lead.fact_id) || lead.subject,
      fact_type: lead.fact_type,
      value: lead.value,
      source_refs: members.flatMap((m) => m.source_refs),
      confidence: confidences[Math.min(...members.map((m) => confidences.indexOf(m.confidence)))],
      group: 'single_source',
      status: 'proposed',
    });
    for (const m of members) mergeMap[m.fact_id] = id;
  }
  const finalOf = (rawId) => mergeMap[rawId];
  const factById = new Map(facts.map((f) => [f.fact_id, f]));

  // 3. Conflicts, decided by code.
  const conflicts = [];
  const newKinds = [];
  const book = rationale;
  const nextRat = () => `RAT-${String(book.length + 1).padStart(3, '0')}`;
  const sourcesOf = (ids) => ids.flatMap((id) => factById.get(id).source_refs).slice(0, 6);
  const docName = (factId) => docs.get(bestDoc(factById.get(factId), compareDocs)).client_doc_ref;
  const addConflict = (c) => {
    const id = `CNF-${String(conflicts.length + 1).padStart(3, '0')}`;
    conflicts.push({ conflict_id: id, ...c });
    return id;
  };

  for (const n of namingConflicts) {
    const winnerIds = [...new Set(n.winner.facts.map((f) => finalOf(f.fact_id)))];
    const loserFinal = [...new Set(n.losers.flatMap((l) => l.facts.map((f) => finalOf(f.fact_id))))].filter((id) => !winnerIds.includes(id));
    if (!loserFinal.length) {
      log.push({ note: 'same names already joined as one fact', names: [n.winner.name, ...n.losers.map((l) => l.name)] });
      continue;
    }
    for (const id of loserFinal) factById.get(id).status = 'rejected';
    const loserNames = n.losers.map((l) => `"${l.name}"`).join(' and ');
    const conflictId = addConflict({
      fact_ids: [...winnerIds, ...loserFinal],
      kind: 'naming',
      proposed_resolution: `Same component: ${loserNames} is another name for "${n.winner.name}". Keep the name from ${docName(winnerIds[0])}.`,
      auto_resolved: true,
      loser_fact_ids: loserFinal,
    });
    book.push({
      rationale_id: nextRat(), stage: '01', kind: 'conflict', attention: 'information',
      title: `${loserNames} and "${n.winner.name}" are the same component`,
      concluded: `${docName(winnerIds[0])} calls it "${n.winner.name}" and ${docName(loserFinal[0])} calls it ${loserNames}. They describe the same component, so the name from the higher-ranked document is kept.`,
      why: { sources: sourcesOf([...winnerIds, ...loserFinal]), ...(n.why ? { note: n.why } : {}) },
      assumed: 'One component with two names.',
      would_change: `The client saying that "${n.winner.name}" and ${loserNames} are separate components.`,
      conflict_id: conflictId, auto_resolved: true,
      affects: [...winnerIds, ...loserFinal],
      review: { status: 'unreviewed' },
    });
  }

  for (const c of reply.conflicts) {
    const sides = c.sides.map((s) => ({ ...s, final: [...new Set(s.fact_ids.map(finalOf))] }));
    const allIds = [...new Set(sides.flatMap((s) => s.final))];
    if (allIds.length < 2) {
      log.push({ dropped: 'conflict', reason: 'both sides became the same fact after merging', conflict: c });
      continue;
    }
    const subject = `"${c.subject || factById.get(allIds[0]).subject}"`;
    const ranked = [...sides].sort((a, b) => compareDocs(bestDoc(factById.get(a.final[0]), compareDocs), bestDoc(factById.get(b.final[0]), compareDocs)));
    const higher = ranked[0];
    let kind = c.kind;
    const aspect = KIND_ASPECT[kind] || c.aspect;
    const rule = CAUTIOUS[aspect];
    const cautiousSide = rule && sides.find((s) => s.reading === rule.reading);
    let auto = false;
    let lead;
    let assumed;
    let cannotTell = false;

    if (AUTO_KINDS.has(kind)) {
      const higherDoc = docs.get(bestDoc(factById.get(higher.final[0]), compareDocs));
      const olderHigher = ranked.slice(1).some((s) => {
        const d = docs.get(bestDoc(factById.get(s.final[0]), compareDocs));
        return d.precedence_rank > higherDoc.precedence_rank && (d.date_on_document || d.date_received) > (higherDoc.date_on_document || higherDoc.date_received);
      });
      if (olderHigher) kind = 'older_higher_precedence';
      else auto = true;
      lead = higher;
      assumed = `The value from ${docName(higher.final[0])} is used${auto ? '; the other value is kept on record' : ''}.`;
    } else if (cautiousSide) {
      lead = cautiousSide;
      assumed = rule.assumed(subject);
    } else {
      lead = higher;
      cannotTell = true;
      assumed = `I could not tell which option is safer, so the higher-ranked document, ${docName(higher.final[0])}, is used.`;
    }
    if (kind === 'other') newKinds.push({ subject, aspect: c.aspect, description: c.description, fact_ids: allIds });

    const losers = auto ? sides.filter((s) => s !== lead).flatMap((s) => s.final) : [];
    const conflict = {
      fact_ids: allIds,
      kind,
      proposed_resolution: auto ? `Use the value from ${docName(lead.final[0])}; keep the other on record.` : `Ask the analyst. Until answered: ${assumed}`,
      auto_resolved: auto,
      loser_fact_ids: losers,
    };
    if (kind === 'other') conflict.description = c.description.length >= 5 ? c.description : `Documents disagree about ${subject}.`;
    const conflictId = addConflict(conflict);
    if (!auto) for (const id of allIds) factById.get(id).group = 'needs_you';

    const sideText = sides.map((s) => `${docName(s.final[0])} says ${midSentence(s.says || factById.get(s.final[0]).value)}`).join('; ');
    book.push({
      rationale_id: nextRat(), stage: '01', kind: 'conflict',
      attention: auto ? 'information' : 'needs_attention',
      title: titleFor(kind, subject),
      concluded: `Documents disagree: ${sideText}.${cannotTell ? ' I could not tell which option is safer.' : ''}`,
      why: { sources: sourcesOf(allIds) },
      assumed,
      would_change: (WOULD_CHANGE[aspect] || (() => `The client confirming which document is right about ${subject}.`))(subject),
      conflict_id: conflictId, auto_resolved: auto,
      affects: allIds,
      review: { status: 'unreviewed' },
    });
  }

  // 4. Labels for facts not in an open conflict.
  for (const f of facts) {
    if (f.group === 'needs_you') continue;
    f.group = new Set(f.source_refs.map((s) => s.doc_id)).size >= 2 ? 'agreed' : 'single_source';
  }

  if (!compared) {
    book.push({
      rationale_id: nextRat(), stage: '01', kind: 'gap', attention: 'needs_attention',
      title: 'Facts were not compared across documents',
      concluded: 'The comparison of documents did not run, so disagreements between documents may be missing. Only facts with exactly the same name and type were joined.',
      why: { sources: register.filter((d) => d.read_status !== 'failed').map((d) => ({ doc_id: d.doc_id, location: 'file name', quote: d.client_doc_ref })) },
      assumed: 'Each document is taken as it is.',
      would_change: 'Running Stage 01 again when the comparison is available.',
      affects: register.map((d) => d.doc_id),
      review: { status: 'unreviewed' },
    });
  }

  return { facts, conflicts, rationale: book, mergeMap, newKinds, log };
}

function titleFor(kind, subject) {
  const titles = {
    internet_exposure: `Is ${subject} reachable from the internet?`,
    environment: 'Which environment do the documents describe?',
    component_existence: `Does ${subject} exist?`,
    ownership: `Who runs ${subject}?`,
    entry_point_authentication: `How are callers of ${subject} authenticated?`,
    older_higher_precedence: `Documents disagree about ${subject}, and the higher-ranked one is older`,
    instance_size: `Documents give different sizes for ${subject}`,
    count: `Documents give different numbers for ${subject}`,
    version: `Documents give different versions for ${subject}`,
    other: `Documents disagree about ${subject}`,
  };
  return (titles[kind] || titles.other).slice(0, 160);
}

/**
 * Reconciles Stage 01 facts. Never throws because of the model: on failure it merges
 * by exact name only and adds a Rationale gap.
 */
async function reconcile({ register, rawFacts, rationale = [], fetchImpl = fetch, redactor = null }) {
  let reply = { sameNames: [], duplicates: [], conflicts: [], log: [] };
  let compared = false;
  let error = null;
  if (rawFacts.length) {
    try {
      reply = checkReply(await compareWithModel(rawFacts, register, fetchImpl, redactor), rawFacts);
      compared = true;
    } catch (err) {
      error = err.message;
    }
  }
  const result = buildResult({ register, rawFacts, reply, rationale: [...rationale], compared: compared || !rawFacts.length });
  if (error) result.log.push({ error });
  return result;
}

function writeReconciled(outDir, result) {
  const write = (name, data) => fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  write('facts.json', { facts: result.facts, conflicts: result.conflicts });
  write('rationale.json', result.rationale);
  write('fact-merge-map.json', result.mergeMap);
  write('reconcile-log.json', result.log);
  if (result.newKinds.length) {
    fs.appendFileSync(path.join(outDir, 'new-conflict-kinds.log'), result.newKinds.map((k) => `${new Date().toISOString()} ${JSON.stringify(k)}\n`).join(''));
  }
}

module.exports = { reconcile, buildResult, checkReply, writeReconciled, COMPARE_SCHEMA, CONFLICT_KINDS };
