'use strict';

/**
 * Model calls for Stage 02 (spec 21). Four calls per run, all strict JSON, all through
 * the one model client. The model proposes and reports; code decides.
 */

const fs = require('fs');
const path = require('path');
const { callLLM, isRefusal } = require('../../llm-client');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const CONFIG = path.resolve(__dirname, '..', '..', '..', '_config');
const PROMPTS = path.resolve(__dirname, '..', 'prompts');
const ITEM_SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'schemas', 'stage-02-item-definition.schema.json'), 'utf8'));
const P = ITEM_SCHEMA.properties;

const enumOf = (schema) => ({ type: 'string', enum: schema.enum });
const nstr = { type: ['string', 'null'] };
const strs = { type: 'array', items: { type: 'string' } };
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

const DATA_ITEM = obj({
  item: nstr,
  category: enumOf(ITEM_SCHEMA.definitions.data_item.properties.category),
  purpose: nstr,
  held_where: nstr,
  usable_by: nstr,
});
const READINGS = obj({
  runs: { type: 'string', enum: ['provider', 'team', 'third_party', 'unknown'] },
  controls: { type: 'string', enum: ['item_team', 'central_team', 'provider', 'unknown'] },
  shared: { type: 'string', enum: ['dedicated', 'shared', 'unknown'] },
  reachable: { type: 'string', enum: ['yes', 'no', 'unknown'] },
  data: { type: 'string', enum: ['known', 'unknown'] },
  environments_shared: { type: 'string', enum: ['yes', 'no', 'unknown'] },
  pushes_changes: { type: 'string', enum: ['yes', 'no', 'unknown'] },
  fact_ids: strs,
});
const FACT_TYPE = { type: 'string', enum: ['FT-01', 'FT-02', 'FT-03', 'FT-04', 'FT-05', 'FT-06', 'FT-07', 'generic'] };

const BUILD_SCHEMA = obj({
  item_name: { type: 'string' },
  boundary_proposal: nstr,
  zones: { type: 'array', items: obj({ name: { type: 'string' }, kind: enumOf(P.zones.items.properties.kind), fact_ids: strs }) },
  containers: {
    type: 'array',
    items: obj({ name: { type: 'string' }, kind: enumOf(P.containers.items.properties.kind), parent: nstr, zone: nstr, fact_ids: strs, readings: READINGS }),
  },
  elements: {
    type: 'array',
    items: obj({
      name: { type: 'string' },
      kind: enumOf(P.elements.items.properties.kind),
      kind_label: nstr,
      container: nstr,
      zone: { type: 'string' },
      provider: nstr,
      hosting_type: { type: ['string', 'null'], enum: ['managed', 'self_hosted', 'unknown', null] },
      internet_exposed: { type: 'string', enum: ['yes', 'no', 'unknown'] },
      exposure_fact_ids: strs,
      is_entry_point: { type: 'boolean' },
      auth_method: nstr,
      owner_operator: { type: 'string' },
      data_handled: { type: 'array', items: DATA_ITEM },
      stated_security_config: strs,
      fact_ids: strs,
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      readings: READINGS,
      answered_topics: strs,
    }),
  },
  links: {
    type: 'array',
    items: obj({
      type: enumOf(P.links.items.properties.type),
      source: { type: 'string' },
      destination: { type: 'string' },
      direction: enumOf(P.links.items.properties.direction),
      protocol: enumOf(P.links.items.properties.protocol),
      port: nstr,
      usage_at_destination: { type: 'string' },
      authentication: { type: 'string' },
      encryption: { type: 'string' },
      data_carried: { type: 'array', items: DATA_ITEM },
      remark: { type: 'string' },
      sync_async: { type: ['string', 'null'], enum: ['sync', 'async', null] },
      inferred_from_text: { type: 'boolean' },
      fact_ids: strs,
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    }),
  },
  functions: {
    type: 'array',
    items: obj({
      name: { type: 'string' }, description: { type: 'string' }, actors: strs, elements: strs, endpoints: strs,
      data_read: { type: 'array', items: DATA_ITEM }, data_written: { type: 'array', items: DATA_ITEM }, privileged: { type: 'boolean' }, fact_ids: strs,
    }),
  },
  assumptions: { type: 'array', items: obj({ text: { type: 'string' }, fact_ids: strs }) },
  responsibility_split: { type: 'array', items: obj({ element: { type: 'string' }, provider_side: { type: 'string' }, customer_side: { type: 'string' } }) },
  stated_control_fact_ids: strs,
  stated_absence_fact_ids: strs,
  stakeholders: { type: 'array', items: obj({ role: { type: 'string' }, interest: { type: 'string' } }) },
});

const SUGGEST_SCHEMA = obj({
  questions: {
    type: 'array',
    items: obj({ target: { type: 'string' }, fact_type: FACT_TYPE, topic: nstr, text: { type: 'string' }, why_it_matters: { type: 'string' }, default_if_unanswered: { type: 'string' } }),
  },
});

const ANSWER_SCHEMA = obj({
  answers: {
    type: 'array',
    items: obj({
      question: { type: 'string' },
      answered: { type: 'boolean' },
      fact_ids: strs,
      quote: nstr,
      reading: { type: 'string', enum: ['provider', 'team', 'third_party', 'item_team', 'central_team', 'dedicated', 'shared', 'yes', 'no', 'known', 'none'] },
    }),
  },
});

const REASON_SCHEMA = obj({ reasons: { type: 'array', items: obj({ element: { type: 'string' }, reason: { type: 'string' } }) } });

function prompt(name, extras = []) {
  const parts = [fs.readFileSync(path.join(PROMPTS, name), 'utf8')];
  for (const file of extras) parts.push(`\n\n---\n\n# Reference: ${file}\n\n${fs.readFileSync(path.join(CONFIG, file), 'utf8')}`);
  return parts.join('');
}

function json(response) {
  if (isRefusal(response)) throw new Error('the model declined');
  const text = (response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  return JSON.parse(text);
}

function factLines(facts) {
  return facts.map((f) => JSON.stringify({ id: f.fact_id, subject: f.subject, type: f.fact_type, value: f.value, group: f.group, quote: f.source_refs[0].quote })).join('\n');
}

async function call(stage, system, user, name, schema, fetchImpl) {
  return json(await callLLM({ stage, system, messages: [{ role: 'user', content: user }], response_schema: { name, schema } }, fetchImpl));
}

function build({ facts, conflicts, boundary, diagramGiven, fetchImpl }) {
  const open = conflicts.filter((c) => !c.auto_resolved).map((c) => `${c.conflict_id} (${c.kind}): ${c.proposed_resolution}`);
  const user = [
    `Boundary statement: ${boundary || '(none given; propose one)'}`,
    `A diagram was supplied: ${diagramGiven ? 'yes' : 'no (mark every link inferred_from_text)'}`,
    `Open disagreements between documents, with the default to apply:\n${open.join('\n') || '(none)'}`,
    `Facts, one per line:\n${factLines(facts)}`,
  ].join('\n\n');
  return call('02-build', prompt('build-model.md', ['element-kinds.md', 'link-model.md']), user, 'item_definition', BUILD_SCHEMA, fetchImpl);
}

function suggest({ itemDef, questions, fetchImpl }) {
  const els = itemDef.elements.map((e) => `${e.element_id} ${e.name} (${e.kind})`).join('\n');
  const links = itemDef.links.map((l) => `${l.link_id} ${l.source_name} -> ${l.destination_name}, authentication: ${l.authentication}, encryption: ${l.encryption}`).join('\n');
  const asked = questions.map((q) => `${q.target_id} ${q.fact_type}${q.topic ? ` (${q.topic})` : ''}: ${q.text}`).join('\n');
  const user = `Elements:\n${els}\n\nLinks:\n${links}\n\nContainers:\n${itemDef.containers.map((c) => `${c.container_id} ${c.name} (${c.kind})`).join('\n')}\n\nQuestions already planned:\n${asked}`;
  return call('02-generate-questions', prompt('suggest-questions.md'), user, 'extra_questions', SUGGEST_SCHEMA, fetchImpl);
}

function answerCheck({ facts, questions, fetchImpl }) {
  const user = `Questions:\n${questions.map((q) => `${q.key} [${q.fact_type}${q.topic ? `: ${q.topic}` : ''}] about ${q.target_name}: ${q.text}`).join('\n')}\n\nFacts, one per line:\n${factLines(facts)}`;
  return call('02-answer-check', prompt('answer-check.md'), user, 'question_answers', ANSWER_SCHEMA, fetchImpl);
}

function explain({ decisions, item, fetchImpl }) {
  const user = `Item: ${item}\n\nDecisions:\n${decisions.map((d) => JSON.stringify(d)).join('\n')}`;
  return call('02-explain', prompt('explain-scope.md', ['analyst-language.md']), user, 'scope_reasons', REASON_SCHEMA, fetchImpl);
}

module.exports = { build, suggest, answerCheck, explain, BUILD_SCHEMA, SUGGEST_SCHEMA, ANSWER_SCHEMA, REASON_SCHEMA };
