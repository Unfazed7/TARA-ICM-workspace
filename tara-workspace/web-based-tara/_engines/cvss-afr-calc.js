'use strict';

const WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },
  UI: { N: 0.85, R: 0.62 }
};

const AFR_LABELS = {
  1: 'very low',
  2: 'low',
  3: 'medium',
  4: 'high',
  5: 'very high'
};

const MIN_EXPLOITABILITY = 0.121;
const MAX_EXPLOITABILITY = 3.893;

function calculateCVSSAFR(metrics) {
  const input = metrics || {};
  const av = requireMetric(input, 'attack_vector', WEIGHTS.AV);
  const ac = requireMetric(input, 'attack_complexity', WEIGHTS.AC);
  const pr = requireMetric(input, 'privileges_required', WEIGHTS.PR);
  const ui = requireMetric(input, 'user_interaction', WEIGHTS.UI);

  const exploitability = 8.22 * av * ac * pr * ui;
  if (Number.isNaN(exploitability)) {
    throw new Error('CVSS exploitability computation produced NaN');
  }

  const normalized = (exploitability - MIN_EXPLOITABILITY) / (MAX_EXPLOITABILITY - MIN_EXPLOITABILITY);
  const scaled = Math.round(1 + normalized * 4);
  const afrValue = Math.max(1, Math.min(5, scaled));

  return { afr_value: afrValue, afr_label: AFR_LABELS[afrValue] };
}

function requireMetric(metrics, field, allowedValues) {
  const value = metrics[field];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${field}`);
  }
  if (!Object.prototype.hasOwnProperty.call(allowedValues, value)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return allowedValues[value];
}

module.exports = {
  calculateCVSSAFR,
  WEIGHTS,
  AFR_LABELS,
  MIN_EXPLOITABILITY,
  MAX_EXPLOITABILITY
};
