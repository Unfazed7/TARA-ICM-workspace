#!/usr/bin/env node
'use strict';

/**
 * Stage 10 Residual Risk (D-55).
 *
 *   node agent.js --attacks <attack-paths.json> --treatments <risk-treatment.json> --impacts <impact-analysis.json>
 *                 --risk-register <risk-register.json> --assessment-id <id> --out <residual-risk.json>
 *
 * Residual feasibility is the Stage 06 feasibility calculation, with the Stage 09 controls applied:
 * the same four CVSS exploitability metrics, the same `calculateCVSSAFR()`, and the same risk formula as
 * Stage 08 (`computeRiskScore()`). The model proposes the four metrics again for each threat that has
 * controls; code decides: a control may only make an attack harder, so a change toward the easier value
 * is rejected and the metric keeps its pre-control value. Threats that are accepted, avoided or have no
 * controls keep the Stage 06 metrics without a model call. Numbers are never written by the model.
 *
 * Writes next to --out: rationale.json (one Assumption per metric change or rejected change) and
 * stage10-log.json. Exit codes: 0 done, 3 output did not pass the schema checks (written as
 * *.invalid.json for inspection), 1 error.
 */

const fs = require('fs');
const path = require('path');

const { callLLM, isRefusal } = require('../llm-client');
const { calculateCVSSAFR, WEIGHTS } = require('../../_engines/cvss-afr-calc');
const { computeRiskScore } = require('../../_engines/risk-score');
const { topicForText } = require('../../_engines/topics');
const { enable, progress } = require('../progress');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCHEMAS = path.join(ROOT, 'src', 'schemas');

// Same values as stages/06-attack-path-modelling (CVSS_ENUMS) and src/schemas/stage-06-attack-paths.schema.json.
const CVSS_ENUMS = {
  attack_vector: ['N', 'A', 'L', 'P'],
  attack_complexity: ['L', 'H'],
  privileges_required: ['N', 'L', 'H'],
  user_interaction: ['N', 'R'],
};
const METRIC_WEIGHTS = {
  attack_vector: WEIGHTS.AV,
  attack_complexity: WEIGHTS.AC,
  privileges_required: WEIGHTS.PR,
  user_interaction: WEIGHTS.UI,
};
const METRIC_LABEL = {
  attack_vector: 'how the attacker reaches it',
  attack_complexity: 'how hard it is to carry out',
  privileges_required: 'the access the attacker needs',
  user_interaction: 'whether a user has to take part',
};
const TREATED = new Set(['reduce', 'share']);

const metricReply = (values) => ({
  type: 'object', additionalProperties: false, required: ['value', 'control_id', 'reason'],
  properties: { value: { type: 'string', enum: values }, control_id: { type: 'string' }, reason: { type: 'string' } },
});
const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(CVSS_ENUMS),
  properties: Object.fromEntries(Object.entries(CVSS_ENUMS).map(([metric, values]) => [metric, metricReply(values)])),
};

function buildSystemPrompt() {
  return fs.readFileSync(path.join(__dirname, 'prompts', 're-rate.md'), 'utf8');
}

function buildUserMessage({ attack, treatment }) {
  return [
    `Threat ${attack.threat_id}, attack path ${attack.attack_id}: ${attack.attack_description}`,
    `Steps: ${JSON.stringify(attack.attack_path)}`,
    `Metrics before controls: ${JSON.stringify(attack.cvss_metrics)}`,
    `Why they were rated so: ${JSON.stringify(attack.justifications)}`,
    `Treatment: ${treatment.treatment_option}. ${treatment.treatment_rationale}`,
    `Controls in place:\n${treatment.controls_assigned.map((c) => `${c.control_id} (${c.control_type}) ${c.control_title}: ${c.assignment_rationale}`).join('\n')}`,
  ].join('\n\n');
}

function isNonRecoverableRequestError(error) {
  return /API key not set|(LLM|Anthropic) API error (400|401|403|404)\b|Configured LLM model .* is unavailable|is required \(or set LLM_API_KEY\)/i
    .test(error && error.message ? error.message : String(error));
}

async function proposeMetrics({ attack, treatment, fetchImpl }) {
  const response = await callLLM({
    stage: '10-residual',
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage({ attack, treatment }) }],
    response_schema: { name: 'residual_metrics', schema: REPLY_SCHEMA },
  }, fetchImpl);
  if (isRefusal(response)) throw new Error('the model declined');
  return JSON.parse((response.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));
}

/**
 * Code decides. A change is kept only when it is a real move toward harder, names one of the
 * threat's own controls and gives a reason. Anything else keeps the pre-control value.
 */
function applyProposal({ attack, treatment, proposal }) {
  const controlIds = new Set(treatment.controls_assigned.map((c) => c.control_id));
  const metrics = { ...attack.cvss_metrics };
  const changes = [];
  const rejected = [];
  for (const metric of Object.keys(CVSS_ENUMS)) {
    const asked = proposal && proposal[metric];
    const before = attack.cvss_metrics[metric];
    if (!asked || asked.value === before) continue;
    const weights = METRIC_WEIGHTS[metric];
    const harder = weights[asked.value] < weights[before];
    const reason = String(asked.reason || '').trim();
    if (!harder) rejected.push({ metric, from: before, to: asked.value, control_id: asked.control_id, reason, why: 'a control cannot make an attack easier' });
    else if (!controlIds.has(asked.control_id)) rejected.push({ metric, from: before, to: asked.value, control_id: asked.control_id, reason, why: 'it does not name one of this threat\'s controls' });
    else if (reason.length < 5) rejected.push({ metric, from: before, to: asked.value, control_id: asked.control_id, reason, why: 'it gives no reason' });
    else {
      metrics[metric] = asked.value;
      changes.push({ metric, from: before, to: asked.value, control_id: asked.control_id, reason });
    }
  }
  return { metrics, changes, rejected };
}

function stateOf({ metrics, impact, attackId }) {
  const afr = calculateCVSSAFR(metrics);
  const risk = computeRiskScore(impact, { attack_id: attackId, afr_value: afr.afr_value, afr_label: afr.afr_label });
  return { metrics, afr_value: afr.afr_value, afr_label: afr.afr_label, risk_score: risk.risk_score, risk_level: risk.risk_level };
}

function writeRationale(entries) {
  const items = [];
  const add = (item) => items.push({ rationale_id: `RAT-${1000 + items.length + 1}`, stage: '10', review: { status: 'unreviewed' }, ...item });
  const clip = (text, n) => (text.length <= n ? text : `${text.slice(0, n - 3)}...`);
  for (const e of entries) {
    for (const c of e.changes) {
      add({
        kind: 'assumption',
        topic: topicForText(`${c.reason} ${METRIC_LABEL[c.metric]}`, 'exposure'),
        attention: 'information',
        title: clip(`${c.control_id} makes ${METRIC_LABEL[c.metric]} harder for ${e.threat_id}`, 160),
        concluded: c.reason,
        why: { from_ids: [e.threat_id, e.risk_id] },
        assumed: `With ${c.control_id} in place, the attacker's rating moves from ${c.from} to ${c.to}.`,
        would_change: 'The control not being in place, or the analyst rating the attack differently.',
        affects: [e.threat_id, e.risk_id],
      });
    }
    for (const r of e.rejected) {
      add({
        kind: 'ambiguity',
        topic: 'exposure',
        attention: 'needs_attention',
        title: clip(`A proposed change for ${e.threat_id} was not used`, 160),
        concluded: `The model proposed moving ${METRIC_LABEL[r.metric]} from ${r.from} to ${r.to}, but ${r.why}. The value before controls is kept.`,
        why: { from_ids: [e.threat_id, e.risk_id] },
        assumed: `${METRIC_LABEL[r.metric]} stays at ${r.from} for ${e.threat_id}.`,
        would_change: 'The analyst deciding that a control really changes this.',
        affects: [e.threat_id, e.risk_id],
      });
    }
    if (e.failed) {
      add({
        kind: 'gap',
        topic: 'exposure',
        attention: 'needs_attention',
        title: clip(`${e.threat_id} could not be re-rated with its controls`, 160),
        concluded: `The model could not re-rate this threat (${e.failed}). Its values before controls are shown as the residual values.`,
        why: { from_ids: [e.threat_id, e.risk_id] },
        assumed: 'The controls are assumed not to change the rating until it is run again.',
        would_change: 'Running Stage 10 again.',
        affects: [e.threat_id, e.risk_id],
      });
    }
  }
  return items;
}

async function runStage10({ attacks, treatments, impacts, riskRegister, fetchImpl = fetch, timestamp = new Date().toISOString() }) {
  const attackByThreat = new Map(attacks.map((a) => [a.threat_id, a]));
  const treatmentByThreat = new Map(treatments.map((t) => [t.threat_id, t]));
  const impactByThreat = new Map(impacts.map((i) => [i.threat_id, i]));
  if (!riskRegister.length) throw new Error('risk-register.json is empty');

  const residual = [];
  const entries = [];
  const log = [];
  let n = 0;
  for (const risk of riskRegister) {
    const attack = attackByThreat.get(risk.threat_id);
    const treatment = treatmentByThreat.get(risk.threat_id);
    const impact = impactByThreat.get(risk.threat_id);
    if (!attack || !treatment || !impact) throw new Error(`Missing attack path, treatment or impact for ${risk.threat_id}`);
    const pre = stateOf({ metrics: { ...attack.cvss_metrics }, impact, attackId: attack.attack_id });

    let post = pre;
    let changes = [];
    let rejected = [];
    let failed = null;
    const withControls = TREATED.has(treatment.treatment_option) && treatment.controls_assigned.length > 0;
    if (withControls) {
      n += 1;
      progress(`Re-rating ${risk.threat_id} with ${treatment.controls_assigned.length} control(s) (${n})`);
      let proposal = null;
      for (let attempt = 1; attempt <= 2 && !proposal; attempt += 1) {
        try {
          proposal = await proposeMetrics({ attack, treatment, fetchImpl });
        } catch (error) {
          if (isNonRecoverableRequestError(error)) throw error;
          failed = error.message;
          progress(`Re-rating ${risk.threat_id} failed (attempt ${attempt}): ${error.message}`);
        }
      }
      if (proposal) {
        failed = null;
        const applied = applyProposal({ attack, treatment, proposal });
        changes = applied.changes;
        rejected = applied.rejected;
        post = stateOf({ metrics: applied.metrics, impact, attackId: attack.attack_id });
      }
    }
    for (const r of rejected) progress(`${risk.threat_id}: ${r.metric} ${r.from} to ${r.to} rejected: ${r.why}`);
    if (pre.risk_score !== risk.risk_score) log.push({ threat_id: risk.threat_id, note: 'risk before controls differs from the Stage 08 register', register: risk.risk_score, recomputed: pre.risk_score });

    residual.push({
      residual_id: `RES_${String(residual.length + 1).padStart(2, '0')}`,
      threat_id: risk.threat_id,
      risk_id: risk.risk_id,
      attack_id: attack.attack_id,
      asset_id: risk.asset_id,
      treatment_option: treatment.treatment_option,
      controls: (treatment.controls_assigned || []).map((c) => ({ control_id: c.control_id, control_title: c.control_title, control_type: c.control_type })),
      pre,
      post,
      metric_changes: changes,
      created_timestamp: timestamp,
    });
    entries.push({ threat_id: risk.threat_id, risk_id: risk.risk_id, changes, rejected, failed });
  }
  const rationale = writeRationale(entries);
  const errors = [];
  for (const [data, file, label] of [[residual, 'stage-10-residual-risk.schema.json', 'residual-risk'], [rationale, 'rationale.schema.json', 'rationale']]) {
    const check = validate(data, file);
    if (!check.valid) errors.push(...check.errors.slice(0, 20).map((e) => ({ file: label, message: `${e.instancePath} ${e.message}` })));
  }
  return { residual, rationale, log, errors };
}

/**
 * The assumptions of this stage are the changes it already records: each control that makes a metric harder rests on
 * the control being in place. Nothing is asked of the model for them.
 */
function residualAssumptions(residual) {
  const list = [];
  for (const r of residual) {
    for (const c of r.metric_changes) {
      const title = (r.controls.find((x) => x.control_id === c.control_id) || {}).control_title || 'The control';
      list.push({ about_id: r.residual_id, field: c.metric, text: `${title} is assumed to be in place, so ${METRIC_LABEL[c.metric]} is rated harder for this threat: ${c.reason}`.replace(/\s+/g, ' ').slice(0, 400), needs_attention: true });
    }
  }
  return list;
}

function validate(data, schemaFile) {
  const Ajv = require('ajv');
  const addFormats = require('ajv-formats');
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const check = ajv.compile(JSON.parse(fs.readFileSync(path.join(SCHEMAS, schemaFile), 'utf8')));
  return { valid: check(data), errors: check.errors || [] };
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
  for (const required of ['attacks', 'treatments', 'impacts', 'risk-register', 'out']) {
    if (!args[required]) {
      process.stderr.write('Usage: node agent.js --attacks <file> --treatments <file> --impacts <file> --risk-register <file> --assessment-id <id> --out <residual-risk.json>\n');
      process.exitCode = 1;
      return;
    }
  }
  const read = (name) => JSON.parse(fs.readFileSync(path.resolve(args[name]), 'utf8'));
  const out = path.resolve(args.out);
  const dir = path.dirname(out);
  const result = await runStage10({ attacks: read('attacks'), treatments: read('treatments'), impacts: read('impacts'), riskRegister: read('risk-register') });
  writeJson(path.join(dir, 'stage10-log.json'), { assessment_id: args['assessment-id'] || null, log: result.log, schema_errors: result.errors });
  if (result.errors.length) {
    writeJson(path.join(dir, 'residual-risk.invalid.json'), { residual: result.residual, rationale: result.rationale });
    process.stderr.write(`Stage 10 output did not pass the schema checks: ${result.errors.map((e) => e.message).join('; ')}\n`);
    process.exitCode = 3;
    return;
  }
  writeJson(path.join(dir, 'rationale.json'), result.rationale);
  writeJson(out, result.residual);
  writeJson(path.join(dir, 'assumptions.json'), residualAssumptions(result.residual));
  const changed = result.residual.filter((r) => r.metric_changes.length).length;
  process.stdout.write(`Stage 10 computed residual risk for ${result.residual.length} threats; ${changed} changed by controls.\n`);
}

if (require.main === module) {
  enable('10');
  main().catch((err) => {
    progress(`Stopped by an error:\n${err.stack || err.message}`);
    process.stderr.write(`Stage 10 failed: ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { runStage10, applyProposal, stateOf, residualAssumptions, buildSystemPrompt, buildUserMessage, REPLY_SCHEMA, CVSS_ENUMS };
