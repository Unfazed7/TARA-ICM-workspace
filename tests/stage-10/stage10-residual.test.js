'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stage10-'));
const ENV = { LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'test-key', LLM_STREAM: '0', LLM_AUDIT_FILE: path.join(tmp, 'audit.jsonl') };
const saved = Object.fromEntries(Object.keys(ENV).map((k) => [k, process.env[k]]));
Object.assign(process.env, ENV);
delete process.env.LLM_MODEL;

const { runStage10 } = require('../../tara-workspace/web-based-tara/stages/10-residual-risk/agent');
const { calculateCVSSAFR } = require('../../tara-workspace/web-based-tara/_engines/cvss-afr-calc');
const { computeRiskScore } = require('../../tara-workspace/web-based-tara/_engines/risk-score');

const VALID = path.join(__dirname, '..', 'fixtures', 'valid');
const read = (name) => JSON.parse(fs.readFileSync(path.join(VALID, name), 'utf8'));
const [attack0] = read('stage-06-attack-paths-post-engine.json');
const [impact0] = read('stage-07-impact-analysis.json');
const [risk0] = read('stage-08-risk-register.json');

const METRICS = { attack_vector: 'N', attack_complexity: 'L', privileges_required: 'N', user_interaction: 'N' };

/** Three threats: one reduced with controls, one accepted, one reduced whose proposal tries to make it easier. */
function dataset() {
  const make = (n, option, controls) => {
    const id = String(n).padStart(2, '0');
    const attack = { ...attack0, attack_id: `AT_${id}`, threat_id: `TH_${id}`, cvss_metrics: { ...METRICS }, ...calculateCVSSAFR(METRICS) };
    const impact = { ...impact0, impact_id: `IM_${id}`, threat_id: `TH_${id}` };
    const score = computeRiskScore(impact, attack);
    const risk = { ...risk0, risk_id: `RSK_${id}`, threat_id: `TH_${id}`, attack_id: attack.attack_id, impact_id: impact.impact_id, ...score, risk_rank: n };
    const treatment = {
      treatment_id: `TRT_${id}`, risk_id: risk.risk_id, threat_id: attack.threat_id, attack_id: attack.attack_id, impact_id: impact.impact_id, asset_id: risk.asset_id,
      treatment_option: option, treatment_rationale: 'Because the risk is too high as it is.',
      controls_assigned: controls.map((c) => ({ control_id: c, control_title: `Control ${c}`, control_type: 'preventive', assignment_rationale: 'It closes the gap.' })),
    };
    return { attack, impact, risk, treatment };
  };
  const rows = [make(1, 'reduce', ['CTR_01', 'CTR_02']), make(2, 'accept', []), make(3, 'reduce', ['CTR_03'])];
  return {
    attacks: rows.map((r) => r.attack), impacts: rows.map((r) => r.impact), riskRegister: rows.map((r) => r.risk), treatments: rows.map((r) => r.treatment),
  };
}

const metric = (value, control_id = '', reason = 'The control does not change this.') => ({ value, control_id, reason });

function fakeFetch(repliesByThreat, calls = []) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    const user = body.messages.find((m) => m.role === 'user').content;
    const threat = /Threat (TH_\d+)/.exec(user)[1];
    calls.push(threat);
    const reply = repliesByThreat[threat];
    return { ok: true, json: async () => ({ id: 'g', model: 'fake/model', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(reply) } }], usage: {} }) };
  };
}

test.after(() => {
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('a control that makes a metric harder lowers feasibility and risk with the same formulas as Stages 06 and 08', async () => {
  const calls = [];
  const data = dataset();
  const result = await runStage10({
    ...data,
    timestamp: '2026-10-26T10:00:00Z',
    fetchImpl: fakeFetch({
      TH_01: { attack_vector: metric('N'), attack_complexity: metric('H', 'CTR_01', 'CTR_01 rate limiting makes the attack take many more tries.'), privileges_required: metric('L', 'CTR_02', 'CTR_02 requires a signed-in account.'), user_interaction: metric('N') },
      TH_03: { attack_vector: metric('N'), attack_complexity: metric('L'), privileges_required: metric('N'), user_interaction: metric('N') },
    }, calls),
  });
  assert.deepEqual(result.errors, []);
  const [one] = result.residual;
  assert.deepEqual(one.metric_changes.map((c) => [c.metric, c.from, c.to, c.control_id]), [['attack_complexity', 'L', 'H', 'CTR_01'], ['privileges_required', 'N', 'L', 'CTR_02']]);
  assert.deepEqual(one.pre.metrics, METRICS);
  const expectedPost = calculateCVSSAFR({ ...METRICS, attack_complexity: 'H', privileges_required: 'L' });
  assert.equal(one.post.afr_value, expectedPost.afr_value);
  assert.equal(one.post.afr_label, expectedPost.afr_label);
  const expectedRisk = computeRiskScore(data.impacts[0], { attack_id: 'AT_01', afr_value: expectedPost.afr_value, afr_label: expectedPost.afr_label });
  assert.equal(one.post.risk_score, expectedRisk.risk_score);
  assert.equal(one.post.risk_level, expectedRisk.risk_level);
  assert.ok(one.post.afr_value < one.pre.afr_value);
  assert.equal(one.pre.risk_score, data.riskRegister[0].risk_score);
  assert.equal(result.rationale.filter((r) => r.attention === 'information').length, 2);
});

test('an accepted threat is unchanged and costs no model call', async () => {
  const calls = [];
  const result = await runStage10({ ...dataset(), fetchImpl: fakeFetch({ TH_01: {}, TH_03: {} }, calls) });
  assert.ok(!calls.includes('TH_02'));
  const accepted = result.residual.find((r) => r.threat_id === 'TH_02');
  assert.deepEqual(accepted.post, accepted.pre);
  assert.deepEqual(accepted.metric_changes, []);
});

test('a change toward easier is rejected, the pre-control value is kept and an Assumption says so', async () => {
  const data = dataset();
  // Start TH_03 from a harder rating, then let the model try to make it easier.
  data.attacks[2].cvss_metrics = { ...METRICS, attack_complexity: 'H' };
  Object.assign(data.attacks[2], calculateCVSSAFR(data.attacks[2].cvss_metrics));
  const impact = data.impacts[2];
  Object.assign(data.riskRegister[2], computeRiskScore(impact, data.attacks[2]));
  const result = await runStage10({
    ...data,
    fetchImpl: fakeFetch({
      TH_01: { attack_vector: metric('N'), attack_complexity: metric('L'), privileges_required: metric('N'), user_interaction: metric('N') },
      TH_03: { attack_vector: metric('N'), attack_complexity: metric('L', 'CTR_03', 'CTR_03 makes it easier.'), privileges_required: metric('N'), user_interaction: metric('N') },
    }),
  });
  assert.deepEqual(result.errors, []);
  const three = result.residual.find((r) => r.threat_id === 'TH_03');
  assert.equal(three.post.metrics.attack_complexity, 'H');
  assert.deepEqual(three.metric_changes, []);
  assert.deepEqual(three.post, three.pre);
  const flagged = result.rationale.filter((r) => r.attention === 'needs_attention');
  assert.equal(flagged.length, 1);
  assert.match(flagged[0].concluded, /cannot make an attack easier/);
});

test('a change that names a control the threat does not have is rejected', async () => {
  const result = await runStage10({
    ...dataset(),
    fetchImpl: fakeFetch({
      TH_01: { attack_vector: metric('N'), attack_complexity: metric('H', 'CTR_99', 'CTR_99 helps.'), privileges_required: metric('N'), user_interaction: metric('N') },
      TH_03: { attack_vector: metric('N'), attack_complexity: metric('L'), privileges_required: metric('N'), user_interaction: metric('N') },
    }),
  });
  assert.deepEqual(result.residual[0].metric_changes, []);
  assert.equal(result.residual[0].post.metrics.attack_complexity, 'L');
});

test('a model that keeps failing leaves the pre-control values and says so, but an unavailable model stops the stage', async () => {
  const broken = async () => ({ ok: true, json: async () => ({ id: 'g', model: 'm', choices: [{ finish_reason: 'stop', message: { content: 'not json' } }], usage: {} }) });
  const result = await runStage10({ ...dataset(), fetchImpl: broken });
  assert.deepEqual(result.residual[0].post, result.residual[0].pre);
  assert.ok(result.rationale.some((r) => /could not be re-rated/.test(r.title)));

  const gone = async () => ({ ok: false, status: 404, text: async () => 'No endpoints found for x/y.' });
  await assert.rejects(() => runStage10({ ...dataset(), fetchImpl: gone }), /unavailable/);
});
