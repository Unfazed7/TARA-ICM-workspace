'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDamageScenarios,
  validateDamageScenarios
} = require('../../tara-workspace/web-based-tara/stages/02-damage-analysis/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

test('damage analysis creates one scenario per true CIAAAN property', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets, '2026-06-01T10:01:00Z');
  const expected = Object.values(assets[0].ciaaan).filter(Boolean).length;
  assert.equal(scenarios.length, expected);
  assert.equal(validateSchema(scenarios, readJson(schemaPath(2))).valid, true);
});

test('damage analysis rejects attacker language', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets);
  scenarios[0].damage_scenario = 'An attacker steals data.';
  assert.throws(() => validateDamageScenarios(scenarios, assets), /attacker language/);
});

test('damage analysis rejects duplicate asset/property pairs', () => {
  const assets = readJson(fixturePath('valid', 'stage-01-asset-register.json'));
  const scenarios = buildDamageScenarios(assets);
  scenarios.push({ ...scenarios[0], damage_id: 'DS_99' });
  assert.throws(() => validateDamageScenarios(scenarios, assets), /Duplicate damage scenario/);
});
