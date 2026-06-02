'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAssetsFromCsv,
  buildAssetsFromDiagram,
  callAnthropicVision,
  parseBoolean,
  validateAssets
} = require('../../tara-workspace/web-based-tara/stages/01-input-normalization/agent');
const { ROOT, readJson, schemaPath, validateSchema } = require('../helpers/schema-validation');

function inputFixture(fileName) {
  return path.join(ROOT, 'tests', 'fixtures', 'inputs', fileName);
}

test('CSV input normalizes asset register', () => {
  const assets = buildAssetsFromCsv(fs.readFileSync(inputFixture('asset-list.csv'), 'utf8'), '2026-06-01T10:00:00Z');
  validateAssets(assets);
  assert.equal(assets.length, 2);
  assert.equal(assets[0].asset_id, 'AS_01');
  assert.equal(assets[0].input_mode, 'csv');
  assert.equal(assets[0].ciaaan.authorization, true);
  const result = validateSchema(assets, readJson(schemaPath(1)));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
});

test('diagram mode uses tool_choice and normalizes tool_use result', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let requestBody = null;
  const fakeFetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        content: [{
          type: 'tool_use',
          name: 'submit_asset_register',
          input: {
            assets: [{
              asset_title: 'Diagram API',
              asset_type: 'api_endpoint',
              asset_description: 'API inferred from diagram',
              ciaaan: {
                confidentiality: true,
                integrity: true,
                availability: true,
                authenticity: true,
                authorization: true,
                non_repudiation: false
              }
            }]
          }
        }]
      })
    };
  };

  const assets = await buildAssetsFromDiagram(inputFixture('architecture.png'), '2026-06-01T10:00:00Z', fakeFetch);
  process.env.ANTHROPIC_API_KEY = previousKey;

  assert.deepEqual(requestBody.tool_choice, { type: 'tool', name: 'submit_asset_register' });
  assert.equal(requestBody.tools[0].name, 'submit_asset_register');
  assert.equal(assets[0].asset_id, 'AS_01');
  assert.equal(assets[0].input_mode, 'diagram');
  validateAssets(assets);
});

test('diagram request fails without API key', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    () => callAnthropicVision(inputFixture('architecture.png'), async () => { throw new Error('not called'); }),
    /ANTHROPIC_API_KEY is required/
  );
  process.env.ANTHROPIC_API_KEY = previousKey;
});

test('CSV missing required column fails clearly', () => {
  assert.throws(
    () => buildAssetsFromCsv(fs.readFileSync(inputFixture('asset-list-missing-column.csv'), 'utf8')),
    /CSV missing required column: non_repudiation/
  );
});

test('invalid asset_type is rejected', () => {
  assert.throws(
    () => buildAssetsFromCsv(fs.readFileSync(inputFixture('asset-list-invalid-type.csv'), 'utf8')),
    /Invalid asset_type/
  );
});

test('all-false CIAAAN row is rejected by validation', () => {
  const assets = buildAssetsFromCsv(fs.readFileSync(inputFixture('asset-list-all-false.csv'), 'utf8'));
  assert.throws(() => validateAssets(assets), /must have at least one CIAAAN flag true/);
});

test('CIAAAN boolean parser accepts spec values', () => {
  assert.equal(parseBoolean('yes'), true);
  assert.equal(parseBoolean('TRUE'), true);
  assert.equal(parseBoolean('1'), true);
  assert.equal(parseBoolean('no'), false);
  assert.equal(parseBoolean('FALSE'), false);
  assert.equal(parseBoolean('0'), false);
});
