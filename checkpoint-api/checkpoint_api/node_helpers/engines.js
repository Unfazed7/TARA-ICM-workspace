#!/usr/bin/env node
'use strict';
// The API's one way into the pipeline's own maths and rules (D-62): it does not copy them.
//   node engines.js scales              what the screens print: weights, levels, thresholds
//   node engines.js afr                 stdin: [metrics...]            -> [{ afr_value, afr_label }...]
//   node engines.js rate                stdin: [{ impact, attack }...] -> [score fields...]
//   node engines.js impact              stdin: [impact record...]      -> [{ value, label }...] (the overall impact rating)
//   node engines.js controls            stdin: { inputs, risk_id, option } -> goal text and controls the treatment step would pick
const path = require('path');

const STAGES = path.resolve(__dirname, '..', '..', '..', 'tara-workspace', 'web-based-tara');
const { calculateCVSSAFR, WEIGHTS, AFR_LABELS, MIN_EXPLOITABILITY, MAX_EXPLOITABILITY } = require(path.join(STAGES, '_engines', 'cvss-afr-calc'));
const { computeRiskScore, computeImpactRatingValue, getRiskLevel } = require(path.join(STAGES, '_engines', 'risk-score'));

function readStdin() {
  return JSON.parse(require('fs').readFileSync(0, 'utf8'));
}

function scales() {
  const levels = {};
  for (let score = 0; score <= 15; score += 1) {
    const level = getRiskLevel(score);
    (levels[level] = levels[level] || []).push(score);
  }
  return {
    weights: WEIGHTS,
    afr_labels: AFR_LABELS,
    exploitability: { min: MIN_EXPLOITABILITY, max: MAX_EXPLOITABILITY, factor: 8.22 },
    risk_levels: Object.entries(levels).map(([level, scores]) => ({ level, from: scores[0], to: scores[scores.length - 1] })),
  };
}

function controls({ inputs, risk_id: riskId, option }) {
  const treatment = require(path.join(STAGES, 'stages', '09-risk-treatment', 'agent.js'));
  const fs = require('fs');
  const catalogue = treatment.parseControlsCatalogue(fs.readFileSync(path.join(STAGES, '_config', 'controls-catalogue.md'), 'utf8'));
  const chain = treatment.buildRiskChains(inputs).find((c) => c.risk.risk_id === riskId);
  if (!chain) throw new Error(`No risk ${riskId}`);
  if (option === 'share') {
    const pick = [...catalogue.entries()].find(([, c]) => ['F', 'G'].includes(c.family));
    if (!pick) throw new Error('The controls catalogue has no control for sharing a risk');
    const [id, control] = pick;
    return { controls: treatment.hydrateControls([id], [`${control.title} moves part of the risk to another party.`], catalogue, riskId), goal_self_test_note: null };
  }
  // What the treatment step writes when it picks Reduce for this risk: the risk is treated as one that cannot be accepted.
  const forced = { ...chain, risk: { ...chain.risk, risk_level: 'high' } };
  const fallback = treatment.buildFallbackTreatment(forced, catalogue);
  return {
    controls: treatment.hydrateControls(fallback.control_ids, fallback.control_assignment_rationales, catalogue, riskId),
    goal_self_test_note: fallback.goal_self_test_note,
  };
}

const commands = {
  scales: () => scales(),
  afr: () => readStdin().map((metrics) => calculateCVSSAFR(metrics)),
  impact: () => readStdin().map((record) => { const value = computeImpactRatingValue(record); return { value, label: ['Negligible', 'Moderate', 'Major', 'Severe'][value] }; }),
  rate: () => readStdin().map(({ impact, attack }) => computeRiskScore(impact, attack)),
  controls: () => controls(readStdin()),
};

try {
  const run = commands[process.argv[2]];
  if (!run) throw new Error(`Unknown command ${process.argv[2]}`);
  process.stdout.write(JSON.stringify(run()));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
