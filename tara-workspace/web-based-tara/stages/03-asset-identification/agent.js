#!/usr/bin/env node
'use strict';

/**
 * Stage 03 Asset Identification (D-54).
 *
 *   node agent.js --item-definition <file> --assessment-id <id> --out <asset-register.json> [--scope-decisions <file>]
 *
 * Reads only the stored Item Definition, never client documents. The prompt is this stage's
 * CONTEXT.md plus the two reference files it lists, read at run time, so extending CONTEXT.md
 * changes the prompt without a code change. One model call proposes the assets; code then
 * enforces the hard rules (containers are never assets, out-of-scope components produce none,
 * interfaces only the item's side, unknown sources are dropped), assigns ids and validates the
 * register against src/schemas/stage-03-asset-register.schema.json before writing it.
 *
 * Writes next to --out: rationale.json (one Assumption per asset and per property) and
 * stage03-log.json. Exit codes: 0 done, 3 output did not pass the schema checks (written as
 * *.invalid.json for inspection, nothing written to --out), 1 error.
 */

const fs = require('fs');
const path = require('path');

const { callLLM, isRefusal } = require('../llm-client');
const { enforce, toRegister, PROPERTIES, ASSET_TYPES } = require('./lib/rules');
const { writeRationale } = require('./lib/rationale');
const { enable, progress } = require('../progress');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CONFIG = path.resolve(__dirname, '..', '..', '_config');
const SCHEMAS = path.join(ROOT, 'src', 'schemas');

const nstr = { type: 'string' };
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const PROPERTY = obj({ applies: { type: 'boolean' }, reason: nstr, unsure: { type: 'boolean' } });
const REPLY_SCHEMA = obj({
  assets: {
    type: 'array',
    items: obj({
      source_id: nstr,
      title: nstr,
      asset_type: { type: 'string', enum: ASSET_TYPES },
      description: nstr,
      reason: nstr,
      ciaaan: obj(Object.fromEntries(PROPERTIES.map((p) => [p, PROPERTY]))),
    }),
  },
});

/** The system prompt: this stage's CONTEXT.md, the references it lists, then the fixed output rules. */
function buildSystemPrompt() {
  const context = fs.readFileSync(path.join(__dirname, 'CONTEXT.md'), 'utf8');
  const listed = (context.match(/\*\*Load from `_config\/`:\*\*\s*([^\n]+)/) || [, ''])[1].match(/`([^`]+)`/g) || [];
  const refs = (listed.length ? listed.map((f) => f.replace(/`/g, '')) : ['web-asset-types.md', 'ciaaan-properties.md'])
    .map((file) => `\n\n---\n\n# Reference: ${file}\n\n${fs.readFileSync(path.join(CONFIG, file), 'utf8')}`);
  const output = fs.readFileSync(path.join(__dirname, 'prompts', 'assets.md'), 'utf8');
  return `${context}${refs.join('')}\n\n---\n\n${output}`;
}

/** What the model sees of the Item Definition: compact lines, with the scope of each element. */
function describe(def, scope) {
  const name = new Map([...(def.elements || []).map((e) => [e.element_id, e.name]), ...(def.containers || []).map((c) => [c.container_id, c.name]), ...(def.zones || []).map((z) => [z.zone_id, z.name])]);
  const lines = [`Item: ${def.item_name}`, `Boundary: ${def.boundary_statement && def.boundary_statement.text}`, '', 'Elements:'];
  for (const e of def.elements || []) {
    lines.push(JSON.stringify({
      id: e.element_id, name: e.name, kind: e.asset_type, scope: scope.get(e.element_id) || 'in_scope', zone: name.get(e.zone_id), container: name.get(e.parent_container_id) || undefined,
      entry_point: e.is_entry_point, owner: e.owner_operator, auth: e.auth_method, data: e.data_handled, stated_security: e.stated_security_config,
    }));
  }
  lines.push('', 'Connections:');
  for (const l of def.links || []) {
    lines.push(JSON.stringify({
      id: l.link_id, from: `${l.source_id} ${name.get(l.source_id)}`, to: `${l.destination_id} ${name.get(l.destination_id)}`, protocol: l.protocol, auth: l.authentication,
      encryption: l.encryption, data: l.data_carried, crosses_trust_boundary: l.crosses_trust_boundary,
    }));
  }
  lines.push('', 'Functions:');
  for (const f of def.functions || []) {
    lines.push(JSON.stringify({ id: f.function_id, name: f.name, description: f.description, actors: f.actor_ids, elements: f.element_ids, data_read: f.data_read, privileged: f.privileged }));
  }
  lines.push('', 'Containers (never assets):');
  for (const c of def.containers || []) lines.push(`${c.container_id} ${c.name} (${c.kind})`);
  return lines.join('\n');
}

function validate(data, schemaFile) {
  const Ajv = require('ajv');
  const addFormats = require('ajv-formats');
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const check = ajv.compile(JSON.parse(fs.readFileSync(path.join(SCHEMAS, schemaFile), 'utf8')));
  return { valid: check(data), errors: check.errors || [] };
}

/** The stored output (`{item_definition, ...}`) or a bare Item Definition both work. */
function itemDefinitionOf(raw) {
  return raw && raw.item_definition ? raw.item_definition : raw;
}

async function runStage03({ itemDefinition, scopeDecisions, fetchImpl = fetch, timestamp }) {
  const def = itemDefinitionOf(itemDefinition);
  if (!def || !Array.isArray(def.elements)) throw new Error('the Item Definition has no elements');
  const decisions = scopeDecisions || def.scope_decisions || [];
  const scope = new Map(decisions.map((d) => [d.element_id, d.status]));
  progress(`Identifying assets from ${def.elements.length} component(s), ${(def.links || []).length} connection(s), ${(def.functions || []).length} function(s)`);

  const response = await callLLM({
    stage: '03-assets',
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: describe(def, scope) }],
    response_schema: { name: 'asset_register', schema: REPLY_SCHEMA },
  }, fetchImpl);
  if (isRefusal(response)) throw new Error('the model declined');
  const reply = JSON.parse((response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));

  const { kept, dropped } = enforce(def, reply, decisions);
  for (const d of dropped) progress(`Left out "${d.title}" (${d.source_id}): ${d.why}`);
  const register = toRegister(kept, { timestamp });
  const unsure = new Map(register.map((a, i) => {
    const flagged = new Set(PROPERTIES.filter((p) => kept[i].ciaaan[p].unsure === true));
    return [a.asset_id, flagged];
  }));
  const rationale = writeRationale({ register, unsure });
  progress(`Kept ${register.length} asset(s), left out ${dropped.length}`);

  const errors = [];
  if (!register.length) errors.push({ message: 'no asset was identified' });
  else {
    const a = validate(register, 'stage-03-asset-register.schema.json');
    if (!a.valid) errors.push(...a.errors.slice(0, 20).map((e) => ({ file: 'asset-register', message: `${e.instancePath} ${e.message}` })));
  }
  const r = validate(rationale, 'rationale.schema.json');
  if (!r.valid) errors.push(...r.errors.slice(0, 20).map((e) => ({ file: 'rationale', message: `${e.instancePath} ${e.message}` })));
  return { register, rationale, dropped, errors };
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
  if (!args['item-definition'] || !args.out) {
    process.stderr.write('Usage: node agent.js --item-definition <file> --assessment-id <id> --out <asset-register.json> [--scope-decisions <file>]\n');
    process.exitCode = 1;
    return;
  }
  const itemDefinition = JSON.parse(fs.readFileSync(path.resolve(args['item-definition']), 'utf8'));
  const scopeRaw = args['scope-decisions'] ? JSON.parse(fs.readFileSync(path.resolve(args['scope-decisions']), 'utf8')) : null;
  const scopeDecisions = scopeRaw ? (scopeRaw.scope_decisions || scopeRaw) : null;
  const out = path.resolve(args.out);
  const dir = path.dirname(out);
  const result = await runStage03({ itemDefinition, scopeDecisions });
  writeJson(path.join(dir, 'stage03-log.json'), { assessment_id: args['assessment-id'] || null, dropped: result.dropped, schema_errors: result.errors });
  if (result.errors.length) {
    writeJson(path.join(dir, 'asset-register.invalid.json'), { register: result.register, rationale: result.rationale });
    process.stderr.write(`Stage 03 output did not pass the schema checks: ${result.errors.map((e) => e.message).join('; ')}\n`);
    process.exitCode = 3;
    return;
  }
  writeJson(path.join(dir, 'rationale.json'), result.rationale);
  writeJson(out, result.register);
  process.stdout.write(`Stage 03 identified ${result.register.length} assets, ${result.rationale.length} Assumptions, ${result.dropped.length} left out.\n`);
}

if (require.main === module) {
  enable('03');
  main().catch((err) => {
    progress(`Stopped by an error:\n${err.stack || err.message}`);
    process.stderr.write(`Stage 03 failed: ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { runStage03, buildSystemPrompt, describe, REPLY_SCHEMA };
