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

const STAKEHOLDERS = ['tool_user', 'organization', 'vehicle_owner', 'regulator', 'oem'];
const RATINGS = ['Negligible', 'Moderate', 'Major', 'Severe'];
const STRIDE_CATEGORIES = [
  'spoofing',
  'tampering',
  'repudiation',
  'information_disclosure',
  'denial_of_service',
  'elevation_of_privilege'
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key || !key.startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    args[key.slice(2)] = argv[index + 1];
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function formatId(prefix, index) {
  return `${prefix}_${String(index + 1).padStart(2, '0')}`;
}

function toTitle(value) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hasAttackerLanguage(value) {
  return /attacker|hacker|malicious actor/i.test(value);
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] === null ? 'null' : item[field];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function submitCheckpoint(assessmentId, payload) {
  const baseUrl = process.env.CHECKPOINT_API_URL;
  const token = process.env.CHECKPOINT_API_TOKEN;
  if (!baseUrl && !token) return { skipped: true };
  if (!baseUrl || !token) {
    throw new Error('Checkpoint API unreachable: CHECKPOINT_API_URL and CHECKPOINT_API_TOKEN are both required');
  }

  const response = await fetch(`${baseUrl}/api/v1/assessments/${assessmentId}/checkpoints`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkpoint API unreachable: ${response.status} ${body}`);
  }
  return response.json();
}

function requireFileArg(args, name) {
  if (!args[name]) throw new Error(`Missing required argument: --${name}`);
  return args[name];
}

function assertRating(value, label) {
  if (!RATINGS.includes(value)) throw new Error(`Invalid rating ${value} for dimension ${label}`);
}

module.exports = {
  CIAAAN_PROPERTIES,
  RATINGS,
  STAKEHOLDERS,
  STRIDE_CATEGORIES,
  assertRating,
  countBy,
  formatId,
  hasAttackerLanguage,
  parseArgs,
  readJson,
  requireFileArg,
  submitCheckpoint,
  toTitle,
  writeJson
};
