'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-client-'));
const auditFile = path.join(tmp, 'audit.jsonl');
const modelsFile = path.join(tmp, 'models.json');

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'LLM_MODEL', 'LLM_MODELS_FILE', 'LLM_AUDIT_FILE', 'LLM_BASE_URL'];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

const { callLLM, isRefusal } = require('../../tara-workspace/web-based-tara/stages/llm-client');

function writeModels(overrides = {}) {
  const models = {
    provider_routing: { service: 'openrouter', allow_fallbacks: false },
    default: { model: 'anthropic/claude-sonnet-5.5', provider: 'google-vertex/global', temperature: null, max_tokens: 1000, prompt_version: 'UNSET' },
    stages: {
      '01-extract-text': { model: 'anthropic/claude-sonnet-5.5', provider: 'google-vertex/global', temperature: null, max_tokens: 8000, prompt_version: 'extract-v1' },
      'unset-stage': { model: 'UNSET', provider: 'UNSET', temperature: 0, max_tokens: 100, prompt_version: 'UNSET' },
      ...overrides,
    },
  };
  fs.writeFileSync(modelsFile, JSON.stringify(models));
}

function setEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.LLM_MODELS_FILE = modelsFile;
  process.env.LLM_AUDIT_FILE = auditFile;
  process.env.OPENROUTER_API_KEY = 'test-key';
}

function fakeFetch(responseBody, capture) {
  return async (url, init) => {
    capture.url = url;
    capture.headers = init.headers;
    capture.body = JSON.parse(init.body);
    return { ok: true, json: async () => responseBody };
  };
}

const okResponse = {
  id: 'gen-123',
  model: 'anthropic/claude-sonnet-5.5',
  provider: 'Anthropic',
  usage: { prompt_tokens: 120, completion_tokens: 30 },
  choices: [{ finish_reason: 'stop', message: { content: '{"facts":[]}' } }],
};

test.beforeEach(() => {
  writeModels();
  setEnv();
  fs.rmSync(auditFile, { force: true });
});

test.after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('sends the pinned model and provider with fallbacks off', async () => {
  const cap = {};
  await callLLM({ stage: '01-extract-text', system: 'sys', messages: [{ role: 'user', content: 'hi' }] }, fakeFetch(okResponse, cap));
  assert.equal(cap.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(cap.body.model, 'anthropic/claude-sonnet-5.5');
  assert.deepEqual(cap.body.provider, { only: ['google-vertex/global'], allow_fallbacks: false });
  assert.equal(cap.body.max_tokens, 8000);
  assert.equal('temperature' in cap.body, false);
  assert.equal(cap.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(cap.body.messages[0], { role: 'system', content: 'sys' });
});

test('asks for strict JSON output when a schema is given', async () => {
  const cap = {};
  const schema = { type: 'object', properties: { facts: { type: 'array' } }, required: ['facts'], additionalProperties: false };
  await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }], response_schema: { name: 'facts', schema } }, fakeFetch(okResponse, cap));
  assert.deepEqual(cap.body.response_format, { type: 'json_schema', json_schema: { name: 'facts', strict: true, schema } });
});

test('falls back to the default entry when no stage is given', async () => {
  const cap = {};
  await callLLM({ messages: [{ role: 'user', content: 'x' }] }, fakeFetch(okResponse, cap));
  assert.equal(cap.body.model, 'anthropic/claude-sonnet-5.5');
  assert.equal(cap.body.max_tokens, 1000);
});

test('writes one audit record per call', async () => {
  await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }] }, fakeFetch(okResponse, {}));
  const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const rec = JSON.parse(lines[0]);
  assert.equal(rec.stage, '01-extract-text');
  assert.equal(rec.model_requested, 'anthropic/claude-sonnet-5.5');
  assert.equal(rec.model_served, 'anthropic/claude-sonnet-5.5');
  assert.equal(rec.provider_pinned, 'google-vertex/global');
  assert.equal(rec.provider_served, 'Anthropic');
  assert.equal(rec.prompt_version, 'extract-v1');
  assert.equal(rec.input_tokens, 120);
  assert.equal(rec.output_tokens, 30);
  assert.equal(rec.request_id, 'gen-123');
  assert.equal(rec.stop_reason, 'stop');
});

test('reports a refusal instead of throwing', async () => {
  const refused = { ...okResponse, choices: [{ finish_reason: 'content_filter', message: { content: null } }] };
  const res = await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }] }, fakeFetch(refused, {}));
  assert.equal(res.stop_reason, 'refusal');
  assert.equal(isRefusal(res), true);
});

test('fails loudly when the stage model is not set', async () => {
  await assert.rejects(
    () => callLLM({ stage: 'unset-stage', messages: [{ role: 'user', content: 'x' }] }, async () => { throw new Error('not called'); }),
    /Model for stage unset-stage is not set in _config\/models.json/
  );
});

test('fails clearly without an API key', async () => {
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(
    () => callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }] }, async () => { throw new Error('not called'); }),
    /OPENROUTER_API_KEY is required/
  );
});

test('LLM_MODEL overrides the model and is recorded', async () => {
  process.env.LLM_MODEL = 'openai/gpt-6.1-sol';
  const cap = {};
  await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }] }, fakeFetch(okResponse, cap));
  assert.equal(cap.body.model, 'openai/gpt-6.1-sol');
  const rec = JSON.parse(fs.readFileSync(auditFile, 'utf8').trim());
  assert.equal(rec.model_overridden_by_env, true);
});

test('throws on an HTTP error with the status', async () => {
  const failing = async () => ({ ok: false, status: 401, text: async () => 'bad key' });
  await assert.rejects(
    () => callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'x' }] }, failing),
    /LLM API error 401: bad key/
  );
});

test('the repo models.json pins a model for every stage', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tara-workspace', 'web-based-tara', '_config', 'models.json'), 'utf8'));
  for (const [stage, entry] of Object.entries({ default: real.default, ...real.stages })) {
    assert.notEqual(entry.model, 'UNSET', `${stage} has no model`);
    assert.notEqual(entry.provider, 'UNSET', `${stage} has no provider`);
    assert.ok(entry.provider || entry.routing, `${stage} has neither a pinned host nor routing rules`);
  }
  // Steps that send images or scanned PDF pages stay on a model that reads them (D-49).
  for (const stage of ['01-extract-image', '01-extract-pdf-page']) {
    assert.match(real.stages[stage].model, /^anthropic\//, `${stage} must read images`);
  }
  assert.equal(real.provider_routing.allow_fallbacks, false);
});

test('nullable enums are sent in a form strict providers accept', () => {
  const { toStrictSchema } = require('../../tara-workspace/web-based-tara/stages/llm-client');
  const schema = {
    type: 'object',
    properties: {
      hosting: { type: ['string', 'null'], enum: ['managed', 'unknown', null] },
      plain: { type: 'string', enum: ['a', 'b'] },
      list: { type: 'array', items: { type: 'object', properties: { mode: { type: ['string', 'null'], enum: ['sync', null] } } } },
    },
  };
  const out = toStrictSchema(schema);
  assert.deepEqual(out.properties.hosting, { anyOf: [{ type: 'string', enum: ['managed', 'unknown'] }, { type: 'null' }] });
  assert.deepEqual(out.properties.plain, { type: 'string', enum: ['a', 'b'] });
  assert.deepEqual(out.properties.list.items.properties.mode, { anyOf: [{ type: 'string', enum: ['sync'] }, { type: 'null' }] });
  const text = JSON.stringify(out);
  assert.ok(!/"type":\["string","null"\],"enum"/.test(text));
});

test('every Stage 02 model schema has no enum on a type list', () => {
  const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../tara-workspace/web-based-tara/stages/02-item-definition/lib/model.js'), 'utf8');
  assert.ok(!/type: \[[^\]]*\], enum/.test(src));
});

test('every model schema the stages send stays within the provider union limit', () => {
  const { prepareSchema, countUnions, UNION_LIMIT } = require('../../tara-workspace/web-based-tara/stages/llm-client');
  const stage02 = require('../../tara-workspace/web-based-tara/stages/02-item-definition/lib/model');
  const extract = require('../../tara-workspace/web-based-tara/stages/01-input-normalization/lib/extract');
  const reconcile = require('../../tara-workspace/web-based-tara/_engines/fact-reconcile');
  const schemas = {
    BUILD: stage02.BUILD_SCHEMA, SUGGEST: stage02.SUGGEST_SCHEMA, ANSWER: stage02.ANSWER_SCHEMA, REASON: stage02.REASON_SCHEMA,
    TEXT: extract.TEXT_SCHEMA, IMAGE_INVENTORY: extract.IMAGE_INVENTORY_SCHEMA, IMAGE_LINKS: extract.IMAGE_LINKS_SCHEMA,
    COMPARE: reconcile.COMPARE_SCHEMA,
  };
  for (const [name, schema] of Object.entries(schemas)) {
    assert.ok(countUnions(prepareSchema(schema).send) <= UNION_LIMIT, `${name} sends too many union fields`);
  }
  assert.ok(countUnions(stage02.BUILD_SCHEMA) > UNION_LIMIT, 'the build schema is the case that needs flattening');
});

test('a flattened schema sends "" for none and the caller still gets null', async () => {
  const nullable = { type: ['string', 'null'] };
  const fields = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`f${i}`, nullable]));
  const schema = {
    type: 'object', additionalProperties: false, required: [...Object.keys(fields), 'mode', 'list'],
    properties: {
      ...fields,
      mode: { anyOf: [{ type: 'string', enum: ['sync', 'async'] }, { type: 'null' }] },
      list: { type: 'array', items: { type: 'object', properties: { port: nullable, name: { type: 'string' } } } },
    },
  };
  const reply = { ...Object.fromEntries(Object.keys(fields).map((k) => [k, ''])), f0: 'kept', mode: '', list: [{ port: '', name: '' }] };
  const cap = {};
  const response = await callLLM(
    { stage: '01-extract-text', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema } },
    fakeFetch({ ...okResponse, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(reply) } }] }, cap),
  );
  const sent = cap.body.response_format.json_schema.schema;
  assert.deepEqual(sent.properties.f1, { type: 'string' });
  assert.deepEqual(sent.properties.mode, { type: 'string', enum: ['sync', 'async', ''] });
  const out = JSON.parse(response.content[0].text);
  assert.equal(out.f0, 'kept');
  assert.equal(out.f1, null);
  assert.equal(out.mode, null);
  assert.deepEqual(out.list, [{ port: null, name: '' }]);
});

test('a schema the provider refuses for size falls back to JSON in the prompt, checked by code', async () => {
  const schema = { type: 'object', additionalProperties: false, required: ['name', 'port'], properties: { name: { type: 'string' }, port: { type: ['string', 'null'] } } };
  const bodies = [];
  let call = 0;
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    call += 1;
    if (call === 1) return { ok: false, status: 400, text: async () => '{"error":{"message":"The compiled grammar is too large, which would cause performance issues."}}' };
    if (call === 2) return { ok: true, json: async () => ({ ...okResponse, choices: [{ finish_reason: 'stop', message: { content: 'Here it is: {"name": 5}' } }] }) };
    return { ok: true, json: async () => ({ ...okResponse, choices: [{ finish_reason: 'stop', message: { content: '```json\n{"name":"gateway","port":null,"extra":"dropped"}\n```' } }] }) };
  };
  const result = await callLLM({ stage: '01-extract-text', system: 'sys', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema } }, fetchImpl);
  assert.equal(call, 3);
  assert.ok(bodies[0].response_format);
  assert.equal(bodies[1].response_format, undefined);
  assert.match(bodies[1].messages[0].content, /matches this JSON Schema/);
  assert.match(bodies[2].messages.at(-1).content, /does not match the schema/);
  assert.deepEqual(JSON.parse(result.content[0].text), { name: 'gateway', port: null });
});

test('other provider errors are not retried', async () => {
  let call = 0;
  const fetchImpl = async () => { call += 1; return { ok: false, status: 400, text: async () => 'bad request' }; };
  await assert.rejects(callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema: { type: 'object', properties: {} } } }, fetchImpl), /LLM API error 400/);
  assert.equal(call, 1);
});

test('a step without a pinned host sends its routing rules instead', async () => {
  writeModels({ 'routed': { model: 'deepseek/deepseek-v4-pro-0813', provider: null, routing: { data_collection: 'deny', require_parameters: true }, temperature: null, max_tokens: 100, prompt_version: 'x' } });
  const cap = {};
  await callLLM({ stage: 'routed', messages: [{ role: 'user', content: 'hi' }] }, fakeFetch(okResponse, cap));
  assert.equal(cap.body.model, 'deepseek/deepseek-v4-pro-0813');
  assert.deepEqual(cap.body.provider, { data_collection: 'deny', require_parameters: true });
});

test('a schema reply wrapped in text is cleaned, and an unreadable one is asked for again', async () => {
  const schema = { type: 'object', properties: { facts: { type: 'array' } } };
  const replies = ['Sure! ```json\n{"facts":[1]}\n```', 'I could not do that.', '{"facts":[]}'];
  let call = 0;
  const fetchImpl = async () => {
    const content = replies[call];
    call += 1;
    return { ok: true, json: async () => ({ ...okResponse, choices: [{ finish_reason: 'stop', message: { content } }] }) };
  };
  const first = await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema } }, fetchImpl);
  assert.deepEqual(JSON.parse(first.content[0].text), { facts: [1] });
  const second = await callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema } }, fetchImpl);
  assert.deepEqual(JSON.parse(second.content[0].text), { facts: [] });
  assert.equal(call, 3);
});

test('a reply cut off at the output limit says so', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ ...okResponse, choices: [{ finish_reason: 'length', message: { content: '{"facts":[{"a"' } }] }) });
  await assert.rejects(
    callLLM({ stage: '01-extract-text', messages: [{ role: 'user', content: 'hi' }], response_schema: { name: 'x', schema: { type: 'object' } } }, fetchImpl),
    /cut off at the output limit \(8000 tokens\)/,
  );
});
