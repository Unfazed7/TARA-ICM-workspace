'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeImpactRatingValue,
  computeRiskScore,
  getRiskLevel
} = require('../../tara-workspace/web-based-tara/_engines/risk-score');
const { buildRiskRegister } = require('../../tara-workspace/web-based-tara/stages/06-risk-scoring/agent');
const { fixturePath, readJson } = require('../helpers/schema-validation');

test('impact rating is the max of applicable Stage 05 dimensions', () => {
  const impact = readJson(fixturePath('valid', 'stage-05-impact-analysis.json'))[0];
  assert.equal(computeImpactRatingValue(impact), 2);
});

test('risk level boundaries match spec 06', () => {
  assert.equal(getRiskLevel(0), 'informational');
  assert.equal(getRiskLevel(3), 'low');
  assert.equal(getRiskLevel(4), 'medium');
  assert.equal(getRiskLevel(7), 'medium');
  assert.equal(getRiskLevel(8), 'high');
  assert.equal(getRiskLevel(11), 'high');
  assert.equal(getRiskLevel(12), 'critical');
  assert.equal(getRiskLevel(15), 'critical');
});

test('risk score combines impact and AFR', () => {
  const impact = readJson(fixturePath('valid', 'stage-05-impact-analysis.json'))[0];
  const attack = readJson(fixturePath('valid', 'stage-04-attack-paths-post-engine.json'))[0];
  assert.deepEqual(computeRiskScore(impact, attack), {
    impact_rating_value: 2,
    impact_rating_label: 'Major',
    afr_value: 4,
    afr_label: 'high',
    risk_score: 8,
    risk_level: 'high'
  });
});

test('risk ranking sorts by score then higher AFR', () => {
  const impactTemplate = readJson(fixturePath('valid', 'stage-05-impact-analysis.json'))[0];
  const attackTemplate = readJson(fixturePath('valid', 'stage-04-attack-paths-post-engine.json'))[0];
  const impacts = [
    { ...impactTemplate, impact_id: 'IM_01', threat_id: 'TH_01' },
    { ...impactTemplate, impact_id: 'IM_02', threat_id: 'TH_02' },
    { ...impactTemplate, impact_id: 'IM_03', threat_id: 'TH_03' }
  ];
  const attacks = [
    { ...attackTemplate, attack_id: 'AT_01', threat_id: 'TH_01', afr_value: 2, afr_label: 'low' },
    { ...attackTemplate, attack_id: 'AT_02', threat_id: 'TH_02', afr_value: 3, afr_label: 'medium' },
    { ...attackTemplate, attack_id: 'AT_03', threat_id: 'TH_03', afr_value: 4, afr_label: 'high' }
  ];
  impacts[0].tool_user.privacy = 'Severe';
  impacts[2].tool_user.privacy = 'Severe';
  const ranked = buildRiskRegister(impacts, attacks, '2026-06-01T10:05:00.000Z');
  assert.deepEqual(ranked.map((risk) => [risk.threat_id, risk.risk_id, risk.risk_rank]), [
    ['TH_03', 'RSK_01', 1],
    ['TH_02', 'RSK_02', 2],
    ['TH_01', 'RSK_03', 3]
  ]);
});

test('Stage 06 runner builds the golden risk register', () => {
  const impact = readJson(fixturePath('valid', 'stage-05-impact-analysis.json'));
  const attacks = readJson(fixturePath('valid', 'stage-04-attack-paths-post-engine.json'));
  const result = buildRiskRegister(impact, attacks, '2026-06-01T10:05:00.000Z');
  assert.equal(result.length, 1);
  assert.equal(result[0].risk_score, 8);
  assert.equal(result[0].risk_rank, 1);
});

test('missing AFR fails before scoring', () => {
  const impact = readJson(fixturePath('valid', 'stage-05-impact-analysis.json'))[0];
  const attack = readJson(fixturePath('valid', 'stage-04-attack-paths.json'))[0];
  assert.throws(() => computeRiskScore(impact, attack), /afr_value not computed/);
});
