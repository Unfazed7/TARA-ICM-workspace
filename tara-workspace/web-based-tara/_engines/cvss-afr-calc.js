/**
 * CVSS v3.1 Attack Feasibility Rating Calculator
 * Web-Based TARA — Deterministic Engine
 * Spec: tara-workspace/web-based-tara/_config/cvss-afr-formula.md
 *
 * PLACEHOLDER — Awaiting spec: .meta/specs/05-cvss-afr-engine.md
 *
 * Input:  { attack_vector, attack_complexity, privileges_required, user_interaction }
 * Output: { exploitability_raw, afr_value, afr_label }
 *
 * AI agents estimate the 4 CVSS metrics.
 * This engine computes the numeric score — AI never generates numbers.
 */

'use strict';

const WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },
  UI: { N: 0.85, R: 0.62 }
};

const AFR_LABELS = {
  5: 'very_high',
  4: 'high',
  3: 'medium',
  2: 'low',
  1: 'very_low'
};

const MIN_EXPLOITABILITY = 8.22 * 0.20 * 0.44 * 0.27 * 0.62;
const MAX_EXPLOITABILITY = 8.22 * 0.85 * 0.77 * 0.85 * 0.85;

/**
 * @param {Object} metrics
 * @param {'N'|'A'|'L'|'P'} metrics.attack_vector
 * @param {'L'|'H'}          metrics.attack_complexity
 * @param {'N'|'L'|'H'}      metrics.privileges_required
 * @param {'N'|'R'}          metrics.user_interaction
 * @returns {{ exploitability_raw: number, afr_value: number, afr_label: string }}
 */
function calculateCVSSAFR(metrics) {
  // TODO: Implement per spec .meta/specs/05-cvss-afr-engine.md
  // Formula reference: _config/cvss-afr-formula.md
  throw new Error('cvss-afr-calc.js not yet implemented — awaiting spec');
}

module.exports = { calculateCVSSAFR, WEIGHTS, AFR_LABELS };
