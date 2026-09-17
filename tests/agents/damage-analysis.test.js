'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDamageScenarios,
  buildDamageScenariosWithClaude,
  callClaudeForAsset,
  validateDamageScenarios
} = require('../../tara-workspace/web-based-tara/stages/02-damage-analysis/agent');
const { ROOT, readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

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

test('damage analysis CLI supports deterministic mode without LLM', () => {
  const outPath = path.join(ROOT, '.tmp', 'tests', 'damage-analysis-deterministic.json');
  execFileSync(process.execPath, [
    path.join(ROOT, 'tara-workspace', 'web-based-tara', 'stages', '02-damage-analysis', 'agent.js'),
    '--assets',
    path.join(ROOT, 'tests', 'fixtures', 'valid', 'stage-01-asset-register.json'),
    '--assessment-id',
    'ASS_TEST',
    '--out',
    outPath,
    '--deterministic',
    'true'
  ], { cwd: ROOT, stdio: 'pipe' });

  const scenarios = readJson(outPath);
  assert.equal(validateSchema(scenarios, readJson(schemaPath(2))).valid, true);
  fs.unlinkSync(outPath);
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

test('damage analysis retries wrong Claude scenario count before accepting repair', async () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let calls = 0;
  const fakeFetch = async () => ({
    ok: true,
    json: async () => {
      calls += 1;
      return {
        content: [{
          type: 'tool_use',
          name: 'submit_damage_scenarios_for_asset',
          input: {
            damage_scenarios: calls === 1 ? [] : [{
              property: 'authorization',
              damage_scenario: 'If the Authorization of Diagnostic API Endpoint is compromised, privileged diagnostic functionality is used outside the permitted access boundary affecting organization in the context of Diagnostic API Endpoint operations.',
              stakeholder_affected: 'organization'
            }]
          }
        }]
      };
    }
  });

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
  }], { fetchImpl: fakeFetch });

  assert.equal(calls, 2);
  assert.equal(scenarios.length, 1);
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});

test('damage analysis retries attacker-language Claude scenario before accepting repair', async () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let calls = 0;
  const fakeFetch = async () => ({
    ok: true,
    json: async () => {
      calls += 1;
      return {
        content: [{
          type: 'tool_use',
          name: 'submit_damage_scenarios_for_asset',
          input: {
            damage_scenarios: [{
              property: 'authorization',
              damage_scenario: calls === 1
                ? 'If the Authorization of Diagnostic API Endpoint is compromised, an attacker invokes privileged diagnostic actions affecting organization in the context of Diagnostic API Endpoint operations.'
                : 'If the Authorization of Diagnostic API Endpoint is compromised, privileged diagnostic functionality is used outside the permitted access boundary affecting organization in the context of Diagnostic API Endpoint operations.',
              stakeholder_affected: 'organization'
            }]
          }
        }]
      };
    }
  });

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
  }], { fetchImpl: fakeFetch });

  assert.equal(calls, 2);
  assert.equal(scenarios.length, 1);
  assert.doesNotMatch(scenarios[0].damage_scenario, /attacker/i);
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
    /LLM API key not set/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});
