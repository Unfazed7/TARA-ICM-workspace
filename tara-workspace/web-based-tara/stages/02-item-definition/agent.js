#!/usr/bin/env node
'use strict';

/**
 * Stage 02 Item Definition (spec .meta/specs/21-stage-02-build.md, D-45).
 *
 *   node agent.js --stage01 <folder> [--boundary <file>] [--out <folder>] [--seed --api <url> --assessment <id>]
 *   node agent.js --api <url> --assessment <id> [--seed]      (reads the current Stage 01 run)
 *
 * The model proposes the structure and reports facts in fixed words; code assigns ids,
 * applies the fixed rules, decides scope from `_config/scoping-facts.md`, builds the
 * questions and writes the Rationale. Never reads client documents.
 *
 * Exit codes: 0 done, 3 output did not pass the schema checks (written for inspection), 1 error.
 */

const fs = require('fs');
const path = require('path');

const model = require('./lib/model');
const { writeRationale } = require('./lib/rationale');
const { buildItem, stripHelpers } = require('../../_engines/item-builder');
const scope = require('../../_engines/scope-rules');
const { quoteFound } = require('../01-input-normalization/lib/quotes');
const { enable, progress } = require('../progress');

const DEFAULT_OUT = path.join(__dirname, 'output');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ID_IN_TEXT = /\b(S\d{1,2}|FT-0\d|R-\d{2}|EL-\d{3}|IF-\d{2}|FCT-\d{3}|CTR-\d{2}|ZN-\d{2}|Q-\d{3}|SD-\d{3}|ASM-\d{2})\b/;
const READING_FOR = { 'FT-01': ['runs', ['provider', 'team', 'third_party']], 'FT-02': ['controls', ['item_team', 'central_team', 'provider']], 'FT-03': ['shared', ['dedicated', 'shared']], 'FT-04': ['reachable', ['yes', 'no']], 'FT-05': ['data', ['known']], 'FT-06': ['environments_shared', ['yes', 'no']], 'FT-07': ['pushes_changes', ['yes', 'no']] };

function cap() {
  return { normal: Number(process.env.QUESTION_CAP || 3), unknown: Number(process.env.QUESTION_CAP_UNKNOWN_KIND || 7) };
}

function questionKey(q) {
  return q.fact_type === 'generic' ? `${q.target_id}|generic|${(q.topic || '').toLowerCase().trim()}` : `${q.target_id}|${q.fact_type}`;
}

/** Maps a target written by the model (element name, container name, link id or "A -> B") to an id. */
function targetFinder(itemDef) {
  const byName = new Map();
  for (const e of itemDef.elements) byName.set(e.name.toLowerCase(), e.element_id);
  for (const c of itemDef.containers) byName.set(c.name.toLowerCase(), c.container_id);
  for (const l of itemDef.links) {
    byName.set(l.link_id.toLowerCase(), l.link_id);
    byName.set(`${l.source_name} -> ${l.destination_name}`.toLowerCase(), l.link_id);
  }
  for (const e of itemDef.elements) byName.set(e.element_id.toLowerCase(), e.element_id);
  for (const c of itemDef.containers) byName.set(c.container_id.toLowerCase(), c.container_id);
  return (target) => byName.get(String(target || '').toLowerCase().trim()) || null;
}

async function safely(log, what, fn) {
  try {
    return await fn();
  } catch (err) {
    log.push({ step: what, error: err.message });
    progress(`Step "${what}" failed and was skipped: ${err.message}`);
    return null;
  }
}

/**
 * Runs Stage 02 from a Stage 01 result {document_register, facts, conflicts}.
 */
async function runStage02({ stage01, boundary, outDir = DEFAULT_OUT, fetchImpl = fetch }) {
  const log = [];
  const rejectedIds = stage01.facts.filter((f) => f.status === 'rejected').map((f) => f.fact_id);
  const facts = stage01.facts.filter((f) => f.status !== 'rejected');
  const factsById = new Map(facts.map((f) => [f.fact_id, f]));
  const conflicts = stage01.conflicts || [];
  const diagramGiven = (stage01.document_register || []).some((d) => d.doc_type === 'diagram' && d.read_status !== 'failed');

  progress(`Building from ${facts.length} fact(s) and ${conflicts.length} conflict(s); boundary ${boundary ? 'set' : 'not set'}`);
  // 1. The model proposes the structure. Without it nothing can be built.
  let reply;
  try {
    reply = await model.build({ facts, conflicts, boundary, diagramGiven, fetchImpl });
  } catch (err) {
    throw new Error(`the Item Definition could not be built: ${err.message}`);
  }
  const built = buildItem({ reply, facts, rejectedIds, conflicts, boundary, diagramGiven });
  const { itemDef, readings, containerReadings, answeredTopics, notes } = built;
  log.push(...built.log);
  const item = itemDef.item_name;
  progress(`Structure built: ${itemDef.elements.length} component(s), ${itemDef.links.length} connection(s)`);
  const rules = scope.loadRules();

  // 2. Starter questions from the trigger table.
  let candidates = [];
  for (const e of itemDef.elements) {
    candidates.push(...scope.starterQuestions({ target: e.element_id, kind: e.asset_type, name: e.name, readings: readings.get(e.element_id) || {}, answeredTopics: answeredTopics.get(e.element_id), item, rules }));
  }
  const account = itemDef.containers.find((c) => c.kind === 'cloud_account');
  if (account) {
    candidates.push(...scope.starterQuestions({ target: account.container_id, kind: 'cloud_account', name: account.name, readings: containerReadings.get(account.container_id) || {}, item, rules }));
  }

  // 3. The model may suggest more; code keeps only well-formed ones.
  const findTarget = targetFinder(itemDef);
  const suggested = await safely(log, 'suggest questions', () => model.suggest({ itemDef, questions: candidates, fetchImpl }));
  for (const s of (suggested && suggested.questions) || []) {
    const target = findTarget(s.target);
    const ok = target && (s.fact_type !== 'generic' || (s.topic && s.topic.length >= 3)) && s.text.length >= 5 && s.why_it_matters.length >= 5 && s.default_if_unanswered;
    if (!ok) {
      log.push({ dropped: 'suggested question', question: s, reason: 'no known target, fact type or topic' });
      continue;
    }
    const q = { target_id: target, fact_type: s.fact_type, text: s.text, why_it_matters: s.why_it_matters, default_if_unanswered: s.default_if_unanswered, origin: 'generated' };
    if (s.fact_type === 'generic') q.topic = s.topic.slice(0, 80);
    candidates.push(q);
  }
  const seen = new Set();
  candidates = candidates.filter((q) => {
    const k = questionKey(q);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 4. Drop questions the facts already answer (quote checked against the cited facts).
  const nameOf = (id) => (itemDef.elements.find((e) => e.element_id === id) || itemDef.containers.find((c) => c.container_id === id) || itemDef.links.find((l) => l.link_id === id) || {}).name || id;
  candidates.forEach((q, i) => { q.key = `q${i + 1}`; q.target_name = nameOf(q.target_id); });
  const checked = candidates.length ? await safely(log, 'answer check', () => model.answerCheck({ facts, questions: candidates, fetchImpl })) : { answers: [] };
  const answers = new Map(((checked && checked.answers) || []).map((a) => [a.question, a]));
  for (const q of candidates) {
    const a = answers.get(q.key);
    q.status = 'open';
    if (!a || !a.answered || !a.quote) continue;
    const cited = (a.fact_ids || []).filter((id) => factsById.has(id));
    const text = cited.map((id) => `${factsById.get(id).value}\n${factsById.get(id).source_refs.map((s) => s.quote).join('\n')}`).join('\n');
    if (!cited.length || !quoteFound(a.quote, text)) {
      log.push({ kept_open: q.key, reason: 'answer quote not found in the cited facts' });
      continue;
    }
    q.status = 'dropped_answered_by_docs';
    q.answer = a.quote.slice(0, 500);
    q.answered_by = 'client';
    q.answer_fact_ids = cited;
    const [field, values] = READING_FOR[q.fact_type] || [];
    const bag = q.target_id.startsWith('CTR-') ? containerReadings : readings;
    if (field && values.includes(a.reading) && bag.has(q.target_id)) bag.get(q.target_id)[field] = a.reading;
    if (q.fact_type === 'generic' && answeredTopics.has(q.target_id)) answeredTopics.get(q.target_id).push(q.topic);
  }

  // 5. Cap visible questions per target; give ids.
  const visible = new Map();
  const questions = [];
  const kindOf = (id) => (itemDef.elements.find((e) => e.element_id === id) || {}).asset_type;
  for (const q of candidates) {
    if (q.status === 'open') {
      const limit = kindOf(q.target_id) === 'unknown_kind' ? cap().unknown : cap().normal;
      const n = visible.get(q.target_id) || 0;
      if (n >= limit) {
        log.push({ dropped: 'question over the cap', target: q.target_id, text: q.text });
        continue;
      }
      visible.set(q.target_id, n + 1);
    }
    questions.push(q);
  }
  questions.forEach((q, i) => { q.question_id = `Q-${String(i + 1).padStart(3, '0')}`; });

  progress('Deciding scope from the rules table');
  // 6. Scope, decided by code.
  const decisions = itemDef.elements.map((e) => {
    const zone = itemDef.zones.find((z) => z.zone_id === e.zone_id);
    const open = questions.filter((q) => q.target_id === e.element_id && q.status === 'open');
    return { element: e, ...scope.decideScope({ kind: e.asset_type, zoneKind: zone.kind, readings: readings.get(e.element_id) || {}, openQuestions: open, rules }) };
  });

  // 7. The model explains each decision in one plain sentence; code checks it.
  const explained = await safely(log, 'explain scope', () => model.explain({
    item,
    decisions: decisions.map((d) => ({ element: d.element.name, asset_type: d.element.asset_type, decision: d.status, assumed: d.assumed, why: scope.templateReason(d.basis, d.element.name, item), facts: d.element.fact_ids.map((id) => factsById.get(id).value) })),
    fetchImpl,
  }));
  const reasons = new Map(((explained && explained.reasons) || []).map((r) => [r.element.toLowerCase(), r.reason]));
  itemDef.scope_decisions = decisions.map((d, i) => {
    let reason = reasons.get(d.element.name.toLowerCase());
    if (!reason || reason.length < 10 || ID_IN_TEXT.test(reason) || /\u2014/.test(reason)) reason = scope.templateReason(d.basis, d.element.name, item);
    return {
      decision_id: `SD-${String(i + 1).padStart(3, '0')}`,
      element_id: d.element.element_id,
      status: d.status,
      reason,
      based_on_fact_ids: d.element.fact_ids,
      based_on_question_ids: d.assumed ? d.question_ids : [],
      assumed: d.assumed && d.question_ids.length > 0,
    };
  });

  // 8. Rationale and outputs.
  const storedQuestions = questions.map(({ key, target_name, answer_fact_ids, ...q }) => q);
  const rationale = writeRationale({ itemDef, questions: storedQuestions, decisions: itemDef.scope_decisions, notes, factsById });
  const failedSteps = log.filter((l) => l.error).map((l) => l.step);
  if (failedSteps.length && facts.length) {
    rationale.push({
      rationale_id: `RAT-${200 + rationale.length + 1}`,
      stage: '02',
      kind: 'gap',
      topic: 'reading',
      attention: 'information',
      title: 'Some checks did not run',
      concluded: `These steps did not run: ${failedSteps.join(', ')}. Scope reasons use standard wording, and questions the documents may already answer are still listed.`,
      why: { sources: facts[0].source_refs.slice(0, 1) },
      assumed: 'The output is complete but less polished.',
      would_change: 'Running Stage 02 again.',
      affects: [itemDef.elements[0] ? itemDef.elements[0].element_id : facts[0].fact_id],
      review: { status: 'unreviewed' },
    });
  }

  const output = { itemDef: stripHelpers(itemDef), questions: storedQuestions, rationale, newKinds: built.newKinds, log };
  output.errors = validate(output);
  writeOutputs(outDir, output);
  return output;
}

function validate({ itemDef, questions, rationale }) {
  const { validateSchema } = loadValidator();
  const schema = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'schemas', name), 'utf8'));
  const errors = [];
  for (const [data, file] of [[itemDef, 'stage-02-item-definition.schema.json'], [questions, 'stage-02-questions.schema.json'], [rationale, 'rationale.schema.json']]) {
    const r = validateSchema(data, schema(file));
    if (!r.valid) errors.push({ file, errors: r.errors.slice(0, 20) });
  }
  return errors;
}

function loadValidator() {
  const Ajv = require('ajv');
  const addFormats = require('ajv-formats');
  return {
    validateSchema(data, schema) {
      const ajv = new Ajv({ strict: false, allErrors: true });
      addFormats(ajv);
      const v = ajv.compile(schema);
      return { valid: v(data), errors: v.errors || [] };
    },
  };
}

function writeOutputs(outDir, out) {
  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  write('item-definition.json', out.itemDef);
  write('questions.json', out.questions);
  write('rationale.json', out.rationale);
  write('stage02-log.json', { log: out.log, schema_errors: out.errors });
  if (out.newKinds.length) {
    fs.appendFileSync(path.join(outDir, 'new-kinds.log'), out.newKinds.map((k) => `${new Date().toISOString()} ${JSON.stringify(k)}\n`).join(''));
  }
}

async function serviceToken({ api, secret, fetchImpl }) {
  const res = await fetchImpl(`${api}/api/v1/auth/service-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) });
  if (!res.ok) throw new Error(`service login failed (${res.status})`);
  return (await res.json()).access_token;
}

async function loadStage01FromApi({ api, assessmentId, secret, fetchImpl = fetch }) {
  const token = await serviceToken({ api, secret, fetchImpl });
  const res = await fetchImpl(`${api}/api/v1/assessments/${assessmentId}/stages/01/runs/current/output`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`reading Stage 01 failed (${res.status})`);
  return res.json();
}

function loadStage01FromFolder(dir) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  const { facts, conflicts } = read('facts.json');
  return { document_register: read('document-register.json'), facts, conflicts };
}

async function seedStage02({ api, assessmentId, secret, output, fetchImpl = fetch }) {
  const token = await serviceToken({ api, secret, fetchImpl });
  const res = await fetchImpl(`${api}/api/v1/assessments/${assessmentId}/stages/02/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_definition: output.itemDef, questions: output.questions, rationale: output.rationale }),
  });
  const body = await res.json();
  if (!res.ok && res.status !== 422) throw new Error(`storing the run failed (${res.status}): ${JSON.stringify(body)}`);
  return { status: res.status, ...body };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'seed') args.seed = true;
    else { args[k] = argv[i + 1]; i += 1; }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const api = args.api || 'http://localhost:8000';
  const secret = process.env.PIPELINE_SERVICE_SECRET;
  if (!args.stage01 && !args.assessment) {
    process.stderr.write('Usage: node agent.js --stage01 <folder> [--boundary <file>] [--out <folder>] [--seed --api <url> --assessment <id>]\n');
    process.exitCode = 1;
    return;
  }
  const stage01 = args.stage01 ? loadStage01FromFolder(path.resolve(args.stage01)) : await loadStage01FromApi({ api, assessmentId: args.assessment, secret });
  const boundary = args.boundary ? fs.readFileSync(path.resolve(args.boundary), 'utf8') : null;
  const out = await runStage02({ stage01, boundary, outDir: path.resolve(args.out || DEFAULT_OUT) });
  const open = out.questions.filter((q) => q.status === 'open').length;
  process.stdout.write(`Stage 02 built ${out.itemDef.elements.length} elements, ${out.itemDef.links.length} links, ${out.itemDef.scope_decisions.length} scope decisions, ${open} open questions, ${out.rationale.length} Rationale items.\n`);
  if (out.errors.length) {
    process.stderr.write(`Output did not pass the schema checks; see stage02-log.json.\n`);
    process.exitCode = 3;
    return;
  }
  if (args.seed) {
    const stored = await seedStage02({ api, assessmentId: args.assessment, secret, output: out });
    process.stdout.write(`Stored as run ${stored.run_number ?? '(none)'}; ${(stored.refused || []).length} item(s) refused.\n`);
    for (const r of stored.refused || []) process.stdout.write(`  ${r.rule}: ${r.message} ${JSON.stringify(r.details)}\n`);
  }
}

if (require.main === module) {
  enable('02');
  main().catch((err) => {
    progress(`Stopped by an error:\n${err.stack || err.message}`);
    process.stderr.write(`Stage 02 failed: ${err.message}\n`);
    process.exitCode = 1;
    return;
  });
}

module.exports = { runStage02, seedStage02, loadStage01FromFolder, loadStage01FromApi };
