'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildThreats,
  validateThreats
} = require('../../tara-workspace/web-based-tara/stages/03-threat-identification/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

test('threat identification creates exactly one threat per damage scenario', () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const threats = buildThreats(damage, '2026-06-01T10:02:00Z');
  assert.equal(threats.length, damage.length);
  assert.equal(validateSchema(threats, readJson(schemaPath(3))).valid, true);
});

test('generic threat without asset title is rejected', () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const threats = buildThreats(damage);
  threats[0].threat_statement = 'Authorization checks may be bypassed.';
  assert.throws(() => validateThreats(threats, damage), /does not contain asset title/);
});

test('invalid stride category is rejected', () => {
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const threats = buildThreats(damage);
  threats[0].stride_category = 'invalid_stride';
  assert.throws(() => validateThreats(threats, damage), /Invalid stride_category/);
});

test('empty damage input fails', () => {
  assert.throws(() => buildThreats([]), /No damage scenarios to process/);
});
