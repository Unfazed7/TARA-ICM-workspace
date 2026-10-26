'use strict';

require('../helpers/legacy-llm-env');

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFallbackImpact,
  buildImpactAnalysisWithClaude,
  callClaudeForThreat,
  validateImpactAnalysis
} = require('../../tara-workspace/web-based-tara/stages/07-impact-analysis/agent');
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

function fallbackFor(damageScenario, overrides = {}) {
  const damage = {
    damage_id: 'DS_01',
    asset_id: 'AS_01',
    asset_title: 'Platform Gateway',
    property: 'availability',
    stakeholder_affected: 'organization',
    damage_scenario: damageScenario,
    ...overrides
  };
  const threat = {
    threat_id: 'TH_01',
    asset_id: damage.asset_id,
    asset_title: damage.asset_title,
    stride_category: 'denial_of_service',
    threat_statement: `${damage.asset_title} is compromised.`,
  };
  return buildFallbackImpact(threat, damage, 'test fallback');
}

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
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    timestamp: '2026-06-01T10:04:00Z',
    fetchImpl: mockClaudeFetch()
  });
  assert.equal(impacts.length, threats.length);
  assert.equal(validateSchema(impacts, readJson(schemaPath(7))).valid, true);
});

test('domain constraints are always enforced after Claude output', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, { fetchImpl: mockClaudeFetch() });
  assert.equal(impacts[0].tool_user.safety, 'Negligible');
  assert.equal(impacts[0].tool_user.financial, 'Negligible');
});

test('Claude request forces submit_impact_analysis tool without extended thinking', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const captured = [];
  process.env.ANTHROPIC_API_KEY = 'test-key';
  await callClaudeForThreat(threats[0], damage[0], mockClaudeFetch([CLAUDE_IMPACT], captured));
  assert.equal(captured[0].body.tool_choice.type, 'tool');
  assert.equal(captured[0].body.tool_choice.name, 'submit_impact_analysis');
  assert.equal(captured[0].body.thinking, undefined);
});

test('impact analysis retries once after free text response', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const captured = [];
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    fetchImpl: mockClaudeFetch([null, CLAUDE_IMPACT], captured)
  });
  assert.equal(captured.length, 2);
  assert.equal(impacts[0].impact_narrative, CLAUDE_IMPACT.impact_narrative);
});

test('impact analysis falls back conservatively after repeated free text responses', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const captured = [];
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    timestamp: '2026-06-01T10:04:00Z',
    fetchImpl: mockClaudeFetch([null, null], captured)
  });

  assert.equal(captured.length, 2);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].tool_user.privacy, 'Negligible');
  assert.equal(impacts[0].other_stakeholders.financial, 'Negligible');
  assert.match(impacts[0].impact_narrative, /Diagnostic API Endpoint/);
  assert.equal(validateSchema(impacts, readJson(schemaPath(7))).valid, true);
});

test('fallback rates explicit user-facing service outage as Major operational impact', () => {
  const impact = fallbackFor(
    'Every API endpoint becomes unreachable, all active authenticated sessions stop working, and there is no alternate route.'
  );
  assert.equal(impact.tool_user.operational, 'Major');
  assert.equal(impact.other_stakeholders.business, 'Moderate');
});

test('fallback rates explicit cross-tenant sensitive data access as privacy and legal impact', () => {
  const impact = fallbackFor(
    'A caller can retrieve diagnostic session histories, vehicle identifiers, and records belonging to other tenants.',
    { property: 'authorization' }
  );
  assert.equal(impact.tool_user.privacy, 'Major');
  assert.equal(impact.other_stakeholders.legal, 'Moderate');
  assert.equal(impact.other_stakeholders.business, 'Moderate');
});

test('fallback does not infer financial impact without explicit monetary language', () => {
  const impact = fallbackFor(
    'High-cost LIST queries freeze the platform and remediation tasks cannot be performed through normal operations.'
  );
  assert.equal(impact.other_stakeholders.financial, 'Negligible');
});

test('impact analysis accepts valid JSON returned as fenced model text', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  let calls = 0;
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      calls += 1;
      return {
        content: [{ type: 'text', text: `Here is the result:\n\n\`\`\`json\n${JSON.stringify(CLAUDE_IMPACT)}\n\`\`\`` }]
      };
    }
  });

  const impacts = await buildImpactAnalysisWithClaude(threats, damage, { fetchImpl });
  assert.equal(calls, 1);
  assert.equal(impacts[0].impact_narrative, CLAUDE_IMPACT.impact_narrative);
});

test('impact analysis falls back when a tool payload omits a required rating', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const incompleteImpact = {
    ...CLAUDE_IMPACT,
    tool_user: { ...CLAUDE_IMPACT.tool_user }
  };
  delete incompleteImpact.tool_user.privacy;
  const captured = [];

  const impacts = await buildImpactAnalysisWithClaude(threats, damage, {
    fetchImpl: mockClaudeFetch([incompleteImpact, incompleteImpact], captured)
  });

  assert.equal(captured.length, 2);
  assert.equal(impacts[0].threat_id, 'TH_01');
  assert.equal(impacts[0].tool_user.privacy, 'Negligible');
  assert.equal(validateSchema(impacts, readJson(schemaPath(7))).valid, true);
});

test('impact analysis does not hide provider authentication failures behind fallback', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json')).slice(0, 1);
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const fetchImpl = async () => ({
    ok: false,
    status: 401,
    text: async () => 'invalid API key'
  });

  await assert.rejects(
    () => buildImpactAnalysisWithClaude(threats, damage, { fetchImpl }),
    /LLM request failed for TH_01.*401/
  );
});

test('impact validation rejects non-negligible fixed dimensions', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  const impacts = await buildImpactAnalysisWithClaude(threats, damage, { fetchImpl: mockClaudeFetch() });
  impacts[0].tool_user.safety = 'Major';
  assert.throws(() => validateImpactAnalysis(impacts, threats, damage), /safety must be Negligible/);
});

test('impact validation rejects invalid computed rating', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
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
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  await assert.rejects(
    () => buildImpactAnalysisWithClaude(threats, [], { fetchImpl: mockClaudeFetch() }),
    /No damage scenario found/
  );
});

test('missing API key fails clearly', async () => {
  const threats = readJson(fixturePath('valid', 'stage-05-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-04-damage-scenarios.json'));
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callClaudeForThreat(threats[0], damage[0], mockClaudeFetch()),
    /LLM API key not set/
  );
});
