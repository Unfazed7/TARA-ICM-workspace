'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  buildAssetsFromCsv,
  buildAssetsFromDiagram,
  validateAssets
} = require('../../tara-workspace/web-based-tara/stages/01-input-normalization/agent');
const { ROOT, validateSchema, readJson, schemaPath } = require('../helpers/schema-validation');

test('CSV input normalizes asset register', () => {
  const csv = require('fs').readFileSync(path.join(ROOT, 'tests/fixtures/inputs/asset-list.csv'), 'utf8');
  const assets = buildAssetsFromCsv(csv);
  validateAssets(assets);
  assert.equal(assets.length, 2);
  assert.equal(assets[0].asset_id, 'AS_01');
  assert.equal(assets[0].ciaaan.authorization, true);
  const result = validateSchema(assets, readJson(schemaPath(1)));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});

test('diagram input produces schema-valid fallback asset', () => {
  const assets = buildAssetsFromDiagram(path.join(ROOT, 'tests/fixtures/inputs/architecture.png'));
  validateAssets(assets);
  assert.equal(assets[0].input_mode, 'diagram');
  assert.equal(validateSchema(assets, readJson(schemaPath(1))).valid, true);
});

test('CSV missing required column fails clearly', () => {
  const csv = require('fs').readFileSync(path.join(ROOT, 'tests/fixtures/inputs/asset-list-missing-column.csv'), 'utf8');
  assert.throws(() => buildAssetsFromCsv(csv), /CSV missing required column: non_repudiation/);
});

test('invalid asset_type is rejected', () => {
  const csv = require('fs').readFileSync(path.join(ROOT, 'tests/fixtures/inputs/asset-list-invalid-type.csv'), 'utf8');
  assert.throws(() => buildAssetsFromCsv(csv), /Invalid asset_type/);
});

test('all-false CIAAAN row is rejected by validation', () => {
  const csv = require('fs').readFileSync(path.join(ROOT, 'tests/fixtures/inputs/asset-list-all-false.csv'), 'utf8');
  const assets = buildAssetsFromCsv(csv);
  assert.throws(() => validateAssets(assets), /must have at least one CIAAAN flag true/);
});
