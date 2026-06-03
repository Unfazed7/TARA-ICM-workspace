'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDamageScenarios,
  buildDamageScenariosWithClaude,
  callClaudeForAsset,
  validateDamageScenarios
} = require('../../tara-workspace/web-based-tara/stages/02-damage-analysis/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('damage analysis creates one scenario per true CIAAAN property', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets, '2026-06-01T10:01:00Z');
  const expected = Object.values(assets[0].ciaaan).filter(Boolean).length;
  assert.equal(scenarios.length, expected);
  assert.equal(validateSchema(scenarios, readJson(schemaPath(2))).valid, true);
});

test('damage analysis rejects attacker language', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets);
  scenarios[0].damage_scenario = 'An attacker steals data.';
  assert.throws(() => validateDamageScenarios(scenarios, assets), /attacker language/);
});

test('damage analysis rejects duplicate asset/property pairs', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets);
  scenarios.push({ ...scenarios[0], damage_id: 'DS_99' });
  assert.throws(() => validateDamageScenarios(scenarios, assets), /Duplicate damage scenario/);
});

test('damage analysis uses forced Claude tool_choice per asset', async () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
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
          name: 'submit_damage_scenarios_for_asset',
          input: {
            damage_scenarios: [{
              property: 'authorization',
              damage_scenario: 'If the Authorization of Diagnostic API Endpoint is compromised, privileged diagnostic functionality is used outside the permitted access boundary affecting organization in the context of Diagnostic API Endpoint operations.',
              stakeholder_affected: 'organization'
            }]
          }
        }]
      })
    };
  };

  const scenarios = await buildDamageScenariosWithClaude([{
    ...assets[0],
    ciaaan: {
      confidentiality: false,
      integrity: false,
      availability: false,
      authenticity: false,
      authorization: true,
      non_repudiation: false
    }
  }], {
    fetchImpl: fakeFetch,
    timestamp: '2026-06-01T10:01:00Z'
  });
  restoreEnv('ANTHROPIC_API_KEY', previousKey);

  assert.deepEqual(requestBody.tool_choice, {
    type: 'tool',
    name: 'submit_damage_scenarios_for_asset'
  });
  assert.equal(requestBody.tools[0].name, 'submit_damage_scenarios_for_asset');
  assert.equal(scenarios.length, 1);
  assert.equal(scenarios[0].damage_id, 'DS_01');
  assert.equal(validateSchema(scenarios, readJson(schemaPath(2))).valid, true);
});

test('damage analysis rejects wrong Claude scenario count', async () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      content: [{
        type: 'tool_use',
        name: 'submit_damage_scenarios_for_asset',
        input: { damage_scenarios: [] }
      }]
    })
  });

  await assert.rejects(
    () => buildDamageScenariosWithClaude([assets[0]], { fetchImpl: fakeFetch }),
    /Wrong scenario count/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});

test('damage analysis Claude path fails without API key', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForAsset(
      readJson(fixturePath('valid', 'stage-01-asset-register.json'))[0],
      ['authorization'],
      async () => { throw new Error('not called'); }
    ),
    /ANTHROPIC_API_KEY is required/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});
