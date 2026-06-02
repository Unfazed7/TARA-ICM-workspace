'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildImpactAnalysisWithClaude,
  callClaudeForThreat,
  validateImpactAnalysis
} = require('../../tara-workspace/web-based-tara/stages/05-impact-analysis/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

test.beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

const CLAUDE_IMPACT = {
  impact_narrative: 'The attacker succeeds in exposing technician session data tied to the diagnostic workflow.',
  tool_user: {
    privacy: 'Major',
    operational: 'Moderate',
    rationale_privacy: 'Technician work-related session context is exposed and linkable to the user.',
    rationale_operational: 'The technician workflow continues with reduced confidence and added recovery steps.'
  },
  other_stakeholders: {
    legal: 'Major',
    financial: 'Moderate',
    business: 'Major',
    rationale_legal: 'The organization faces regulatory and contractual exposure from the data compromise.',
    rationale_financial: 'Incident response and remediation costs are material but manageable.',
    rationale_business: 'Customer trust is harmed because diagnostic platform data was compromised.'
  }
};

function mockClaudeFetch(inputs = [CLAUDE_IMPACT], captured = []) {
  let index = 0;
  return async (url, request) => {
    captured.push({ url, request, body: JSON.parse(request.body) });
    const input = inputs[Math.min(index, inputs.length - 1)];
    index += 1;
    return {
      ok: true,
      async json() {
        if (input === null) return { content: [{ type: 'text', text: 'free text' }] };
        return {
          content: [{
            type: 'tool_use',
            name: 'submit_impact_analysis',
            input
          }]
        };
      }
    };
  };
}

test('impact analysis creates exactly one impact per threat using Claude tool output', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    timestamp: '2026-06-01T10:04:00Z',
    fetchImpl: mockClaudeFetch()
  });
  assert.equal(impacts.length, threats.length);
  assert.equal(validateSchema(impacts, readJson(schemaPath(5))).valid, true);
});

test('domain constraints are always enforced after Claude output', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, { fetchImpl: mockClaudeFetch() });
  assert.equal(impacts[0].tool_user.safety, 'Negligible');
  assert.equal(impacts[0].tool_user.financial, 'Negligible');
});

test('Claude request forces submit_impact_analysis tool without extended thinking', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const captured = [];
  process.env.ANTHROPIC_API_KEY = 'test-key';
  await callClaudeForThreat(threats[0], damage[0], mockClaudeFetch([CLAUDE_IMPACT], captured));
  assert.equal(captured[0].body.tool_choice.type, 'tool');
  assert.equal(captured[0].body.tool_choice.name, 'submit_impact_analysis');
  assert.equal(captured[0].body.thinking, undefined);
});

test('impact analysis retries once after free text response', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const captured = [];
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    fetchImpl: mockClaudeFetch([null, CLAUDE_IMPACT], captured)
  });
  assert.equal(captured.length, 2);
  assert.equal(impacts[0].impact_narrative, CLAUDE_IMPACT.impact_narrative);
});

test('impact validation rejects non-negligible fixed dimensions', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, { fetchImpl: mockClaudeFetch() });
  impacts[0].tool_user.safety = 'Major';
  assert.throws(() => validateImpactAnalysis(impacts, threats, damage), /safety must be Negligible/);
});

test('impact validation rejects invalid computed rating', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const badImpact = {
    ...CLAUDE_IMPACT,
    tool_user: { ...CLAUDE_IMPACT.tool_user, privacy: 'Critical' }
  };
  await assert.rejects(
    () => buildImpactAnalysisWithClaude(threats.slice(0, 1), damage, { fetchImpl: mockClaudeFetch([badImpact]) }),
    /Invalid rating Critical for dimension privacy/
  );
});

test('missing damage scenario fails clearly', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  await assert.rejects(
    () => buildImpactAnalysisWithClaude(threats, [], { fetchImpl: mockClaudeFetch() }),
    /No damage scenario found/
  );
});

test('missing API key fails clearly', async () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForThreat(threats[0], damage[0], mockClaudeFetch()),
    /ANTHROPIC_API_KEY is required/
  );
});
