'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildImpactAnalysis,
  validateImpactAnalysis
} = require('../../tara-workspace/web-based-tara/stages/05-impact-analysis/agent');
const { readJson, fixturePath, validateSchema, schemaPath } = require('../helpers/schema-validation');

test('impact analysis creates exactly one impact per threat', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = buildImpactAnalysis(threats, damage, '2026-06-01T10:04:00Z');
  assert.equal(impacts.length, threats.length);
  assert.equal(validateSchema(impacts, readJson(schemaPath(5))).valid, true);
});

test('domain constraints are always enforced', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = buildImpactAnalysis(threats, damage);
  assert.equal(impacts[0].tool_user.safety, 'Negligible');
  assert.equal(impacts[0].tool_user.financial, 'Negligible');
});

test('impact validation rejects non-negligible fixed dimensions', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const damage = readJson(fixturePath('valid', 'stage-02-damage-scenarios.json'));
  const impacts = buildImpactAnalysis(threats, damage);
  impacts[0].tool_user.safety = 'Major';
  assert.throws(() => validateImpactAnalysis(impacts, threats, damage), /safety must be Negligible/);
});

test('missing damage scenario fails clearly', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  assert.throws(() => buildImpactAnalysis(threats, []), /No damage scenario found/);
});
