'use strict';

const fs = require('fs');
const path = require('path');
const {
  CIAAAN_PROPERTIES,
  formatId,
  parseArgs,
  requireFileArg,
  submitCheckpoint,
  writeJson
} = require('../agent-utils');

const ASSET_TYPES = [
  'communication_path',
  'data_store',
  'ecu',
  'function',
  'auth_credential',
  'api_endpoint',
  'cloud_service'
];

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n', ''].includes(normalized)) return false;
  throw new Error(`Invalid CIAAAN boolean value: ${value}`);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function buildAssetsFromCsv(csvText) {
  const requiredColumns = [
    'asset_title',
    'asset_type',
    'asset_description',
    ...CIAAAN_PROPERTIES
  ];
  const rows = parseCsv(csvText);
  if (rows.length === 0) throw new Error('CSV contains no asset rows');

  const missing = requiredColumns.find((column) => !(column in rows[0]));
  if (missing) throw new Error(`CSV missing required column: ${missing}`);

  return rows.map((row, index) => normalizeAsset(row, index, 'csv'));
}

function buildAssetsFromDiagram(inputPath) {
  fs.readFileSync(inputPath);
  const title = path.basename(inputPath, path.extname(inputPath)).replace(/[-_]+/g, ' ');
  return [
    normalizeAsset({
      asset_title: title || 'Architecture Diagram Asset',
      asset_type: 'api_endpoint',
      asset_description: `Web application asset inferred from architecture diagram ${path.basename(inputPath)}.`,
      confidentiality: 'yes',
      integrity: 'yes',
      availability: 'yes',
      authenticity: 'yes',
      authorization: 'yes',
      non_repudiation: 'no'
    }, 0, 'diagram')
  ];
}

function normalizeAsset(row, index, inputMode) {
  if (!ASSET_TYPES.includes(row.asset_type)) {
    throw new Error(`Invalid asset_type: ${row.asset_type}`);
  }
  const ciaaan = Object.fromEntries(CIAAAN_PROPERTIES.map((property) => [
    property,
    parseBoolean(row[property])
  ]));
  if (!Object.values(ciaaan).some(Boolean)) {
    console.warn(`Asset ${row.asset_title} has no CIAAAN flags set to true`);
  }
  return {
    asset_id: formatId('AS', index),
    asset_title: row.asset_title,
    asset_type: row.asset_type,
    asset_description: row.asset_description,
    ciaaan,
    input_mode: inputMode,
    created_timestamp: new Date().toISOString()
  };
}

function validateAssets(assets) {
  if (assets.length === 0) throw new Error('asset-register.json is empty');
  for (const asset of assets) {
    for (const property of CIAAAN_PROPERTIES) {
      if (typeof asset.ciaaan[property] !== 'boolean') {
        throw new Error(`Missing CIAAAN boolean ${property} for ${asset.asset_id}`);
      }
    }
    if (!Object.values(asset.ciaaan).some(Boolean)) {
      throw new Error(`Asset ${asset.asset_id} must have at least one CIAAAN flag true`);
    }
  }
}

async function run(options) {
  const mode = options.mode;
  if (!['csv', 'diagram'].includes(mode)) throw new Error('--mode must be csv or diagram');
  const assets = mode === 'csv'
    ? buildAssetsFromCsv(fs.readFileSync(options.input, 'utf8'))
    : buildAssetsFromDiagram(options.input);
  validateAssets(assets);
  writeJson(options.out, assets);
  await submitCheckpoint(options.assessmentId, {
    stage_num: 1,
    stage_name: 'input-normalization',
    output_summary: {
      total_assets: assets.length,
      input_mode: mode,
      assets: assets.map((asset) => ({ asset_id: asset.asset_id, asset_title: asset.asset_title }))
    }
  });
  return assets;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    input: requireFileArg(args, 'input'),
    mode: args.mode,
    assessmentId: args['assessment-id'],
    out: requireFileArg(args, 'out')
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildAssetsFromCsv,
  buildAssetsFromDiagram,
  parseBoolean,
  run,
  validateAssets
};
