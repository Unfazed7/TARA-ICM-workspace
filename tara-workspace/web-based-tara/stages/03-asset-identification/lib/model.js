'use strict';

/** The one Stage 03 model call (spec 26, step 3): words and proposals; code decides what stays. */

const fs = require('fs');
const path = require('path');
const { callLLM, isRefusal } = require('../../llm-client');
const { PROPERTIES } = require('../../../_engines/asset-rules');

const CONFIG = path.resolve(__dirname, '..', '..', '..', '_config');
const PREFIXES = ['EXT', 'NET', 'INF', 'WL', 'DS', 'IAM', 'API', 'COMM'];

const str = { type: 'string' };
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const REASONS = obj(Object.fromEntries(PROPERTIES.map((p) => [p, str])));
const PROPERTY_ROW = obj({ property: { type: 'string', enum: PROPERTIES }, applies: { type: 'boolean' }, reason: str });

const REPLY_SCHEMA = obj({
  assets: {
    type: 'array',
    items: obj({
      id: str, name: str, description: str, would_change: str, reasons: REASONS,
      changes: { type: 'array', items: PROPERTY_ROW },
      duplicate_of: str,
    }),
  },
  additions: {
    type: 'array',
    items: obj({
      source_id: str, prefix: { type: 'string', enum: PREFIXES }, name: str, description: str, would_change: str, reason: str,
      properties: { type: 'array', items: PROPERTY_ROW },
    }),
  },
});

/** This stage's CONTEXT.md, the property reference, then the fixed output rules. Read at run time. */
function buildSystemPrompt() {
  const context = fs.readFileSync(path.join(__dirname, '..', 'CONTEXT.md'), 'utf8');
  const reference = fs.readFileSync(path.join(CONFIG, 'ciaaan-properties.md'), 'utf8');
  const output = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'assets.md'), 'utf8');
  return `${context}\n\n---\n\n# Reference: ciaaan-properties.md\n\n${reference}\n\n---\n\n${output}`;
}

function describeCandidates(def, candidates, unmatched) {
  const name = new Map((def.elements || []).map((e) => [e.element_id, e.name]));
  const lines = [`Item: ${def.item_name}`, `Boundary: ${def.boundary_statement && def.boundary_statement.text}`, '', 'Candidates:'];
  for (const c of candidates) {
    lines.push(JSON.stringify({
      id: c.assetId, kind: c.typeLabel, name: c.name, from: c.sourceLabel, scope: c.scope, interface: c.interface || undefined,
      data: c.categories.length ? c.categories : undefined, description_hint: c.description || undefined,
      starts_with: c.defaults, may_add: c.mayAdd,
    }));
  }
  lines.push('', 'Components with no row in the rules table (add an asset only if one is really needed):');
  if (!unmatched.length) lines.push('(none)');
  const byId = new Map((def.elements || []).map((e) => [e.element_id, e]));
  for (const u of unmatched) {
    const e = byId.get(u.id);
    lines.push(JSON.stringify({ source_id: u.id, name: u.name, type: u.type, data: (e.data_handled || []).map((d) => d.item || d.category), zone: name.get(e.zone_id) || e.zone_id }));
  }
  return lines.join('\n');
}

async function propose({ def, candidates, unmatched, fetchImpl }) {
  const response = await callLLM({
    stage: '03-assets',
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: describeCandidates(def, candidates, unmatched) }],
    response_schema: { name: 'asset_words', schema: REPLY_SCHEMA },
  }, fetchImpl);
  if (isRefusal(response)) throw new Error('the model declined');
  return JSON.parse((response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));
}

module.exports = { propose, buildSystemPrompt, describeCandidates, REPLY_SCHEMA };
