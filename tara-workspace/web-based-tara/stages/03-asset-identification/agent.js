#!/usr/bin/env node
'use strict';

/**
 * Stage 03 Asset Identification (spec .meta/specs/26-stage-03-assets.md, D-56).
 *
 *   node agent.js --stage02 <stored stage 02 output.json> [--stage01 <stored stage 01 output.json>] --out <folder>
 *
 * Reads only the stored Item Definition (and, for source quotes, the stored Stage 01 facts), never client
 * documents. Code derives the candidate assets and their starting properties from `_config/asset-rules.md`;
 * one model call writes names, descriptions and reasons and may propose changes; code then applies the
 * checks of spec 26. Writes `assets.json`, `rationale.json` and `stage03-log.json` into the folder.
 *
 * Exit codes: 0 done, 3 output did not pass the schema checks (written for inspection), 1 error.
 */

const fs = require('fs');
const path = require('path');

const { loadRules } = require('../../_engines/asset-rules');
const { deriveCandidates } = require('./lib/candidates');
const { propose } = require('./lib/model');
const { applyReply, toRecord } = require('./lib/checks');
const { writeRationale } = require('./lib/rationale');
const { enable, progress } = require('../progress');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCHEMAS = path.join(ROOT, 'src', 'schemas');

function validate(data, schemaFile) {
  const Ajv = require('ajv');
  const addFormats = require('ajv-formats');
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const check = ajv.compile(JSON.parse(fs.readFileSync(path.join(SCHEMAS, schemaFile), 'utf8')));
  return { valid: check(data), errors: check.errors || [] };
}

/** The stored output (`{item_definition, ...}`) or a bare Item Definition both work. */
const itemDefinitionOf = (raw) => (raw && raw.item_definition ? raw.item_definition : raw);

/**
 * @param {object} args
 * @param {object} args.stage02   stored Stage 02 output
 * @param {object} [args.stage01] stored Stage 01 output (facts), for source quotes
 */
async function runStage03({ stage02, stage01, scopeDecisions, fetchImpl = fetch, rules = loadRules() }) {
  const def = itemDefinitionOf(stage02);
  if (!def || !Array.isArray(def.elements)) throw new Error('the Item Definition has no elements');
  const { candidates, unmatched } = deriveCandidates(def, scopeDecisions, rules);
  progress(`${candidates.length} candidate asset(s) from ${def.elements.length} component(s), ${(def.functions || []).length} function(s), ${(def.links || []).length} connection(s); ${unmatched.length} component(s) without a table row`);
  if (!candidates.length && !unmatched.length) throw new Error('no asset could be derived from the Item Definition');

  let reply = null;
  try {
    reply = await propose({ def, candidates, unmatched, fetchImpl });
  } catch (err) {
    if (/API key not set|(LLM|Anthropic) API error (400|401|403|404)\b|Configured LLM model .* is unavailable/i.test(err.message)) throw err;
    progress(`The model could not write the reasons (${err.message}); the starting properties are used`);
  }
  const { assets, notes } = applyReply({ candidates, unmatched, reply, def, rules });
  for (const n of notes) {
    if (n.kind === 'rejected') progress(`Proposal for ${n.asset.assetId} ${n.property} not used: ${n.why}`);
    if (n.kind === 'rejected-addition') progress(`Addition for ${n.sourceId} not used: ${n.why}`);
  }
  const records = assets.map((a) => toRecord(a, rules)).sort((x, y) => x._order[0] - y._order[0] || x._order[1] - y._order[1]);
  records.forEach((r) => delete r._order);

  const factsById = new Map(((stage01 && stage01.facts) || []).map((f) => [f.fact_id, f]));
  const rationale = writeRationale({ notes, factsById, anchorId: (candidates[0] || { sourceIds: [unmatched[0].id] }).sourceIds[0] });
  progress(`Built ${records.length} asset(s); ${rationale.filter((r) => r.attention === 'needs_attention').length} Assumption(s) need the analyst`);

  const errors = [];
  for (const [data, file, label] of [[records, 'stage-03-assets.schema.json', 'assets'], [rationale, 'rationale.schema.json', 'rationale']]) {
    const check = validate(data, file);
    if (!check.valid) errors.push(...check.errors.slice(0, 20).map((e) => ({ file: label, message: `${e.instancePath} ${e.message}` })));
  }
  const withoutRow = records.filter((r) => !r.asset_type_row).map((r) => r.asset_id);
  return { assets: records, rationale, errors, log: { candidates: candidates.length, unmatched, without_table_row: withoutRow, notes: notes.map((n) => ({ kind: n.kind, asset: n.asset && n.asset.assetId, property: n.property, why: n.why })) } };
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i] || !argv[i].startsWith('--')) throw new Error(`Invalid argument: ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.stage02 || !args.out) {
    process.stderr.write('Usage: node agent.js --stage02 <stage 02 output.json> [--stage01 <stage 01 output.json>] [--scope-decisions <file>] --out <folder>\n');
    process.exitCode = 1;
    return;
  }
  const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const scopeRaw = args['scope-decisions'] ? read(args['scope-decisions']) : null;
  const out = path.resolve(args.out);
  const result = await runStage03({ stage02: read(args.stage02), stage01: args.stage01 ? read(args.stage01) : null, scopeDecisions: scopeRaw ? (scopeRaw.scope_decisions || scopeRaw) : null });
  writeJson(path.join(out, 'stage03-log.json'), { log: result.log, schema_errors: result.errors });
  writeJson(path.join(out, 'assets.json'), result.assets);
  writeJson(path.join(out, 'rationale.json'), result.rationale);
  if (result.errors.length) {
    process.stderr.write(`Stage 03 output did not pass the schema checks: ${result.errors.map((e) => `${e.file} ${e.message}`).join('; ')}\n`);
    process.exitCode = 3;
    return;
  }
  process.stdout.write(`Stage 03 built ${result.assets.length} assets and ${result.rationale.length} Assumptions.\n`);
}

if (require.main === module) {
  enable('03');
  main().catch((err) => {
    progress(`Stopped by an error:\n${err.stack || err.message}`);
    process.stderr.write(`Stage 03 failed: ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { runStage03 };
