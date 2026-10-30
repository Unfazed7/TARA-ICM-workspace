'use strict';

require('../helpers/legacy-llm-env');

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson, fixturePath, validateSchema } = require('../helpers/schema-validation');

const STAGES = path.resolve(__dirname, '..', '..', 'tara-workspace', 'web-based-tara', 'stages');
const SCHEMA = readJson(path.resolve(__dirname, '..', '..', 'src', 'schemas', 'stage-assumptions.schema.json'));
const agent = (folder) => require(path.join(STAGES, folder, 'agent'));
const fixture = (name) => readJson(fixturePath('valid', name));

function work() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'assumptions-'));
}

function answering(inputFor) {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    const tool = body.tools[0].name;
    const user = body.messages[0].content;
    return { ok: true, json: async () => ({ content: [{ type: 'tool_use', name: tool, input: inputFor(tool, typeof user === 'string' ? user : JSON.stringify(user)) }] }) };
  };
}

function written(out) {
  const file = path.join(path.dirname(out), 'assumptions.json');
  const list = readJson(file);
  assert.equal(validateSchema(list, SCHEMA).valid, true, JSON.stringify(validateSchema(list, SCHEMA).errors));
  return list;
}

function withKey(fn) {
  return async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    try { await fn(); } finally { if (previous === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previous; }
  };
}

test('04 damage: assumptions go next to the output, tied to the damage scenario they were about', withKey(async () => {
  const dir = work();
  fs.writeFileSync(path.join(dir, 'assets.json'), JSON.stringify(fixture('stage-03-asset-register.json')));
  const asset = fixture('stage-03-asset-register.json')[0];
  const properties = Object.entries(asset.ciaaan).filter(([, v]) => v).map(([k]) => k);
  const out = path.join(dir, 'damage-scenarios.json');
  await agent('04-damage-analysis').run({
    assets: path.join(dir, 'assets.json'), out,
    fetchImpl: answering(() => ({
      damage_scenarios: properties.map((property) => ({ property, damage_scenario: `If the ${property} fails, the people relying on this asset are harmed in a lasting way.`, stakeholder_affected: 'organization' })),
      assumptions: [{ property: properties[0], field: 'tool_user.privacy', text: 'Requesters are company staff, so their contact details count as personal data.' }, { property: properties[0], text: 'Mentions DS_01 which is an id and must be dropped.' }],
    })),
  });
  const list = written(out);
  assert.deepEqual(list, [{ about_id: 'DS_01', field: 'tool_user.privacy', text: 'Requesters are company staff, so their contact details count as personal data.', needs_attention: true }]);
  assert.equal(validateSchema(readJson(out), readJson(path.resolve(__dirname, '..', '..', 'src', 'schemas', 'stage-04-damage-scenarios.schema.json'))).valid, true);
}));

test('05 threats: an assumption names the threat it was made for and the STRIDE field', withKey(async () => {
  const dir = work();
  fs.writeFileSync(path.join(dir, 'in.json'), JSON.stringify(fixture('stage-04-damage-scenarios.json')));
  const out = path.join(dir, 'threats.json');
  await agent('05-threat-identification').run({
    damageScenarios: path.join(dir, 'in.json'), out,
    fetchImpl: answering(() => ({
      stride_category: 'tampering', threat_statement: 'Diagnostic API Endpoint requests are changed on the way in.', derivation_note: 'Integrity maps to tampering.', owasp_reference: 'A08',
      assumptions: [{ field: 'stride_category', text: 'The endpoint accepts requests without signing them.' }, { field: 'not_a_field', text: 'A sentence about nothing in particular here.' }],
    })),
  });
  assert.deepEqual(written(out).map((a) => [a.about_id, a.field]), [['TH_01', 'stride_category'], ['TH_01', null]]);
}));

test('06 attack paths: assumptions about the CVSS factors', withKey(async () => {
  const dir = work();
  fs.writeFileSync(path.join(dir, 'in.json'), JSON.stringify(fixture('stage-05-threats.json')));
  const attack = fixture('stage-06-attack-paths.json')[0];
  const out = path.join(dir, 'attack-paths.json');
  await agent('06-attack-path-modelling').run({
    threats: path.join(dir, 'in.json'), out,
    fetchImpl: answering(() => ({
      attack_description: attack.attack_description, attack_path: attack.attack_path, cvss_metrics: attack.cvss_metrics, justifications: attack.justifications,
      assumptions: [{ field: 'attack_vector', text: 'The service is reachable from the internet without a VPN.' }],
    })),
  });
  assert.deepEqual(written(out), [{ about_id: 'AT_01', field: 'attack_vector', text: 'The service is reachable from the internet without a VPN.', needs_attention: true }]);
}));

test('07 impact: assumptions about the impact categories', withKey(async () => {
  const dir = work();
  fs.writeFileSync(path.join(dir, 'threats.json'), JSON.stringify(fixture('stage-05-threats.json')));
  fs.writeFileSync(path.join(dir, 'damage.json'), JSON.stringify(fixture('stage-04-damage-scenarios.json')));
  const impact = fixture('stage-07-impact-analysis.json')[0];
  const out = path.join(dir, 'impact-analysis.json');
  await agent('07-impact-analysis').run({
    threats: path.join(dir, 'threats.json'), damageScenarios: path.join(dir, 'damage.json'), out,
    fetchImpl: answering(() => ({
      impact_narrative: impact.impact_narrative,
      tool_user: { privacy: impact.tool_user.privacy, operational: impact.tool_user.operational, rationale_privacy: impact.tool_user.rationale_privacy, rationale_operational: impact.tool_user.rationale_operational },
      other_stakeholders: { legal: impact.other_stakeholders.legal, financial: impact.other_stakeholders.financial, business: impact.other_stakeholders.business, rationale_legal: impact.other_stakeholders.rationale_legal, rationale_financial: impact.other_stakeholders.rationale_financial, rationale_business: impact.other_stakeholders.rationale_business },
      assumptions: [{ field: 'other_stakeholders.business', text: 'There is no second signing key ready to take over.' }],
    })),
  });
  assert.deepEqual(written(out).map((a) => [a.about_id, a.field]), [['IM_01', 'other_stakeholders.business']]);
}));

test('09 treatment: assumptions about the treatment', withKey(async () => {
  const dir = work();
  const files = { 'risk.json': 'stage-08-risk-register.json', 'threats.json': 'stage-05-threats.json', 'damage.json': 'stage-04-damage-scenarios.json', 'attacks.json': 'stage-06-attack-paths-post-engine.json', 'impacts.json': 'stage-07-impact-analysis.json', 'assets.json': 'stage-03-asset-register.json' };
  for (const [name, source] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(fixture(source)));
  const treatment = agent('09-risk-treatment');
  const catalogue = treatment.parseControlsCatalogue(fs.readFileSync(path.join(STAGES, '..', '_config', 'controls-catalogue.md'), 'utf8'));
  const inputs = Object.fromEntries([['riskRegister', 'risk.json'], ['threats', 'threats.json'], ['damageScenarios', 'damage.json'], ['attacks', 'attacks.json'], ['impacts', 'impacts.json'], ['assets', 'assets.json']].map(([k, f]) => [k, readJson(path.join(dir, f))]));
  const chain = treatment.buildRiskChains(inputs)[0];
  const answer = treatment.buildFallbackTreatment(chain, catalogue);
  const out = path.join(dir, 'risk-treatment.json');
  await treatment.run({
    riskRegister: path.join(dir, 'risk.json'), threats: path.join(dir, 'threats.json'), damageScenarios: path.join(dir, 'damage.json'),
    attacks: path.join(dir, 'attacks.json'), impacts: path.join(dir, 'impacts.json'), assets: path.join(dir, 'assets.json'), assessmentId: 'ASS_TEST', out,
    fetchImpl: answering(() => ({ ...answer, assumptions: [{ field: 'treatment_option', text: 'The deploy identity can call the key store export function.' }] })),
  });
  assert.deepEqual(written(out).map((a) => [a.about_id, a.field]), [['TRT_01', 'treatment_option']]);
}));

test('10 residual: its assumptions are the control changes it already records', () => {
  const list = agent('10-residual-risk').residualAssumptions([{
    residual_id: 'RES_01', controls: [{ control_id: 'CTR_01', control_title: 'Multi-factor authentication', control_type: 'preventive' }],
    metric_changes: [{ metric: 'privileges_required', from: 'N', to: 'L', control_id: 'CTR_01', reason: 'A second factor is needed before the call is accepted.' }],
  }, { residual_id: 'RES_02', controls: [], metric_changes: [] }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].about_id, 'RES_01');
  assert.equal(list[0].field, 'privileges_required');
  assert.match(list[0].text, /Multi-factor authentication is assumed to be in place/);
  assert.equal(validateSchema(list, SCHEMA).valid, true);
});

test('an agent whose model returns no assumptions still writes an empty list', withKey(async () => {
  const dir = work();
  fs.writeFileSync(path.join(dir, 'in.json'), JSON.stringify(fixture('stage-04-damage-scenarios.json')));
  const out = path.join(dir, 'threats.json');
  await agent('05-threat-identification').run({
    damageScenarios: path.join(dir, 'in.json'), out,
    fetchImpl: answering(() => ({ stride_category: 'tampering', threat_statement: 'Diagnostic API Endpoint requests are changed on the way in.', derivation_note: 'Integrity maps to tampering.', owasp_reference: 'A08' })),
  });
  assert.deepEqual(written(out), []);
}));
