'use strict';

// Stage 02 Item Definition (spec 21). The model is faked from item-01's answer key:
// the build reply describes the key's items by name, and code must reproduce the key's
// ids, exposure, parents, scope decisions and questions.

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOT, readJson } = require('../helpers/schema-validation');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage02-'));
const saved = { key: process.env.OPENROUTER_API_KEY, audit: process.env.LLM_AUDIT_FILE, provider: process.env.LLM_PROVIDER, model: process.env.LLM_MODEL };
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.LLM_AUDIT_FILE = path.join(tmp, 'audit.jsonl');
delete process.env.LLM_PROVIDER;
delete process.env.LLM_MODEL;

const WEB = path.join(ROOT, 'tara-workspace', 'web-based-tara');
const { runStage02, seedStage02 } = require(path.join(WEB, 'stages', '02-item-definition', 'agent.js'));
const scope = require(path.join(WEB, '_engines', 'scope-rules.js'));

const KEY = path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const key = {
  register: readJson(path.join(KEY, 'document-register.json')),
  facts: readJson(path.join(KEY, 'facts.json')),
  conflicts: readJson(path.join(KEY, 'conflicts.json')),
  item: readJson(path.join(KEY, 'item-definition.json')),
  scope: readJson(path.join(KEY, 'scope-decisions.json')),
  questions: readJson(path.join(KEY, 'questions.json')),
};
const boundary = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01', 'inputs', 'boundary.txt'), 'utf8');
const stage01 = { document_register: key.register, facts: key.facts, conflicts: key.conflicts };

test.after(() => {
  for (const [env, value] of [['OPENROUTER_API_KEY', saved.key], ['LLM_AUDIT_FILE', saved.audit], ['LLM_PROVIDER', saved.provider], ['LLM_MODEL', saved.model]]) {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── Fake model built from the answer key ──────────────────────────────────────

const names = new Map([
  ...key.item.elements.map((e) => [e.element_id, e.name]),
  ...key.item.containers.map((c) => [c.container_id, c.name]),
  ...key.item.zones.map((z) => [z.zone_id, z.name]),
]);
const linkName = (id) => {
  const l = key.item.links.find((x) => x.link_id === id);
  return `${names.get(l.source_id)} -> ${names.get(l.destination_id)}`;
};
const targetName = (id) => (id.startsWith('IF-') ? linkName(id) : names.get(id));
const asked = (target, ft) => key.questions.some((q) => q.target_id === target && q.fact_type === ft);
const nullData = (items) => (items || []).map((d) => ({ item: null, purpose: null, held_where: null, usable_by: null, ...d }));

function readingsFor(target, kind) {
  const r = (ft, value) => (asked(target, ft) ? 'unknown' : value);
  return {
    runs: r('FT-01', 'provider'), controls: r('FT-02', 'item_team'), shared: r('FT-03', 'dedicated'),
    reachable: r('FT-04', 'no'), data: r('FT-05', 'known'), environments_shared: r('FT-06', 'no'), pushes_changes: r('FT-07', 'yes'),
    fact_ids: [],
    ...(kind === 'identity_provider' && !asked(target, 'FT-03') ? { shared: 'shared' } : {}),
  };
}

function buildReply() {
  const i = key.item;
  return {
    item_name: i.item_name,
    boundary_proposal: null,
    zones: i.zones.map((z) => ({ name: z.name, kind: z.kind, fact_ids: z.fact_ids })),
    containers: i.containers.map((c) => ({ name: c.name, kind: c.kind, parent: c.parent_id ? names.get(c.parent_id) : null, zone: c.zone_id ? names.get(c.zone_id) : null, fact_ids: c.fact_ids, readings: readingsFor(c.container_id, c.kind) })),
    elements: i.elements.map((e) => {
      const trigger = scope.loadRules().kinds[e.kind];
      const openTopics = key.questions.filter((q) => q.target_id === e.element_id && q.fact_type === 'generic').map((q) => q.topic);
      return {
        name: e.name, kind: e.kind, kind_label: e.kind_label || null,
        container: e.parent_container_id ? names.get(e.parent_container_id) : null, zone: names.get(e.zone_id),
        provider: e.provider || null, hosting_type: e.hosting_type || null,
        internet_exposed: e.internet_exposed ? e.internet_exposed.value : 'unknown', exposure_fact_ids: e.internet_exposed ? e.internet_exposed.evidence_fact_ids : [],
        is_entry_point: e.is_entry_point, auth_method: e.auth_method || null, owner_operator: e.owner_operator,
        data_handled: nullData(e.data_handled), stated_security_config: e.stated_security_config || [], fact_ids: e.fact_ids, confidence: e.confidence,
        readings: readingsFor(e.element_id, e.kind),
        answered_topics: trigger.topics.filter((t) => !openTopics.includes(t)),
      };
    }),
    links: i.links.map((l) => ({
      type: l.type, source: names.get(l.source_id), destination: names.get(l.destination_id), direction: l.direction, protocol: l.protocol, port: l.port || null,
      usage_at_destination: l.usage_at_destination, authentication: l.authentication, encryption: l.encryption, data_carried: nullData(l.data_carried),
      remark: l.remark, sync_async: l.sync_async || null, inferred_from_text: l.inferred_from_text, fact_ids: l.fact_ids, confidence: l.confidence,
    })),
    functions: i.functions.map((f) => ({
      name: f.name, description: f.description, actors: f.actor_ids.map((id) => names.get(id)), elements: f.element_ids.map((id) => names.get(id)),
      endpoints: f.endpoints || [], data_read: nullData(f.data_read), data_written: nullData(f.data_written), privileged: f.privileged, fact_ids: f.fact_ids,
    })),
    assumptions: i.assumptions.map((a) => ({ text: a.text, fact_ids: a.based_on.filter((b) => b.startsWith('FCT-')) })),
    responsibility_split: i.responsibility_split.map((r) => ({ element: names.get(r.element_id), provider_side: r.provider_side, customer_side: r.customer_side })),
    stated_control_fact_ids: i.stated_control_fact_ids,
    stated_absence_fact_ids: i.stated_absence_fact_ids,
    stakeholders: i.stakeholders,
  };
}

const suggestReply = () => ({
  questions: key.questions.map((q) => ({ target: targetName(q.target_id), fact_type: q.fact_type, topic: q.topic || null, text: q.text, why_it_matters: q.why_it_matters, default_if_unanswered: q.default_if_unanswered })),
});

const READING_OF = { 'FT-03': (target) => (target.startsWith('CTR') ? 'dedicated' : 'shared'), 'FT-04': () => 'yes' };
function answerReply(body) {
  const lines = body.messages[1].content.split('\n\nFacts')[0].split('\n').slice(1);
  const answers = [];
  for (const line of lines) {
    const m = /^(q\d+) \[(FT-0\d|generic)(?:: ([^\]]+))?\] about (.*?): /.exec(line);
    const dropped = key.questions.find((q) => q.status === 'dropped_answered_by_docs' && q.fact_type === m[2] && targetName(q.target_id) === m[4]);
    if (!dropped) {
      answers.push({ question: m[1], answered: false, fact_ids: [], quote: null, reading: 'none' });
      continue;
    }
    const target = key.item.elements.find((e) => e.element_id === dropped.target_id) || key.item.containers.find((c) => c.container_id === dropped.target_id);
    const fact = key.facts.find((f) => f.fact_id === target.fact_ids[0]);
    answers.push({ question: m[1], answered: true, fact_ids: [fact.fact_id], quote: fact.source_refs[0].quote, reading: READING_OF[dropped.fact_type](dropped.target_id) });
  }
  return { answers };
}

const explainReply = () => ({
  reasons: key.scope.map((d) => ({ element: names.get(d.element_id), reason: d.reason })),
});

function fakeModel(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    const name = body.response_format.json_schema.name;
    calls.push(name);
    const handlers = {
      item_definition: () => buildReply(),
      extra_questions: () => suggestReply(),
      question_answers: () => answerReply(body),
      scope_reasons: () => explainReply(),
      ...overrides,
    };
    const result = handlers[name](body);
    if (result instanceof Error) return { ok: false, status: 500, text: async () => result.message };
    return { ok: true, json: async () => ({ id: 'g', model: 'm', provider: 'Anthropic', usage: {}, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] }) };
  };
  return { fetchImpl, calls };
}

async function run(options = {}) {
  const model = fakeModel(options.overrides);
  const outDir = path.join(tmp, `out-${Math.random().toString(36).slice(2)}`);
  const out = await runStage02({ stage01: options.stage01 || stage01, boundary: options.boundary === undefined ? boundary : options.boundary, outDir, fetchImpl: model.fetchImpl });
  return { out, outDir, calls: model.calls };
}

const byName = (out) => new Map(out.itemDef.elements.map((e) => [e.name, e]));

// ── item-01 ───────────────────────────────────────────────────────────────────

test('item-01: four model calls, output passes the schema checks', async () => {
  const { out, calls } = await run();
  assert.deepEqual(calls, ['item_definition', 'extra_questions', 'question_answers', 'scope_reasons']);
  assert.deepEqual(out.errors, []);
  assert.equal(out.itemDef.elements.length, key.item.elements.length);
  assert.equal(out.itemDef.links.length, key.item.links.length);
});

test('item-01: exposure, parents, zones and trust boundaries match the answer key', async () => {
  const { out } = await run();
  const mine = byName(out);
  const ctrName = new Map(out.itemDef.containers.map((c) => [c.container_id, c.name]));
  const zoneName = new Map(out.itemDef.zones.map((z) => [z.zone_id, z.name]));
  for (const e of key.item.elements) {
    const m = mine.get(e.name);
    assert.ok(m, e.name);
    assert.deepEqual(m.internet_exposed, e.internet_exposed, `${e.name} exposure`);
    assert.equal(ctrName.get(m.parent_container_id), names.get(e.parent_container_id), `${e.name} parent`);
    assert.equal(zoneName.get(m.zone_id), names.get(e.zone_id), `${e.name} zone`);
  }
  assert.deepEqual(out.itemDef.links.map((l) => l.crosses_trust_boundary), key.item.links.map((l) => l.crosses_trust_boundary));
});

test('item-01: code decides the same scope as the answer key', async () => {
  const { out } = await run();
  const elementName = new Map(out.itemDef.elements.map((e) => [e.element_id, e.name]));
  const mine = new Map(out.itemDef.scope_decisions.map((d) => [elementName.get(d.element_id), d]));
  for (const d of key.scope) {
    const m = mine.get(names.get(d.element_id));
    assert.equal(m.status, d.status, `${names.get(d.element_id)} status`);
    assert.equal(m.assumed, d.assumed, `${names.get(d.element_id)} assumed`);
    assert.equal(m.based_on_question_ids.length > 0, d.based_on_question_ids.length > 0, `${names.get(d.element_id)} linked question`);
  }
});

test('item-01: questions match the answer key (target, fact type, status)', async () => {
  const { out } = await run();
  const idName = new Map([...out.itemDef.elements.map((e) => [e.element_id, e.name]), ...out.itemDef.containers.map((c) => [c.container_id, c.name])]);
  for (const l of out.itemDef.links) idName.set(l.link_id, `${idName.get(l.source_id)} -> ${idName.get(l.destination_id)}`);
  const sig = (name, q) => `${name}|${q.fact_type}|${q.status}`;
  const mine = out.questions.map((q) => sig(idName.get(q.target_id), q)).sort();
  const wanted = key.questions.map((q) => sig(targetName(q.target_id), q)).sort();
  assert.deepEqual(mine, wanted);
  assert.ok(out.questions.filter((q) => q.status === 'dropped_answered_by_docs').every((q) => q.answer && q.answered_by));
});

test('item-01: every open question appears once in the Rationale, and no text shows an id', async () => {
  const { out } = await run();
  for (const q of out.questions.filter((x) => x.status === 'open')) {
    const items = out.rationale.filter((r) => r.question_id === q.question_id || r.affects.includes(q.question_id));
    assert.equal(items.length, 1, `${q.question_id} appears ${items.length} times`);
  }
  for (const r of out.rationale) {
    for (const field of ['title', 'concluded', 'assumed', 'would_change']) assert.doesNotMatch(r[field], /\b(S\d{1,2}|FT-0\d|R-\d\d|EL-\d{3}|IF-\d\d|FCT-\d{3}|Q-\d{3})\b/, `${r.rationale_id} ${field}`);
  }
  for (const d of out.itemDef.scope_decisions) assert.doesNotMatch(d.reason, /\b(S\d{1,2}|FT-0\d)\b/);
});

// ── Code guards ───────────────────────────────────────────────────────────────

function withBuild(change) {
  return { item_definition: () => { const r = buildReply(); change(r); return r; } };
}

test('an element supported only by a rejected fact is never built', async () => {
  const rejected = key.facts.find((f) => f.status === 'rejected');
  const { out } = await run({ overrides: withBuild((r) => r.elements.push({ ...r.elements[15], name: 'Signing service', fact_ids: [rejected.fact_id] })) });
  assert.ok(!byName(out).has('Signing service'));
  assert.ok(out.log.some((l) => l.fact_id === rejected.fact_id && l.reason === 'refers to a rejected fact'));
});

test('a component no fact mentions is never invented', async () => {
  const { out } = await run({ overrides: withBuild((r) => r.elements.push({ ...r.elements[15], name: 'Web application firewall', kind: 'waf', fact_ids: ['FCT-999'] })) });
  assert.ok(!byName(out).has('Web application firewall'));
});

test('a link to a missing element is left out with an ambiguity', async () => {
  const { out } = await run({ overrides: withBuild((r) => r.links.push({ ...r.links[0], destination: 'Ghost service' })) });
  assert.equal(out.itemDef.links.length, key.item.links.length);
  assert.ok(out.rationale.some((x) => x.kind === 'ambiguity' && /Ghost service/.test(x.concluded)));
});

test('actors carry no provider, hosting or exposure; exposure needs evidence; "internal" means not exposed', async () => {
  const { out } = await run({
    overrides: withBuild((r) => {
      r.elements[0].provider = 'AWS';
      r.elements[0].internet_exposed = 'yes';
      const cache = r.elements.find((e) => e.name === 'Cache');
      cache.internet_exposed = 'yes';
      cache.exposure_fact_ids = [];
      const ilb = r.elements.find((e) => e.name === 'Internal load balancer');
      ilb.internet_exposed = 'unknown';
      ilb.exposure_fact_ids = [];
    }),
  });
  const mine = byName(out);
  assert.equal('provider' in mine.get('Operators'), false);
  assert.equal('internet_exposed' in mine.get('Operators'), false);
  assert.equal(mine.get('Cache').internet_exposed.value, 'unknown');
  assert.equal(mine.get('Internal load balancer').internet_exposed.value, 'no');
});

test('an open exposure disagreement makes the element exposed with an assumption', async () => {
  const { out } = await run({
    overrides: withBuild((r) => {
      const alb = r.elements.find((e) => e.name === 'Internet-facing load balancer');
      alb.internet_exposed = 'unknown';
      alb.exposure_fact_ids = [];
      r.assumptions = r.assumptions.filter((a) => !/load balancer/i.test(a.text));
    }),
  });
  assert.equal(byName(out).get('Internet-facing load balancer').internet_exposed.value, 'yes');
  assert.ok(out.itemDef.assumptions.some((a) => /Internet-facing load balancer/.test(a.text)));
});

test('a missing network boundary configuration is added for each network', async () => {
  const { out } = await run({ overrides: withBuild((r) => { r.elements = r.elements.filter((e) => e.kind !== 'network_boundary_configuration'); }) });
  const added = out.itemDef.elements.filter((e) => e.kind === 'network_boundary_configuration');
  assert.equal(added.length, 1);
  assert.equal(added[0].name, 'VPC boundary configuration');
  assert.deepEqual(out.errors, []);
});

test('an unknown kind is ambiguous, gets the full fact set (capped at 7) and is logged', async () => {
  const { out, outDir } = await run({
    overrides: withBuild((r) => {
      const e = r.elements.find((x) => x.name === 'Cache');
      e.kind = 'unknown_kind';
      e.kind_label = 'Quantum token mixer';
      e.internet_exposed = 'unknown';
      e.exposure_fact_ids = [];
      e.readings = { runs: 'unknown', controls: 'unknown', shared: 'unknown', reachable: 'unknown', data: 'unknown', environments_shared: 'unknown', pushes_changes: 'unknown', fact_ids: [] };
    }),
  });
  const cache = byName(out).get('Cache');
  const decision = out.itemDef.scope_decisions.find((d) => d.element_id === cache.element_id);
  assert.equal(decision.status, 'ambiguous');
  assert.equal(decision.assumed, true);
  assert.equal(out.questions.filter((q) => q.target_id === cache.element_id && q.status === 'open').length, 7);
  assert.match(fs.readFileSync(path.join(outDir, 'new-kinds.log'), 'utf8'), /Quantum token mixer/);
});

test('visible questions are capped at 3 per target', async () => {
  const extra = () => {
    const r = suggestReply();
    for (const ft of ['FT-02', 'FT-03', 'FT-05', 'FT-06']) r.questions.push({ target: 'API gateway', fact_type: ft, topic: null, text: 'Extra question about the gateway', why_it_matters: 'It matters a lot.', default_if_unanswered: 'Assume the worst.' });
    return r;
  };
  const { out } = await run({ overrides: { extra_questions: extra } });
  const gateway = byName(out).get('API gateway');
  assert.equal(out.questions.filter((q) => q.target_id === gateway.element_id && q.status === 'open').length, 3);
  assert.ok(out.log.some((l) => l.dropped === 'question over the cap'));
});

test('without a diagram every link is inferred from text; without a boundary one is proposed', async () => {
  const noDiagram = { ...stage01, document_register: key.register.filter((d) => d.doc_type !== 'diagram') };
  const { out } = await run({ stage01: noDiagram, boundary: null, overrides: withBuild((r) => { r.boundary_proposal = 'The certificate portal and everything the platform team deploys for it.'; }) });
  assert.ok(out.itemDef.links.every((l) => l.inferred_from_text));
  assert.equal(out.itemDef.boundary_statement.proposed, true);
});

test('when only the extra steps fail, standard reasons are used, questions stay open and a gap item says so', async () => {
  const down = () => new Error('down');
  const { out } = await run({ overrides: { extra_questions: down, question_answers: down, scope_reasons: down } });
  assert.deepEqual(out.errors, []);
  assert.ok(out.questions.every((q) => q.status === 'open'));
  const cicd = out.itemDef.scope_decisions.find((d) => d.element_id === byName(out).get('CI/CD pipeline').element_id);
  assert.match(cicd.reason, /build and release chain/);
  assert.ok(out.rationale.some((r) => r.title === 'Some checks did not run'));
});

test('when the build call fails, the stage stops with a clear message', async () => {
  await assert.rejects(() => run({ overrides: { item_definition: () => new Error('down') } }), /could not be built/);
});

test('seeding sends the item definition, questions and Rationale as one Stage 02 run', async () => {
  const { out } = await run();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.endsWith('/service-token')) return { ok: true, status: 200, json: async () => ({ access_token: 't' }) };
    return { ok: true, status: 201, json: async () => ({ run_number: 1, refused: [] }) };
  };
  await seedStage02({ api: 'http://api', assessmentId: 'A1', secret: 's', output: out, fetchImpl });
  assert.equal(calls[1].url, 'http://api/api/v1/assessments/A1/stages/02/runs');
  assert.deepEqual(Object.keys(calls[1].body), ['item_definition', 'questions', 'rationale']);
  assert.equal(calls[1].body.item_definition.scope_decisions.length, key.item.elements.length);
});

test('the rules come from scoping-facts.md: every element kind in the schema has a row', () => {
  const kinds = readJson(path.join(ROOT, 'src', 'schemas', 'stage-02-item-definition.schema.json')).properties.elements.items.properties.kind.enum;
  const rules = scope.loadRules();
  for (const k of kinds) assert.ok(rules.kinds[k], `no rule row for ${k}`);
  for (const t of Object.values(rules.kinds).flatMap((k) => k.topics)) assert.ok(rules.topics[t], `no wording for topic "${t}"`);
});
