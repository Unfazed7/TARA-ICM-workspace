'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAttackPathsWithClaude,
  callClaudeForThreat,
  THINKING,
  validateAttackPaths
} = require('../../tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent');
const { calculateCVSSAFR } = require('../../tara-workspace/web-based-tara/_engines/cvss-afr-calc');
const { readJson, fixturePath, validateSchema, schemaPath, ROOT } = require('../helpers/schema-validation');

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

function validToolResponse() {
  return {
    attack_description: 'A remote caller abuses a weak authorization boundary to perform diagnostic actions.',
    attack_path: {
      step_1_initial_precondition: 'The diagnostic API is reachable over the network.',
      step_2_abuse_technique: 'The caller reuses a valid low-privilege session token.',
      step_3_exploit_effect: 'The API accepts the request without enforcing the required entitlement.',
      step_4_control_gap: 'Endpoint-level authorization is not bound to the diagnostic operation.',
      step_5_threat_realization: 'Privileged diagnostic functionality is invoked outside approved access.'
    },
    cvss_metrics: {
      attack_vector: 'N',
      attack_complexity: 'L',
      privileges_required: 'L',
      user_interaction: 'N'
    },
    justifications: {
      attack_vector: 'The endpoint is network reachable.',
      attack_complexity: 'The path relies on a direct authorization gap.',
      privileges_required: 'A low-privilege session is sufficient.',
      user_interaction: 'No separate user action is required.'
    }
  };
}

async function buildWithMockedClaude(overrides = {}) {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
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
          name: 'submit_attack_path',
          input: { ...validToolResponse(), ...overrides }
        }]
      })
    };
  };
  const paths = await buildAttackPathsWithClaude(threats, {
    fetchImpl: fakeFetch,
    timestamp: '2026-06-01T10:03:00Z'
  });
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
  return { paths, requestBody, threats };
}

test('attack path modelling creates pre-engine paths with null AFR fields', async () => {
  const { paths, requestBody, threats } = await buildWithMockedClaude();
  assert.equal(paths.length, threats.length);
  assert.equal(paths[0].afr_value, null);
  assert.equal(paths[0].afr_label, null);
  assert.deepEqual(requestBody.thinking, THINKING);
  assert.deepEqual(requestBody.tool_choice, { type: 'tool', name: 'submit_attack_path' });
  assert.equal(requestBody.tools[0].name, 'submit_attack_path');
  assert.equal(validateSchema(paths, readJson(schemaPath(4))).valid, true);
});

test('invalid CVSS enum is rejected', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const { paths } = await buildWithMockedClaude();
  paths[0].cvss_metrics.attack_vector = 'Z';
  assert.throws(() => validateAttackPaths(paths, threats), /Invalid CVSS metric/);
});

test('empty attack step is rejected', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const { paths } = await buildWithMockedClaude();
  paths[0].attack_path.step_4_control_gap = '';
  assert.throws(() => validateAttackPaths(paths, threats), /Empty attack path step/);
});

test('CVSS engine fills AFR after Stage 04 output', async () => {
  const { paths } = await buildWithMockedClaude();
  const filled = paths.map((item) => ({ ...item, ...calculateCVSSAFR(item.cvss_metrics) }));
  assert.equal(filled[0].afr_value >= 1 && filled[0].afr_value <= 5, true);
  assert.equal(['very low', 'low', 'medium', 'high', 'very high'].includes(filled[0].afr_label), true);
});

test('CVSS engine CLI fills AFR fields', async () => {
  const tmpDir = fs.mkdtempSync(path.join(ROOT, 'tests', '.tmp-'));
  const input = path.join(tmpDir, 'stage-04-attack-paths.json');
  const output = path.join(tmpDir, 'stage-04-attack-paths.json');
  const { paths } = await buildWithMockedClaude();
  fs.writeFileSync(input, JSON.stringify(paths));
  require('child_process').execFileSync('node', [
    path.join(ROOT, 'tara-workspace/web-based-tara/_engines/cvss-afr-calc.js'),
    '--input',
    input,
    '--out',
    output
  ]);
  const updated = readJson(output);
  assert.equal(updated[0].afr_value >= 1 && updated[0].afr_value <= 5, true);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('attack path modelling fails without API key', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForThreat(
      readJson(fixturePath('valid', 'stage-03-threats.json'))[0],
      async () => { throw new Error('not called'); }
    ),
    /ANTHROPIC_API_KEY is required/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});

test('attack path modelling retries once on free text before accepting tool_use', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
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
              name: 'submit_attack_path',
              input: validToolResponse()
            }]
          }
    };
  };

  const paths = await buildAttackPathsWithClaude(threats, { fetchImpl: fakeFetch });
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
  assert.equal(calls, 2);
  assert.equal(paths.length, 1);
});
