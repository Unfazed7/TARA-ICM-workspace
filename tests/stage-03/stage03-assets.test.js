'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage03-'));
const ENV = { LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'test-key', LLM_STREAM: '0', LLM_AUDIT_FILE: path.join(tmp, 'audit.jsonl') };
const saved = Object.fromEntries(Object.keys(ENV).map((k) => [k, process.env[k]]));
Object.assign(process.env, ENV);
delete process.env.LLM_MODEL;

const ROOT = path.join(__dirname, '..', '..');
const WEB = path.join(ROOT, 'tara-workspace', 'web-based-tara');
const { parse, loadRules, defaultProperties } = require(path.join(WEB, '_engines', 'asset-rules'));
const { deriveCandidates, joinName } = require(path.join(WEB, 'stages', '03-asset-identification', 'lib', 'candidates'));
const { applyReply } = require(path.join(WEB, 'stages', '03-asset-identification', 'lib', 'checks'));
const { runStage03 } = require(path.join(WEB, 'stages', '03-asset-identification', 'agent'));
const { fakeFetch } = require('../helpers/fake-asset-model');

const EXPECTED = path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const read = (name) => JSON.parse(fs.readFileSync(path.join(EXPECTED, name), 'utf8'));
const def = read('item-definition.json');
const scope = read('scope-decisions.json');
const facts = read('facts.json');
const rules = loadRules();

test.after(() => {
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── the rules table ───────────────────────────────────────────────────────────

test('the rules table is read from the markdown, including Windows line endings', () => {
  const text = fs.readFileSync(path.join(WEB, '_config', 'asset-rules.md'), 'utf8').replace(/\n/g, '\r\n');
  const parsed = parse(text);
  assert.equal(parsed.components.get('database').prefix, 'DS');
  assert.deepEqual(parsed.components.get('api_gateway').defaults, ['Au', 'Az', 'I', 'A']);
  assert.deepEqual(parsed.components.get('microservice_workload').mayAdd, ['Az', 'C']);
  assert.ok(parsed.noRow.has('cdn'));
  assert.ok(parsed.sensitive.has('pii_direct'));
  assert.equal(parsed.registerTypes.get('WL'), 'function');
  assert.deepEqual(parsed.families.map((f) => f.prefix), ['EXT', 'NET', 'WL', 'DS', 'INF', 'API', 'IAM', 'COMM']);
});

test('"if data" adds properties only for the categories a component holds', () => {
  const bucket = rules.components.get('object_storage_bucket');
  assert.deepEqual(defaultProperties(bucket, new Set(['signed_metadata'])), ['I', 'A', 'Au']);
  assert.deepEqual(defaultProperties(bucket, new Set(['pii_direct'])), ['C', 'I']);
  assert.deepEqual(defaultProperties(bucket, new Set()), []);
});

test('an unknown property code in the rules is refused, not guessed', () => {
  assert.throws(() => parse('## 2. Components\n\n| Asset type | Prefix | Asset | Default | If data | Model may add |\n|---|---|---|---|---|---|\n| `cache` | DS | x | Q | | |\n'), /unknown property "Q"/);
});

// ── candidates, by code ───────────────────────────────────────────────────────

test('containers and out-of-scope components never produce assets; interfaces give only the item side', () => {
  const scopes = scope.map((d) => (d.element_id === 'EL-009' ? { ...d, status: 'out_of_scope' } : d));
  const { candidates } = deriveCandidates(def, scopes, rules);
  assert.ok(!candidates.some((c) => c.sourceIds.includes('EL-009') && c.kind === 'element'), 'out of scope: none');
  assert.ok(!candidates.some((c) => c.sourceIds.some((id) => id.startsWith('CTR-'))), 'containers: none');
  const iface = candidates.filter((c) => c.interface && c.kind === 'element');
  assert.ok(iface.length > 0 && iface.every((c) => c.prefix === 'EXT' && c.defaults.join() === 'Au,NR'));
});

test('credentials in a secrets store become credential assets and the cache starts with its table properties', () => {
  const { candidates } = deriveCandidates(def, scope, rules);
  assert.deepEqual(candidates.filter((c) => c.prefix === 'IAM').map((c) => c.name), ['CA signing key material and key policy', 'Database password', 'Notification service API key']);
  assert.deepEqual(candidates.find((c) => c.sourceIds[0] === 'EL-017').defaults, ['C', 'I', 'A', 'Au']);
});

test('a type with no table row goes to the model, not to the table', () => {
  const { candidates, unmatched } = deriveCandidates(def, scope, rules);
  assert.deepEqual(unmatched.map((u) => u.id), ['EL-005']);
  assert.ok(!candidates.some((c) => c.sourceIds.includes('EL-005') && c.kind === 'element'));
});

test('ids count up inside each family and names do not repeat a word', () => {
  assert.equal(joinName('Certificate service', 'service logic'), 'Certificate service logic');
  const { candidates } = deriveCandidates(def, scope, rules);
  const ws = candidates.filter((c) => c.prefix === 'WL').map((c) => c.assetId);
  assert.deepEqual(ws, ['WL-01', 'WL-02', 'WL-03', 'WL-04']);
});

// ── checks after the model ────────────────────────────────────────────────────

const row = (id, changes = [], extra = {}) => ({ id, name: '', description: '', would_change: '', reasons: {}, changes, duplicate_of: '', ...extra });

test('a Confidentiality proposal that is really a missing check becomes Authorization', () => {
  const derived = deriveCandidates(def, scope, rules);
  const { assets, notes } = applyReply({ ...derived, def, rules, reply: { assets: [row('WL-03', [{ property: 'C', applies: true, reason: 'There is no authorization check, so anyone could read it.' }])], additions: [] } });
  const a = assets.find((x) => x.assetId === 'WL-03');
  assert.equal(a.properties.C.applies, false);
  assert.equal(a.properties.Az.applies, true);
  assert.equal(a.properties.Az.origin, 'model');
  assert.equal(a.properties.Az.reviewed, false);
  assert.ok(notes.some((n) => n.kind === 'moved'));
});

test('a workload keeps Confidentiality off unless it holds data no data store covers', () => {
  const reason = 'It keeps the certificate requests it handles for a while.';
  const ask = (definition, id) => {
    const derived = deriveCandidates(definition, scope, rules);
    return applyReply({ ...derived, def: definition, rules, reply: { assets: [row(id, [{ property: 'C', applies: true, reason }])], additions: [] } });
  };
  // EL-015 (Certificate service): all its data is of kinds the certificate database and the secrets store already cover.
  const refused = ask(def, 'WL-03');
  assert.equal(refused.assets.find((x) => x.assetId === 'WL-03').properties.C.applies, false);
  assert.ok(refused.notes.some((n) => n.kind === 'rejected' && n.property === 'C'));
  // The same workload, now holding personal data that no store row covers: Confidentiality may be on, as a proposal.
  const other = JSON.parse(JSON.stringify(def));
  other.elements.find((e) => e.element_id === 'EL-015').data_handled.push({ item: 'Operator contact details', category: 'pii_direct' });
  const kept = ask(other, 'WL-03').assets.find((x) => x.assetId === 'WL-03');
  assert.equal(kept.properties.C.applies, true);
  assert.equal(kept.properties.C.reviewed, false);
  assert.equal(kept.properties.C.origin, 'model');
});

test('a row whose every consequence another row owns is removed and listed', () => {
  const derived = deriveCandidates(def, scope, rules);
  const { assets, notes } = applyReply({ ...derived, def, rules, reply: { assets: [row('NET-05', [], { duplicate_of: 'NET-01' })], additions: [] } });
  assert.ok(!assets.some((a) => a.assetId === 'NET-05'));
  assert.ok(assets.some((a) => a.assetId === 'NET-01'));
  assert.ok(notes.some((n) => n.kind === 'removed' && n.asset.assetId === 'NET-05'));
});

test('reasons with ids in them or too short are replaced by a standard reason', () => {
  const derived = deriveCandidates(def, scope, rules);
  const { assets } = applyReply({ ...derived, def, rules, reply: { assets: [row('DS-03', [], { reasons: { C: 'See EL-017 for why.', I: 'ok' } })], additions: [] } });
  const a = assets.find((x) => x.assetId === 'DS-03');
  assert.ok(!/EL-017/.test(a.properties.C.reason) && a.properties.C.reason.length >= 10);
  assert.ok(a.properties.I.reason.length >= 10);
});

test('an addition for a component the table has no row for is kept, marked proposed, and needs the analyst', () => {
  const derived = deriveCandidates(def, scope, rules);
  const props = ['C', 'I', 'A', 'Au', 'Az', 'NR'].map((p) => ({ property: p, applies: p === 'I', reason: 'A plain reason that is long enough.' }));
  const { assets } = applyReply({ ...derived, def, rules, reply: { assets: [], additions: [{ source_id: 'EL-005', prefix: 'INF', name: 'CDN delivery settings', description: 'How the CDN serves pages to users.', would_change: 'A document about the CDN.', reason: 'Users reach the portal through it.', properties: props }] } });
  const added = assets.find((a) => a.candidate.sourceIds[0] === 'EL-005');
  assert.equal(added.assetId, 'INF-02');
  assert.equal(added.candidate.hasRow, false);
  assert.ok(Object.values(added.properties).every((p) => p.origin === 'model' && p.reviewed === false));
  // an addition for a component that is not on the list is refused
  const refused = applyReply({ ...derived, def, rules, reply: { assets: [], additions: [{ source_id: 'EL-001', prefix: 'INF', name: 'Nothing', description: 'Does not exist here.', would_change: 'x', reason: 'A plain reason long enough.', properties: props }] } });
  assert.ok(refused.notes.some((n) => n.kind === 'rejected-addition'));
});

// ── the whole agent ───────────────────────────────────────────────────────────

test('the agent output on item-01 matches the checked answer and the schema', async () => {
  const captured = {};
  const result = await runStage03({ stage02: def, scopeDecisions: scope, stage01: { facts }, fetchImpl: fakeFetch(captured) });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.assets, read('assets.json'));
  assert.deepEqual(result.rationale, read('assets-rationale.json'));
  assert.equal(captured.body.model, 'anthropic/claude-sonnet-5.5');
  assert.deepEqual(result.log.without_table_row, ['INF-02']);
  assert.ok(result.rationale.every((r) => r.stage === '03' && r.topic === 'assets' && r.review.status === 'unreviewed'));
  // every asset traces to a component, function or connection that exists
  const known = new Set([...def.elements.map((e) => e.element_id), ...def.functions.map((f) => f.function_id), ...def.links.map((l) => l.link_id)]);
  assert.ok(result.assets.every((a) => a.source.ids.every((id) => known.has(id))));
  // nothing comes from an out-of-scope component
  assert.ok(!result.assets.some((a) => a.source.kind === 'element' && scope.some((d) => d.element_id === a.source.ids[0] && d.status === 'out_of_scope')));
  assert.ok(result.assets.every((a) => Object.values(a.properties).some((p) => p.applies)));
});

test('when the model fails, assets keep their starting properties and a gap Assumption says so', async () => {
  const broken = async () => ({ ok: false, status: 422, text: async () => 'no' });
  const result = await runStage03({ stage02: def, scopeDecisions: scope, stage01: { facts }, fetchImpl: broken });
  assert.deepEqual(result.errors, []);
  assert.ok(result.assets.length >= 40);
  assert.ok(result.assets.every((a) => Object.values(a.properties).every((p) => p.origin === 'default')));
  assert.equal(result.rationale.filter((r) => r.attention === 'needs_attention').length, 1);
});

test('an unavailable model stops the stage instead of falling back', async () => {
  const gone = async () => ({ ok: false, status: 404, text: async () => 'No endpoints found for x/y.' });
  await assert.rejects(() => runStage03({ stage02: def, scopeDecisions: scope, fetchImpl: gone }), /unavailable/);
});
