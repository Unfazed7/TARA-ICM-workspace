'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRiskChains,
  buildRiskTreatments,
  buildSystemPrompt,
  callClaudeForRiskChain,
  deriveCAL,
  parseControlsCatalogue,
  validateTreatments
} = require('../../tara-workspace/web-based-tara/stages/07-risk-treatment/agent');
const { fixturePath, readJson, schemaPath, validateSchema } = require('../helpers/schema-validation');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROL_CATALOGUE = fs.readFileSync(
  path.join(ROOT, 'tara-workspace/web-based-tara/_config/controls-catalogue.md'),
  'utf8'
);
const WEB_CONSTRAINTS = fs.readFileSync(
  path.join(ROOT, 'tara-workspace/web-based-tara/_config/web-tara-constraints.md'),
  'utf8'
);
const SCHEMA = readJson(path.join(ROOT, 'src/schemas/stage-07-risk-treatment.schema.json'));

test.beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseFixtures() {
  return {
    riskRegister: readJson(fixturePath('valid', 'stage-06-risk-register.json')),
    threats: readJson(fixturePath('valid', 'stage-03-threats.json')),
    damageScenarios: readJson(fixturePath('valid', 'stage-02-damage-scenarios.json')),
    attacks: readJson(fixturePath('valid', 'stage-04-attack-paths-post-engine.json')),
    impacts: readJson(fixturePath('valid', 'stage-05-impact-analysis.json')),
    assets: readJson(fixturePath('valid', 'stage-01-asset-register.json'))
  };
}

function riskScoreFor(level) {
  return { informational: 0, low: 2, medium: 6, high: 8, critical: 12 }[level];
}

function makeInputs(levels = ['high']) {
  const base = baseFixtures();
  const inputs = {
    riskRegister: [],
    threats: [],
    damageScenarios: [],
    attacks: [],
    impacts: [],
    assets: []
  };

  levels.forEach((level, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    const asset = { ...clone(base.assets[0]), asset_id: `AS_${suffix}`, asset_title: `Diagnostic API Endpoint ${suffix}` };
    const damage = {
      ...clone(base.damageScenarios[0]),
      damage_id: `DS_${suffix}`,
      asset_id: asset.asset_id,
      asset_title: asset.asset_title
    };
    const threat = {
      ...clone(base.threats[0]),
      threat_id: `TH_${suffix}`,
      damage_scenario_id: damage.damage_id,
      asset_id: asset.asset_id,
      asset_title: asset.asset_title,
      threat_statement: `${asset.asset_title} authorization checks may be bypassed to invoke privileged diagnostic actions.`
    };
    const attack = {
      ...clone(base.attacks[0]),
      attack_id: `AT_${suffix}`,
      threat_id: threat.threat_id,
      damage_scenario_id: damage.damage_id,
      asset_id: asset.asset_id
    };
    const impact = {
      ...clone(base.impacts[0]),
      impact_id: `IM_${suffix}`,
      threat_id: threat.threat_id,
      damage_scenario_id: damage.damage_id,
      asset_id: asset.asset_id
    };
    const risk = {
      ...clone(base.riskRegister[0]),
      risk_id: `RSK_${suffix}`,
      threat_id: threat.threat_id,
      damage_scenario_id: damage.damage_id,
      attack_id: attack.attack_id,
      impact_id: impact.impact_id,
      asset_id: asset.asset_id,
      risk_level: level,
      risk_score: riskScoreFor(level),
      risk_rank: index + 1
    };
    inputs.assets.push(asset);
    inputs.damageScenarios.push(damage);
    inputs.threats.push(threat);
    inputs.attacks.push(attack);
    inputs.impacts.push(impact);
    inputs.riskRegister.push(risk);
  });

  return inputs;
}

const TREATMENTS = {
  reduce: {
    treatment_option: 'reduce',
    treatment_rationale: 'Reduce the high authorization bypass risk with endpoint authorization controls.',
    goal_statement: 'The Diagnostic API Endpoint 01 SHALL enforce endpoint-level authorization checks to protect authorization against low-privilege session token reuse.',
    goal_self_test_note: 'The goal fails the self-test if applied to a non-diagnostic endpoint without changing the endpoint and session-token mechanism.',
    claim_statement: null,
    acceptance_basis: null,
    control_ids: ['CTR_16', 'CTR_26'],
    control_assignment_rationales: [
      'RBAC directly constrains privileged diagnostic operations.',
      'BOLA detection targets weak endpoint-level authorization.'
    ],
    avoidance_action: null,
    residual_risk_expected: 'low'
  },
  share: {
    treatment_option: 'share',
    treatment_rationale: 'Share cloud monitoring responsibility with provider-side posture controls.',
    goal_statement: 'The Diagnostic API Endpoint 01 SHALL route privileged diagnostic access through cloud posture controls to protect authorization against weak endpoint authorization.',
    goal_self_test_note: 'The goal is specific to cloud-hosted diagnostic authorization and provider-side posture controls.',
    claim_statement: null,
    acceptance_basis: null,
    control_ids: ['CTR_73'],
    control_assignment_rationales: ['CSPM provides cloud-provider shared control coverage for authorization drift.'],
    avoidance_action: null,
    residual_risk_expected: 'medium'
  },
  accept: {
    treatment_option: 'accept',
    treatment_rationale: 'Accept the low residual risk because it is within the project threshold.',
    goal_statement: null,
    goal_self_test_note: null,
    claim_statement: 'The risk of Diagnostic API Endpoint 01 authorization checks may be bypassed to invoke privileged diagnostic actions affecting Diagnostic API Endpoint 01 authorization is accepted because AFR=4 high, impact Major (score=2), risk_score 2, and risk_level low is within the project acceptance threshold of <= low.',
    acceptance_basis: 'Risk level low is explicitly within the acceptance threshold.',
    control_ids: [],
    control_assignment_rationales: [],
    avoidance_action: null,
    residual_risk_expected: 'low'
  },
  avoid: {
    treatment_option: 'avoid',
    treatment_rationale: 'Avoid the risk by removing the exposed diagnostic operation.',
    goal_statement: null,
    goal_self_test_note: null,
    claim_statement: null,
    acceptance_basis: null,
    control_ids: [],
    control_assignment_rationales: [],
    avoidance_action: 'Disable the exposed privileged diagnostic operation until entitlement binding is redesigned.',
    residual_risk_expected: 'informational'
  }
};

function mockClaudeFetch(outputs, captured = []) {
  let index = 0;
  return async (url, request) => {
    captured.push({ url, request, body: JSON.parse(request.body) });
    const output = outputs[Math.min(index, outputs.length - 1)];
    index += 1;
    return {
      ok: true,
      async json() {
        if (output === null) return { content: [{ type: 'text', text: 'free text' }] };
        return {
          content: [{
            type: 'tool_use',
            name: 'submit_treatment',
            input: output
          }]
        };
      }
    };
  };
}

test('reduce treatment creates goal, no claim, and hydrated controls', async () => {
  const treatments = await buildRiskTreatments(makeInputs(['high']), {
    fetchImpl: mockClaudeFetch([TREATMENTS.reduce]),
    timestamp: '2026-06-01T10:06:00Z',
    controlsCatalogue: CONTROL_CATALOGUE,
    webTaraConstraints: WEB_CONSTRAINTS
  });
  assert.equal(treatments[0].treatment_option, 'reduce');
  assert.equal(treatments[0].cybersecurity_goal.goal_id, 'CG_01');
  assert.equal(treatments[0].cybersecurity_claim, null);
  assert.equal(treatments[0].controls_assigned.length, 2);
  assert.equal(treatments[0].controls_assigned[0].control_title, 'Role-Based Access Control (RBAC) Design and Enforcement');
  assert.equal(validateSchema(treatments, SCHEMA).valid, true);
});

test('accept treatment for low risk creates claim and no controls', async () => {
  const treatments = await buildRiskTreatments(makeInputs(['low']), {
    fetchImpl: mockClaudeFetch([TREATMENTS.accept]),
    controlsCatalogue: CONTROL_CATALOGUE,
    webTaraConstraints: WEB_CONSTRAINTS
  });
  assert.equal(treatments[0].cybersecurity_goal, null);
  assert.equal(treatments[0].cybersecurity_claim.claim_id, 'CC_01');
  assert.equal(treatments[0].controls_assigned.length, 0);
});

test('share treatment creates goal and requires Family F or G control', async () => {
  const treatments = await buildRiskTreatments(makeInputs(['medium']), {
    fetchImpl: mockClaudeFetch([TREATMENTS.share]),
    controlsCatalogue: CONTROL_CATALOGUE,
    webTaraConstraints: WEB_CONSTRAINTS
  });
  assert.equal(treatments[0].treatment_option, 'share');
  assert.equal(treatments[0].cybersecurity_goal.goal_id, 'CG_01');
  assert.equal(treatments[0].controls_assigned.length, 1);
});

test('avoid treatment requires avoidance action and no goal or claim', async () => {
  const treatments = await buildRiskTreatments(makeInputs(['critical']), {
    fetchImpl: mockClaudeFetch([TREATMENTS.avoid]),
    controlsCatalogue: CONTROL_CATALOGUE,
    webTaraConstraints: WEB_CONSTRAINTS
  });
  assert.equal(treatments[0].cybersecurity_goal, null);
  assert.equal(treatments[0].cybersecurity_claim, null);
  assert.equal(treatments[0].avoidance_action, TREATMENTS.avoid.avoidance_action);
});

test('acceptance threshold rejects medium and high risk', async () => {
  await assert.rejects(
    () => buildRiskTreatments(makeInputs(['medium']), {
      fetchImpl: mockClaudeFetch([TREATMENTS.accept]),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }),
    /Cannot accept medium risk/
  );
  await assert.rejects(
    () => buildRiskTreatments(makeInputs(['high']), {
      fetchImpl: mockClaudeFetch([TREATMENTS.accept]),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }),
    /Cannot accept high risk/
  );
});

test('unknown control ID is rejected', async () => {
  const badTreatment = { ...TREATMENTS.reduce, control_ids: ['CTR_999'], control_assignment_rationales: ['Unknown control'] };
  await assert.rejects(
    () => buildRiskTreatments(makeInputs(['high']), {
      fetchImpl: mockClaudeFetch([badTreatment]),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }),
    /CTR_999 not found in controls catalogue/
  );
});

test('CAL table maps all risk levels deterministically', () => {
  assert.equal(deriveCAL('informational'), 1);
  assert.equal(deriveCAL('low'), 1);
  assert.equal(deriveCAL('medium'), 2);
  assert.equal(deriveCAL('high'), 3);
  assert.equal(deriveCAL('critical'), 4);
});

test('goal self-test note is required for reduce treatment', async () => {
  const badTreatment = { ...TREATMENTS.reduce, goal_self_test_note: '' };
  await assert.rejects(
    () => buildRiskTreatments(makeInputs(['high']), {
      fetchImpl: mockClaudeFetch([badTreatment]),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }),
    /Self-test note required/
  );
});

test('Claude request forces submit_treatment tool without extended thinking', async () => {
  const chains = buildRiskChains(makeInputs(['high']));
  const captured = [];
  await callClaudeForRiskChain(
    chains[0],
    buildSystemPrompt(CONTROL_CATALOGUE, WEB_CONSTRAINTS),
    mockClaudeFetch([TREATMENTS.reduce], captured)
  );
  assert.equal(captured[0].body.tool_choice.type, 'tool');
  assert.equal(captured[0].body.tool_choice.name, 'submit_treatment');
  assert.equal(captured[0].body.thinking, undefined);
});

test('1:1 mapping creates one treatment per risk across five risks', async () => {
  const outputs = [TREATMENTS.reduce, TREATMENTS.share, TREATMENTS.avoid, TREATMENTS.reduce, TREATMENTS.accept];
  const treatments = await buildRiskTreatments(
    makeInputs(['high', 'medium', 'critical', 'high', 'low']),
    {
      fetchImpl: mockClaudeFetch(outputs),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }
  );
  assert.equal(treatments.length, 5);
  assert.deepEqual(treatments.map((item) => item.treatment_id), ['TRT_01', 'TRT_02', 'TRT_03', 'TRT_04', 'TRT_05']);
});

test('claim must cite AFR value and risk score as substrings', async () => {
  const badClaim = { ...TREATMENTS.accept, claim_statement: 'Accepted because it is low.' };
  await assert.rejects(
    () => buildRiskTreatments(makeInputs(['low']), {
      fetchImpl: mockClaudeFetch([badClaim]),
      controlsCatalogue: CONTROL_CATALOGUE,
      webTaraConstraints: WEB_CONSTRAINTS
    }),
    /Claim must cite AFR value and risk score/
  );
});

test('free text response is retried once before accepting tool_use', async () => {
  const captured = [];
  const treatments = await buildRiskTreatments(makeInputs(['high']), {
    fetchImpl: mockClaudeFetch([null, TREATMENTS.reduce], captured),
    controlsCatalogue: CONTROL_CATALOGUE,
    webTaraConstraints: WEB_CONSTRAINTS
  });
  assert.equal(captured.length, 2);
  assert.equal(treatments[0].treatment_option, 'reduce');
});

test('pre-check rejects attack paths without AFR values', () => {
  const inputs = makeInputs(['high']);
  inputs.attacks[0].afr_value = null;
  assert.throws(() => buildRiskChains(inputs), /afr_value not computed/);
});

test('controls catalogue parser extracts title type and family', () => {
  const catalogue = parseControlsCatalogue(CONTROL_CATALOGUE);
  assert.equal(catalogue.get('CTR_16').title, 'Role-Based Access Control (RBAC) Design and Enforcement');
  assert.equal(catalogue.get('CTR_16').type, 'preventive');
  assert.equal(catalogue.get('CTR_73').family, 'F');
});
