'use strict';

// Fact reconciliation (spec 20). The model is faked from item-01's answer key:
// each answer-key fact is split into one raw fact per source (what Stage 01 reading
// produces), and the engine must join them back and find the same conflicts.

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOT, readJson, validateSchema } = require('../helpers/schema-validation');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reconcile-'));
const saved = { key: process.env.OPENROUTER_API_KEY, audit: process.env.LLM_AUDIT_FILE, provider: process.env.LLM_PROVIDER, model: process.env.LLM_MODEL };
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.LLM_AUDIT_FILE = path.join(tmp, 'audit.jsonl');
delete process.env.LLM_PROVIDER;
delete process.env.LLM_MODEL;

const { reconcile, writeReconciled } = require(path.join(ROOT, 'tara-workspace', 'web-based-tara', '_engines', 'fact-reconcile.js'));

const KEY = path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const register = readJson(path.join(KEY, 'document-register.json'));
const keyFacts = readJson(path.join(KEY, 'facts.json'));
const keyConflicts = readJson(path.join(KEY, 'conflicts.json'));
const schema = (name) => readJson(path.join(ROOT, 'src', 'schemas', name));

test.after(() => {
  for (const [env, value] of [['OPENROUTER_API_KEY', saved.key], ['LLM_AUDIT_FILE', saved.audit], ['LLM_PROVIDER', saved.provider], ['LLM_MODEL', saved.model]]) {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── Raw facts and a fake comparison built from the answer key ─────────────────

const rawFacts = [];
const rawOf = new Map(); // answer-key fact id -> raw ids
for (const fact of keyFacts) {
  rawOf.set(fact.fact_id, []);
  for (const source of fact.source_refs) {
    const id = `FCT-${String(rawFacts.length + 1).padStart(3, '0')}`;
    rawFacts.push({ fact_id: id, subject: fact.subject, fact_type: fact.fact_type, value: fact.value, source_refs: [source], confidence: fact.confidence, status: 'proposed' });
    rawOf.get(fact.fact_id).push(id);
  }
}
const subjectOf = (keyId) => keyFacts.find((f) => f.fact_id === keyId).subject;

const READINGS = {
  'FCT-011': 'not_exposed', 'FCT-013': 'exposed', 'FCT-015': 'exposed', 'FCT-018': 'dev', 'FCT-019': 'prod',
};
const ASPECT = { internet_exposure: 'exposure', environment: 'environment' };

function keyReply() {
  return {
    same_names: [{ names: [subjectOf('FCT-028'), subjectOf('FCT-029')], why: 'The functional description says the signing service uses the CA signing key, which the diagram shows next to the Key Service.' }],
    duplicates: [...rawOf.values()].filter((ids) => ids.length > 1).map((ids) => ({ fact_ids: ids })),
    conflicts: keyConflicts.filter((c) => c.kind !== 'naming').map((c) => ({
      kind: c.kind,
      aspect: ASPECT[c.kind],
      subject: subjectOf(c.fact_ids[1]),
      description: c.proposed_resolution,
      sides: c.fact_ids.map((id) => ({ fact_ids: rawOf.get(id), reading: READINGS[id], says: null })),
    })),
  };
}

function fakeFetch(reply, capture = {}) {
  return async (url, init) => {
    capture.body = JSON.parse(init.body);
    if (reply instanceof Error) return { ok: false, status: 500, text: async () => reply.message };
    const content = reply === null ? null : JSON.stringify(reply);
    const finish = reply === null ? 'content_filter' : 'stop';
    return { ok: true, json: async () => ({ id: 'g', model: 'm', provider: 'Anthropic', usage: {}, choices: [{ finish_reason: finish, message: { content } }] }) };
  };
}

const sourceKey = (fact) => fact.source_refs.map((s) => `${s.doc_id}|${s.location}|${s.quote}`).sort().join('\n');
const keyBySources = new Map(keyFacts.map((f) => [sourceKey(f), f]));

async function runKey(reply = keyReply(), extra = {}) {
  return reconcile({ register: extra.register || register, rawFacts: extra.rawFacts || rawFacts, rationale: [], fetchImpl: fakeFetch(reply, extra.capture) });
}

// ── item-01 ───────────────────────────────────────────────────────────────────

test('item-01: facts are joined back to the answer key', async () => {
  const result = await runKey();
  assert.equal(result.facts.length, keyFacts.length);
  for (const fact of result.facts) {
    const key = keyBySources.get(sourceKey(fact));
    assert.ok(key, `no answer-key fact with the sources of ${fact.fact_id} (${fact.subject})`);
    assert.equal(fact.fact_type, key.fact_type);
    assert.equal(fact.status, key.status, `${key.fact_id} status`);
    assert.equal(fact.group, key.group, `${key.fact_id} group`);
  }
});

test('item-01: the four answer-key conflicts are found and decided the same way', async () => {
  const result = await runKey();
  const toKey = new Map(result.facts.map((f) => [f.fact_id, keyBySources.get(sourceKey(f)).fact_id]));
  const seen = result.conflicts.map((c) => ({
    kind: c.kind,
    auto_resolved: c.auto_resolved,
    fact_ids: c.fact_ids.map((id) => toKey.get(id)).sort(),
    loser_fact_ids: c.loser_fact_ids.map((id) => toKey.get(id)).sort(),
  }));
  const wanted = keyConflicts.map((c) => ({ kind: c.kind, auto_resolved: c.auto_resolved, fact_ids: [...c.fact_ids].sort(), loser_fact_ids: [...c.loser_fact_ids].sort() }));
  const order = (list) => [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(order(seen), order(wanted));
});

test('item-01: defaults follow the more-security-work principle', async () => {
  const result = await runKey();
  const byKind = (kind) => result.rationale.filter((r) => r.conflict_id && result.conflicts.find((c) => c.conflict_id === r.conflict_id).kind === kind);
  const exposure = byKind('internet_exposure');
  assert.equal(exposure.length, 2);
  for (const item of exposure) {
    assert.equal(item.attention, 'needs_attention');
    assert.match(item.assumed, /treated as reachable from the internet/);
  }
  assert.match(byKind('environment')[0].assumed, /Production is assessed/);
  const naming = byKind('naming')[0];
  assert.equal(naming.attention, 'information');
  assert.match(naming.title, /"Key Service"/);
  const winner = result.facts.find((f) => f.subject === 'Key Service' && f.fact_type === 'component_exists');
  assert.equal(winner.status, 'proposed');
});

test('item-01: outputs validate against the schemas, and Rationale text has no ids', async () => {
  const result = await runKey();
  const facts = validateSchema({ facts: result.facts, conflicts: result.conflicts }, schema('stage-01-facts.schema.json'));
  assert.equal(facts.valid, true, JSON.stringify(facts.errors, null, 2));
  const rationale = validateSchema(result.rationale, schema('rationale.schema.json'));
  assert.equal(rationale.valid, true, JSON.stringify(rationale.errors, null, 2));
  for (const item of result.rationale) {
    for (const field of ['title', 'concluded', 'assumed', 'would_change']) {
      assert.doesNotMatch(item[field], /\b(FCT|CNF|DOC|RAT|EL|IF)-\d+/, `${item.rationale_id} ${field} shows an id`);
      assert.doesNotMatch(item[field], /\u2014/, 'no em dashes');
    }
  }
  writeReconciled(tmp, result);
  assert.ok(fs.existsSync(path.join(tmp, 'facts.json')));
});

test('the model receives each fact once, with its document and rank', async () => {
  const capture = {};
  await runKey(keyReply(), { capture });
  const lines = capture.body.messages[1].content.split('\n').slice(1).map(JSON.parse);
  assert.equal(lines.length, rawFacts.length);
  assert.deepEqual(Object.keys(lines[0]), ['id', 'document', 'doc_type', 'rank', 'subject', 'fact_type', 'value', 'quote']);
  assert.equal(capture.body.response_format.json_schema.name, 'fact_comparison');
});

// ── Code guards ───────────────────────────────────────────────────────────────

test('unknown ids and one-document conflicts are dropped and logged', async () => {
  const reply = keyReply();
  reply.duplicates.push({ fact_ids: ['FCT-998', 'FCT-999'] });
  reply.conflicts.push({ kind: 'count', aspect: 'count', subject: 'x', description: 'same document', sides: [{ fact_ids: rawOf.get('FCT-021'), reading: 'stated', says: null }, { fact_ids: rawOf.get('FCT-022'), reading: 'stated', says: null }] });
  const result = await runKey(reply);
  assert.equal(result.conflicts.length, keyConflicts.length);
  assert.ok(result.log.some((l) => l.dropped === 'duplicates'));
  assert.ok(result.log.some((l) => l.dropped === 'conflict' && /two documents/.test(l.reason)));
});

test('an unrecognised disagreement needs attention, shows both sides and is logged as a new kind', async () => {
  const reply = keyReply();
  reply.conflicts.push({
    kind: 'not_a_kind', aspect: 'other', subject: 'Certificate database', description: 'The documents disagree about how long certificates are kept.',
    sides: [{ fact_ids: rawOf.get('FCT-033'), reading: 'stated', says: 'certificates are kept forever' }, { fact_ids: [rawOf.get('FCT-001')[1]], reading: 'stated', says: 'certificates are kept for a year' }],
  });
  const result = await runKey(reply);
  const conflict = result.conflicts.find((c) => c.kind === 'other');
  assert.ok(conflict);
  assert.equal(conflict.auto_resolved, false);
  assert.equal(conflict.description, 'The documents disagree about how long certificates are kept.');
  const item = result.rationale.find((r) => r.conflict_id === conflict.conflict_id);
  assert.equal(item.attention, 'needs_attention');
  assert.match(item.concluded, /says certificates are kept forever; .* says certificates are kept for a year/);
  assert.match(item.concluded, /I could not tell which option is safer/);
  assert.equal(result.newKinds.length, 1);
});

function miniRegister(older) {
  return [
    { ...register[2], doc_id: 'DOC-01', precedence_rank: 3, date_on_document: older ? '2026-01-01' : '2026-09-01' },
    { ...register[3], doc_id: 'DOC-02', precedence_rank: 7, date_on_document: '2026-06-01' },
  ];
}
const miniFacts = [
  { fact_id: 'FCT-001', subject: 'Database', fact_type: 'attribute', value: 'The database runs version 14', source_refs: [{ doc_id: 'DOC-01', location: 'answer 1', quote: 'version 14' }], confidence: 'high', status: 'proposed' },
  { fact_id: 'FCT-002', subject: 'Database', fact_type: 'attribute', value: 'The database runs version 15', source_refs: [{ doc_id: 'DOC-02', location: 'section 2', quote: 'version 15' }], confidence: 'high', status: 'proposed' },
];
const versionReply = { same_names: [], duplicates: [], conflicts: [{ kind: 'version', aspect: 'version', subject: 'Database', description: 'Two versions.', sides: [{ fact_ids: ['FCT-001'], reading: 'stated', says: null }, { fact_ids: ['FCT-002'], reading: 'stated', says: null }] }] };

test('a version difference is settled by rank and the loser kept', async () => {
  const result = await runKey(versionReply, { register: miniRegister(false), rawFacts: miniFacts });
  const [conflict] = result.conflicts;
  assert.equal(conflict.kind, 'version');
  assert.equal(conflict.auto_resolved, true);
  assert.deepEqual(conflict.loser_fact_ids, ['FCT-002']);
  assert.equal(result.rationale[0].attention, 'information');
});

test('an older higher-ranked document is never settled automatically', async () => {
  const result = await runKey(versionReply, { register: miniRegister(true), rawFacts: miniFacts });
  const [conflict] = result.conflicts;
  assert.equal(conflict.kind, 'older_higher_precedence');
  assert.equal(conflict.auto_resolved, false);
  assert.equal(result.rationale[0].attention, 'needs_attention');
  assert.ok(result.facts.every((f) => f.group === 'needs_you'));
});

test('weaker authentication is assumed when one side says there is none', async () => {
  const reply = { same_names: [], duplicates: [], conflicts: [{ kind: 'entry_point_authentication', aspect: 'authentication', subject: 'Database', description: 'Auth differs.', sides: [{ fact_ids: ['FCT-001'], reading: 'present', says: 'uses passwords' }, { fact_ids: ['FCT-002'], reading: 'none', says: 'has no authentication' }] }] };
  const result = await runKey(reply, { register: miniRegister(false), rawFacts: miniFacts });
  assert.match(result.rationale[0].assumed, /weaker option/);
});

// ── Failure ───────────────────────────────────────────────────────────────────

for (const [name, reply] of [['an API error', new Error('down')], ['a refusal', null]]) {
  test(`after ${name}, facts are joined by exact name only and a gap item is added`, async () => {
    const result = await runKey(reply);
    assert.equal(result.conflicts.length, 0);
    assert.ok(result.facts.length < rawFacts.length, 'same-name existence facts still joined');
    const gap = result.rationale.find((r) => r.kind === 'gap');
    assert.equal(gap.title, 'Facts were not compared across documents');
    assert.equal(gap.attention, 'needs_attention');
    assert.ok(result.log.some((l) => l.error));
  });
}
