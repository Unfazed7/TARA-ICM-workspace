'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AFR_LABELS,
  MAX_EXPLOITABILITY,
  MIN_EXPLOITABILITY,
  WEIGHTS,
  calculateCVSSAFR
} = require('../../tara-workspace/web-based-tara/_engines/cvss-afr-calc');

test('maximum CVSS exploitability maps to AFR 5', () => {
  const result = calculateCVSSAFR({
    attack_vector: 'N',
    attack_complexity: 'L',
    privileges_required: 'N',
    user_interaction: 'N'
  });
  assert.deepEqual(result, { afr_value: 5, afr_label: 'very high' });
});

test('minimum CVSS exploitability maps to AFR 1', () => {
  const result = calculateCVSSAFR({
    attack_vector: 'P',
    attack_complexity: 'H',
    privileges_required: 'H',
    user_interaction: 'R'
  });
  assert.deepEqual(result, { afr_value: 1, afr_label: 'very low' });
});

test('all 32 CVSS metric combinations produce bounded AFR values', () => {
  for (const attack_vector of Object.keys(WEIGHTS.AV)) {
    for (const attack_complexity of Object.keys(WEIGHTS.AC)) {
      for (const privileges_required of Object.keys(WEIGHTS.PR)) {
        for (const user_interaction of Object.keys(WEIGHTS.UI)) {
          const result = calculateCVSSAFR({
            attack_vector,
            attack_complexity,
            privileges_required,
            user_interaction
          });
          assert.equal(Number.isInteger(result.afr_value), true);
          assert.equal(result.afr_value >= 1 && result.afr_value <= 5, true);
          assert.equal(result.afr_label, AFR_LABELS[result.afr_value]);
        }
      }
    }
  }
});

test('constants are exported for verification', () => {
  assert.equal(Number(MIN_EXPLOITABILITY.toFixed(3)), 0.121);
  assert.equal(Number(MAX_EXPLOITABILITY.toFixed(3)), 3.893);
});

test('invalid and missing metrics throw field-specific errors', () => {
  assert.throws(() => calculateCVSSAFR({}), /Missing required field: attack_vector/);
  assert.throws(() => calculateCVSSAFR({
    attack_vector: 'Z',
    attack_complexity: 'L',
    privileges_required: 'N',
    user_interaction: 'N'
  }), /Invalid attack_vector: Z/);
  assert.throws(() => calculateCVSSAFR({
    attack_vector: 'N',
    attack_complexity: 'Z',
    privileges_required: 'N',
    user_interaction: 'N'
  }), /Invalid attack_complexity: Z/);
  assert.throws(() => calculateCVSSAFR({
    attack_vector: 'N',
    attack_complexity: 'L',
    privileges_required: 'Z',
    user_interaction: 'N'
  }), /Invalid privileges_required: Z/);
  assert.throws(() => calculateCVSSAFR({
    attack_vector: 'N',
    attack_complexity: 'L',
    privileges_required: 'N',
    user_interaction: 'Z'
  }), /Invalid user_interaction: Z/);
});
