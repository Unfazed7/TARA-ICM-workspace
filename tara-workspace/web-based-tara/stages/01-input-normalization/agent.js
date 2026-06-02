'use strict';

const fs = require('fs');
const path = require('path');

const CIAAAN_PROPERTIES = [
  'confidentiality',
  'integrity',
  'availability',
  'authenticity',
  'authorization',
  'non_repudiation'
];

const ASSET_TYPES = [
  'communication_path',
  'data_store',
  'ecu',
  'function',
  'auth_credential',
  'api_endpoint',
  'cloud_service'
];

const MODEL = 'claude-opus-4-8';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key || !key.startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    args[key.slice(2)] = argv[index + 1];
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) throw new Error(`Missing required argument: --${name}`);
  return args[name];
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV contains no asset rows');

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n', ''].includes(normalized)) return false;
  throw new Error(`Invalid CIAAAN boolean value: ${value}`);
}

function formatAssetId(index) {
  return `AS_${String(index + 1).padStart(2, '0')}`;
}

function normalizeCsvAsset(row, index, inputMode, timestamp = new Date().toISOString()) {
  if (!ASSET_TYPES.includes(row.asset_type)) throw new Error(`Invalid asset_type: ${row.asset_type}`);

  const ciaaan = Object.fromEntries(CIAAAN_PROPERTIES.map((property) => [
    property,
    parseBoolean(row[property])
  ]));

  if (!Object.values(ciaaan).some(Boolean)) {
    console.warn(`Asset ${row.asset_title} has no CIAAAN flags set to true`);
  }

  return {
    asset_id: formatAssetId(index),
    asset_title: row.asset_title,
    asset_type: row.asset_type,
    asset_description: row.asset_description,
    ciaaan,
    input_mode: inputMode,
    created_timestamp: timestamp
  };
}

function buildAssetsFromCsv(csvText, timestamp) {
  const requiredColumns = [
    'asset_title',
    'asset_type',
    'asset_description',
    ...CIAAAN_PROPERTIES
  ];
  const rows = parseCsv(csvText);

  const missing = requiredColumns.find((column) => !(column in rows[0]));
  if (missing) throw new Error(`CSV missing required column: ${missing}`);

  return rows.map((row, index) => normalizeCsvAsset(row, index, 'csv', timestamp));
}

function validateAssets(assets) {
  if (!Array.isArray(assets) || assets.length === 0) throw new Error('asset-register.json is empty');

  const ids = new Set();
  for (const asset of assets) {
    if (!/^AS_\d{2,}$/.test(asset.asset_id)) throw new Error(`Invalid asset_id: ${asset.asset_id}`);
    if (ids.has(asset.asset_id)) throw new Error(`Duplicate asset_id: ${asset.asset_id}`);
    ids.add(asset.asset_id);
    if (!ASSET_TYPES.includes(asset.asset_type)) throw new Error(`Invalid asset_type: ${asset.asset_type}`);
    if (!['csv', 'diagram'].includes(asset.input_mode)) throw new Error(`Invalid input_mode: ${asset.input_mode}`);
    for (const property of CIAAAN_PROPERTIES) {
      if (typeof asset.ciaaan?.[property] !== 'boolean') {
        throw new Error(`Missing CIAAAN boolean ${property} for ${asset.asset_id}`);
      }
    }
    if (!Object.values(asset.ciaaan).some(Boolean)) {
      throw new Error(`Asset ${asset.asset_id} must have at least one CIAAAN flag true`);
    }
  }
}

function loadSubmitAssetRegisterTool() {
  const toolSchemasPath = path.resolve(__dirname, '../../../../src/schemas/tool-use-schemas.json');
  const toolSchemas = JSON.parse(fs.readFileSync(toolSchemasPath, 'utf8'));
  const tool = toolSchemas.tools.find((item) => item.name === 'submit_asset_register');
  if (!tool) throw new Error('Tool schema submit_asset_register not found');
  return tool;
}

function buildDiagramPrompt() {
  const configDir = path.resolve(__dirname, '../../_config');
  const assetTypes = fs.readFileSync(path.join(configDir, 'web-asset-types.md'), 'utf8');
  const ciaaanProperties = fs.readFileSync(path.join(configDir, 'ciaaan-properties.md'), 'utf8');
  return [
    assetTypes,
    ciaaanProperties,
    'Extract all identifiable web assets from this architecture diagram.',
    'For each asset, assign applicable CIAAAN properties as booleans.',
    'Return only via the submit_asset_register tool.'
  ].join('\n\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === 'submit_asset_register');
  if (!toolUse) return null;
  return toolUse.input?.assets || toolUse.input;
}

async function callAnthropicVision(imagePath, fetchImpl = fetch) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for diagram mode');

  const base64png = fs.readFileSync(imagePath).toString('base64');
  const requestBody = {
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64png } },
        { type: 'text', text: buildDiagramPrompt() }
      ]
    }],
    tools: [loadSubmitAssetRegisterTool()],
    tool_choice: { type: 'tool', name: 'submit_asset_register' }
  };

  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`Claude Vision request failed: ${response.status}`);
  return response.json();
}

async function buildAssetsFromDiagram(imagePath, timestamp, fetchImpl) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callAnthropicVision(imagePath, fetchImpl);
    const assets = extractToolUse(response);
    if (Array.isArray(assets)) {
      return assets.map((asset, index) => ({
        ...asset,
        asset_id: formatAssetId(index),
        input_mode: 'diagram',
        created_timestamp: timestamp || new Date().toISOString()
      }));
    }
  }
  throw new Error('Claude returned free text instead of submit_asset_register tool_use');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function submitCheckpoint(assessmentId, mode, assets, fetchImpl = fetch) {
  const apiUrl = process.env.CHECKPOINT_API_URL;
  const token = process.env.CHECKPOINT_API_TOKEN;
  if (!apiUrl && !token) return { skipped: true };
  if (!apiUrl || !token) throw new Error('Checkpoint API unreachable: missing CHECKPOINT_API_URL or CHECKPOINT_API_TOKEN');

  const response = await fetchImpl(`${apiUrl}/api/v1/assessments/${assessmentId}/checkpoints`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      stage_num: 1,
      stage_name: 'input-normalization',
      output_summary: {
        total_assets: assets.length,
        input_mode: mode,
        assets: assets.map((asset) => ({ asset_id: asset.asset_id, asset_title: asset.asset_title }))
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkpoint API unreachable: ${response.status} ${body}`);
  }
  return response.json();
}

async function run(options) {
  const { input, mode, assessmentId, out, timestamp, fetchImpl } = options;
  if (!['csv', 'diagram'].includes(mode)) throw new Error('--mode must be csv or diagram');

  const assets = mode === 'csv'
    ? buildAssetsFromCsv(fs.readFileSync(input, 'utf8'), timestamp)
    : await buildAssetsFromDiagram(input, timestamp, fetchImpl);

  validateAssets(assets);
  writeJson(out, assets);
  await submitCheckpoint(assessmentId, mode, assets, fetchImpl);
  return assets;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    input: requireArg(args, 'input'),
    mode: requireArg(args, 'mode'),
    assessmentId: requireArg(args, 'assessment-id'),
    out: requireArg(args, 'out')
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
  buildDiagramPrompt,
  callAnthropicVision,
  extractToolUse,
  loadSubmitAssetRegisterTool,
  parseBoolean,
  run,
  validateAssets
};
