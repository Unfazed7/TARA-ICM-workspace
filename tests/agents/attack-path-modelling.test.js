'use strict';

require('../helpers/legacy-llm-env');

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFallbackAttackPath,
  buildAttackPathsWithClaude,
  callClaudeForThreat,
  generateAttackPathForThreat,
  parseTextAttackPath,
  run,
  THINKING,
  validateAttackPaths
} = require('../../tara-workspace/web-based-tara/stages/06-attack-path-modelling/agent');
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
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousProvider = process.env.LLM_PROVIDER;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.LLM_PROVIDER = 'anthropic';
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
  restoreEnv('LLM_PROVIDER', previousProvider);
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
  assert.equal(requestBody.max_tokens, 4096);
  assert.equal(validateSchema(paths, readJson(schemaPath(6))).valid, true);
});

test('invalid CVSS enum is rejected', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const { paths } = await buildWithMockedClaude();
  paths[0].cvss_metrics.attack_vector = 'Z';
  assert.throws(() => validateAttackPaths(paths, threats), /Invalid CVSS metric/);
});

test('empty attack step is rejected', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
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
  const input = path.join(tmpDir, 'stage-06-attack-paths.json');
  const output = path.join(tmpDir, 'stage-06-attack-paths.json');
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

test('Stage 06 run publishes attack paths with AFR already calculated', async () => {
  const tmpDir = fs.mkdtempSync(path.join(ROOT, 'tests', '.tmp-'));
  const threatsFile = fixturePath('valid', 'stage-05-threats.json');
  const output = path.join(tmpDir, 'attack-paths.json');
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: 'tool_use', name: 'submit_attack_path', input: validToolResponse() }]
    })
  });

  try {
    const paths = await run({ threats: threatsFile, out: output, fetchImpl });
    assert.equal(paths[0].afr_value >= 1 && paths[0].afr_value <= 5, true);
    assert.equal(typeof paths[0].afr_label, 'string');
    assert.deepEqual(readJson(output), paths);
  } finally {
    restoreEnv('ANTHROPIC_API_KEY', previousKey);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('attack path modelling fails without API key', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForThreat(
      readJson(fixturePath('valid', 'stage-05-threats.json'))[0],
      async () => { throw new Error('not called'); }
    ),
    /LLM API key not set/
  );
  restoreEnv('ANTHROPIC_API_KEY', previousKey);
});

test('attack path modelling retries once on free text before accepting tool_use', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
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

test('incomplete Qwen tool payload is rejected and retried', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousProvider = process.env.LLM_PROVIDER;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.LLM_PROVIDER = 'anthropic';
  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    const input = calls === 1
      ? { ...validToolResponse(), attack_path: { step_1_initial_precondition: 'Only one step.' } }
      : validToolResponse();
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'tool_use', name: 'submit_attack_path', input }] })
    };
  };

  try {
    const paths = await buildAttackPathsWithClaude(threats, { fetchImpl: fakeFetch });
    assert.equal(calls, 2);
    assert.equal(paths[0].attack_path.step_5_threat_realization.length > 0, true);
  } finally {
    restoreEnv('ANTHROPIC_API_KEY', previousKey);
    restoreEnv('LLM_PROVIDER', previousProvider);
  }
});

test('valid fenced JSON text is accepted as an attack path', () => {
  const response = {
    content: [{ type: 'text', text: `Here is the result:\n\n\`\`\`json\n${JSON.stringify(validToolResponse())}\n\`\`\`` }]
  };
  assert.deepEqual(parseTextAttackPath(response), validToolResponse());
});

test('transient network failures are retried then use a deterministic fallback with diagnostics', async () => {
  const threat = readJson(fixturePath('valid', 'stage-05-threats.json'))[0];
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousProvider = process.env.LLM_PROVIDER;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.LLM_PROVIDER = 'anthropic';
  let calls = 0;
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  const terminated = new Error('terminated');
  terminated.cause = { code: 'UND_ERR_SOCKET', message: 'other side closed' };

  try {
    const result = await generateAttackPathForThreat(threat, async () => {
      calls += 1;
      throw terminated;
    });
    assert.equal(calls, 2);
    assert.equal(result.attack_path.step_5_threat_realization.length > 0, true);
    assert.equal(CVSS_VALUES_VALID(result.cvss_metrics), true);
    assert.ok(warnings.some((line) => line.includes(threat.threat_id)));
    assert.ok(warnings.some((line) => line.includes('UND_ERR_SOCKET')));
  } finally {
    console.warn = previousWarn;
    restoreEnv('ANTHROPIC_API_KEY', previousKey);
    restoreEnv('LLM_PROVIDER', previousProvider);
  }
});

test('deterministic fallback is complete for a threat', () => {
  const threat = readJson(fixturePath('valid', 'stage-05-threats.json'))[0];
  const fallback = buildFallbackAttackPath(threat);
  assert.equal(Object.keys(fallback.attack_path).length, 5);
  assert.equal(Object.keys(fallback.justifications).length, 4);
  assert.equal(CVSS_VALUES_VALID(fallback.cvss_metrics), true);
});

test('authentication failures remain fatal and never use fallback', async () => {
  const threat = readJson(fixturePath('valid', 'stage-05-threats.json'))[0];
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousLlmKey = process.env.LLM_API_KEY;
  const previousProvider = process.env.LLM_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.LLM_API_KEY;
  process.env.LLM_PROVIDER = 'anthropic';
  try {
    await assert.rejects(
      () => generateAttackPathForThreat(threat, async () => { throw new Error('not called'); }),
      /LLM API key not set/
    );
  } finally {
    restoreEnv('ANTHROPIC_API_KEY', previousKey);
    restoreEnv('LLM_API_KEY', previousLlmKey);
    restoreEnv('LLM_PROVIDER', previousProvider);
  }
});

function CVSS_VALUES_VALID(metrics) {
  return ['N', 'A', 'L', 'P'].includes(metrics.attack_vector)
    && ['L', 'H'].includes(metrics.attack_complexity)
    && ['N', 'L', 'H'].includes(metrics.privileges_required)
    && ['N', 'R'].includes(metrics.user_interaction);
}
