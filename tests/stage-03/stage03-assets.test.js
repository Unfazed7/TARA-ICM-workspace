'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage03-'));
const ENV = { LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'test-key', LLM_STREAM: '0', LLM_AUDIT_FILE: path.join(tmp, 'audit.jsonl') };
const saved = Object.fromEntries(Object.keys(ENV).map((k) => [k, process.env[k]]));
Object.assign(process.env, ENV);
delete process.env.LLM_MODEL;

const { runStage03, buildSystemPrompt } = require('../../tara-workspace/web-based-tara/stages/03-asset-identification/agent');

const EXPECTED = path.join(__dirname, '..', 'fixtures', 'synthetic', 'item-01', 'expected');
const def = JSON.parse(fs.readFileSync(path.join(EXPECTED, 'item-definition.json'), 'utf8'));
const decisions = JSON.parse(fs.readFileSync(path.join(EXPECTED, 'scope-decisions.json'), 'utf8'));
const SCHEMAS = path.join(__dirname, '..', '..', 'src', 'schemas');

const prop = (applies, reason = 'It matters because the component carries this.', unsure = false) => ({ applies, reason, unsure });
const ciaaan = (on = ['integrity']) => Object.fromEntries(['confidentiality', 'integrity', 'availability', 'authenticity', 'authorization', 'non_repudiation'].map((p) => [p, prop(on.includes(p))]));
const row = (source_id, title, asset_type, on) => ({ source_id, title, asset_type, description: `${title} in the portal.`, reason: `${title} is worth protecting.`, ciaaan: ciaaan(on) });

function fakeFetch(assets, capture = {}) {
  return async (url, init) => {
    capture.body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ id: 'gen-1', model: 'fake/model', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ assets }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }) };
  };
}

function validate(data, file) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const check = ajv.compile(JSON.parse(fs.readFileSync(path.join(SCHEMAS, file), 'utf8')));
  return { valid: check(data), errors: check.errors };
}

test.after(() => {
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the prompt is CONTEXT.md plus the references it lists, read at run time', () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /# Stage 03: Asset Identification/);
  assert.match(prompt, /# Reference: web-asset-types\.md/);
  assert.match(prompt, /# Reference: ciaaan-properties\.md/);
  assert.match(prompt, /Output instructions/);
});

test('code enforces the hard rules and the register is schema-valid', async () => {
  // EL-001 is an interface (people), EL-009 the API gateway (in scope). EL-005 is made out of scope for this test.
  const scopes = decisions.map((d) => (d.element_id === 'EL-005' ? { ...d, status: 'out_of_scope' } : d));
  const capture = {};
  const result = await runStage03({
    itemDefinition: def,
    scopeDecisions: scopes,
    timestamp: '2026-10-26T10:00:00Z',
    fetchImpl: fakeFetch([
      row('EL-009', 'API gateway', 'api_endpoint', ['integrity', 'availability', 'authorization']),
      row('CTR-01', 'Portal cloud account', 'cloud_service', ['integrity']), // container: dropped
      row('EL-005', 'CDN', 'cloud_service', ['availability']), // out of scope: dropped
      row('EL-001', 'Operators data', 'data_store', ['confidentiality']), // interface, not the item's side: dropped
      row('EL-001', 'Operator sign-in identity', 'auth_credential', ['authenticity']), // interface, item's side: kept
      row('EL-999', 'Ghost', 'cloud_service', ['integrity']), // unknown source: dropped
      row('FN-001', 'Sign in', 'function', ['authorization']),
      row('EL-006', 'Nothing applies', 'data_store', []), // no property applies: dropped
    ], capture),
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.register.map((a) => a.source_element_id), ['EL-009', 'EL-001', 'FN-001']);
  assert.deepEqual(result.register.map((a) => a.asset_id), ['AS_01', 'AS_02', 'AS_03']);
  assert.equal(result.dropped.length, 5);
  assert.ok(result.register.every((a) => a.input_mode === 'diagram' && Object.keys(a.ciaaan).length === 6));
  assert.equal(validate(result.register, 'stage-03-asset-register.schema.json').valid, true);

  // one Assumption per asset and per property, with a topic set by code and no review gate
  assert.equal(result.rationale.length, 3 * 7);
  assert.equal(validate(result.rationale, 'rationale.schema.json').valid, true);
  assert.ok(result.rationale.every((r) => r.stage === '03' && r.review.status === 'unreviewed'));

  // the model got the item definition, never client documents, and the model comes from models.json
  assert.match(capture.body.messages[1].content, /EL-009/);
  assert.equal(capture.body.model, 'anthropic/claude-sonnet-5.5');
});

test('an unsure property becomes a needs-attention Assumption', async () => {
  const unsure = row('EL-009', 'API gateway', 'api_endpoint', ['integrity']);
  unsure.ciaaan.confidentiality = prop(false, 'The documents do not say what passes through it.', true);
  const result = await runStage03({ itemDefinition: def, scopeDecisions: decisions, fetchImpl: fakeFetch([unsure]) });
  const flagged = result.rationale.filter((r) => r.attention === 'needs_attention');
  assert.equal(flagged.length, 1);
  assert.match(flagged[0].title, /Confidentiality does not apply/);
});

test('output with nothing identified is reported, not written as a register', async () => {
  const result = await runStage03({ itemDefinition: def, scopeDecisions: decisions, fetchImpl: fakeFetch([row('CTR-01', 'Account', 'cloud_service', ['integrity'])]) });
  assert.equal(result.register.length, 0);
  assert.ok(result.errors.length > 0);
});
