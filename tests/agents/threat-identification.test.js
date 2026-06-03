'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildThreatsWithClaude,
  callClaudeForDamageScenario,
  validateThreats
} = require('../../tara-workspace/web-based-tara/stages/03-threat-identification/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('threat identification creates exactly one threat per damage scenario via Claude tool_use', async () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let requestBody = null;
  const fakeFetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        content: [{
          type: 'tool_use',
          name: 'submit_threat',
          input: {
            stride_category: 'elevation_of_privilege',
            threat_statement: 'Diagnostic API Endpoint authorization checks may be bypassed to invoke privileged diagnostic actions.',
            derivation_note: 'The damage scenario concerns authorization failure, which maps to elevation of privilege.',
            owasp_reference: 'A01'
          }
        }]
      })
    };
  };

  const threats = await buildThreatsWithClaude(damage, {
    fetchImpl: fakeFetch,
    timestamp: '2026-06-01T10:02:00Z'
  });
  restoreEnv('ANTHROPIC_API_KEY', previousKey);

  assert.deepEqual(requestBody.tool_choice, { type: 'tool', name: 'submit_threat' });
  assert.equal(requestBody.tools[0].name, 'submit_threat');
  assert.equal(threats.length, damage.length);
  assert.equal(validateSchema(threats, readJson(schemaPath(3))).valid, true);
});

test('generic threat without asset title is rejected', () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const threats = [{
    threat_id: 'TH_01',
    damage_scenario_id: 'DS_01',
    asset_id: 'AS_01',
    asset_title: 'Diagnostic API Endpoint',
    property: 'authorization',
    stride_category: 'elevation_of_privilege',
    threat_statement: 'Authorization checks may be bypassed.',
    derivation_note: 'Derived from DS_01.',
    owasp_reference: 'A01',
    created_timestamp: '2026-06-01T10:02:00Z'
  }];
  threats[0].threat_statement = 'Authorization checks may be bypassed.';
  assert.throws(() => validateThreats(threats, damage), /does not contain asset title/);
});

test('invalid stride category is rejected', () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const threats = [{
    threat_id: 'TH_01',
    damage_scenario_id: 'DS_01',
    asset_id: 'AS_01',
    asset_title: 'Diagnostic API Endpoint',
    property: 'authorization',
    stride_category: 'invalid_stride',
    threat_statement: 'Diagnostic API Endpoint authorization checks may be bypassed.',
    derivation_note: 'Derived from DS_01.',
    owasp_reference: 'A01',
    created_timestamp: '2026-06-01T10:02:00Z'
  }];
  assert.throws(() => validateThreats(threats, damage), /Invalid stride_category/);
});

test('empty damage input fails', async () => {
  await assert.rejects(() => buildThreatsWithClaude([]), /No damage scenarios to process/);
});

test('threat identification retries once on free text before accepting tool_use', async () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => calls === 1
        ? { content: [{ type: 'text', text: 'free text' }] }
        : {
            content: [{
              type: 'tool_use',
              name: 'submit_threat',
              input: {
                stride_category: 'elevation_of_privilege',
                threat_statement: 'Diagnostic API Endpoint authorization checks may be bypassed to invoke privileged diagnostic actions.',
                derivation_note: 'Retry produced structured threat.',
                owasp_reference: 'A01'
              }
            }]
          }
    };
  };

  const threats = await buildThreatsWithClaude(damage, { fetchImpl: fakeFetch });
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
  assert.equal(calls, 2);
  assert.equal(threats.length, 1);
});

test('threat identification Claude path fails without API key', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForDamageScenario(
      readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'))[0],
      async () => { throw new Error('not called'); }
    ),
    /ANTHROPIC_API_KEY is required/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});
