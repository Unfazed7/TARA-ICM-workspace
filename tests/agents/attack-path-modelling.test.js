'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAttackPaths,
  validateAttackPaths
} = require('../../tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent');
const { calculateCVSSAFR } = require('../../tara-workspace/web-based-tara/_engines/cvss-afr-calc');
const { readJson, fixturePath, validateSchema, schemaPath, ROOT } = require('../helpers/schema-validation');

test('attack path modelling creates pre-engine paths with null AFR fields', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const paths = buildAttackPaths(threats, '2026-06-01T10:03:00Z');
  assert.equal(paths.length, threats.length);
  assert.equal(paths[0].afr_value, null);
  assert.equal(paths[0].afr_label, null);
  assert.equal(validateSchema(paths, readJson(schemaPath(4))).valid, true);
});

test('invalid CVSS enum is rejected', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const paths = buildAttackPaths(threats);
  paths[0].cvss_metrics.attack_vector = 'Z';
  assert.throws(() => validateAttackPaths(paths, threats), /Invalid CVSS metric/);
});

test('empty attack step is rejected', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const paths = buildAttackPaths(threats);
  paths[0].attack_path.step_4_control_gap = '';
  assert.throws(() => validateAttackPaths(paths, threats), /Empty attack path step/);
});

test('CVSS engine fills AFR after Stage 04 output', () => {
  const threats = readJson(fixturePath('valid', 'stage-03-threats.json'));
  const paths = buildAttackPaths(threats);
  const filled = paths.map((item) => ({ ...item, ...calculateCVSSAFR(item.cvss_metrics) }));
  assert.equal(filled[0].afr_value >= 1 && filled[0].afr_value <= 5, true);
  assert.equal(['very low', 'low', 'medium', 'high', 'very high'].includes(filled[0].afr_label), true);
});

test('CVSS engine CLI fills AFR fields', () => {
  const tmpDir = fs.mkdtempSync(path.join(ROOT, 'tests', '.tmp-'));
  const input = path.join(tmpDir, 'stage-04-attack-paths.json');
  const output = path.join(tmpDir, 'stage-04-attack-paths.json');
  fs.writeFileSync(input, JSON.stringify(buildAttackPaths(readJson(fixturePath('valid', 'stage-03-threats.json')))));
  require('child_process').execFileSync('node', [
    path.join(ROOT, 'tara-workspace/web-based-tara/_engines/cvss-afr-calc.js'),
    '--input',
    input,
    '--out',
    output
  ]);
  const updated = readJson(output);
  assert.equal(updated[0].afr_value >= 1 && updated[0].afr_value <= 5, true);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
