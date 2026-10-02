'use strict';

/**
 * Scope rules for Stage 02 (spec 21, D-45). Code decides scope; the model only reports
 * facts in fixed words and explains the decision in plain language.
 *
 * Which rule and which questions apply to each element kind are read from the tables
 * in `_config/scoping-facts.md` on every run, so a human refines the rules by editing
 * that file. What each rule decides from the facts is below.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = path.resolve(__dirname, '..', '_config', 'scoping-facts.md');
const EXTERNAL_ZONES = new Set(['internet_external', 'corporate_it', 'third_party_saas', 'vehicle_field_device']);
const ALL_FACT_TYPES = ['FT-01', 'FT-02', 'FT-03', 'FT-04', 'FT-05', 'FT-06', 'FT-07'];

/** Which reading answers each fact type. */
const FACT_READING = {
  'FT-01': 'runs', 'FT-02': 'controls', 'FT-03': 'shared', 'FT-04': 'reachable',
  'FT-05': 'data', 'FT-06': 'environments_shared', 'FT-07': 'pushes_changes',
};
const UNKNOWN = 'unknown';

function tableRows(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`scoping-facts.md has no section "${heading}"`);
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).split('\n')
    .filter((l) => /^\|/.test(l) && !/^\|[-\s|]+\|$/.test(l))
    .slice(1)
    .map((l) => l.slice(1, -1).split(' | ').map((c) => c.trim()));
}

let cache = null;

/** Parses the rule tables. Throws with a plain message if a table is missing. */
function loadRules(file = process.env.SCOPING_FACTS_FILE || CONFIG) {
  if (cache && cache.file === file) return cache.rules;
  const text = fs.readFileSync(file, 'utf8');
  const kinds = {};
  for (const [kindCell, factsCell, rulesCell] of tableRows(text, '## 3. Triggers per element kind')) {
    const kind = kindCell.replace(/`/g, '');
    kinds[kind] = {
      fact_types: /FT-01 to FT-07/.test(factsCell) ? [...ALL_FACT_TYPES] : factsCell.match(/FT-0\d/g) || [],
      topics: [...factsCell.matchAll(/generic "([^"]+)"/g)].map((m) => m[1]),
      rules: rulesCell.match(/S\d+/g) || [],
    };
  }
  const templates = {};
  for (const [ft, , template] of tableRows(text, '## 1. Fact types')) templates[ft] = template.replace(/^"|"$/g, '');
  const factTypes = {};
  for (const [ft, why, fallback] of tableRows(text, '## 5. Why it matters')) factTypes[ft] = { text: templates[ft], why, default: fallback };
  const topics = {};
  for (const [topic, question, why, fallback] of tableRows(text, '## 6. Generic topics')) topics[topic] = { text: question, why, default: fallback };
  const rules = { kinds, factTypes, topics };
  cache = { file, rules };
  return rules;
}

/** Fills a question template. Component names are quoted so they read well without an article. */
function fill(template, name, item) {
  return template.replace(/\{name\}/g, `"${name}"`).replace(/\{item\}/g, item);
}

/** Starter questions an element or account container needs, given what is already known. */
function starterQuestions({ target, kind, name, readings, answeredTopics = [], item, rules = loadRules() }) {
  const trigger = target.startsWith('CTR-')
    ? { fact_types: ['FT-01', 'FT-03', 'FT-06'], topics: [] }
    : rules.kinds[kind] || rules.kinds.unknown_kind;
  const out = [];
  for (const ft of trigger.fact_types) {
    if ((readings[FACT_READING[ft]] || UNKNOWN) !== UNKNOWN) continue;
    const t = rules.factTypes[ft];
    out.push({ target_id: target, fact_type: ft, text: fill(t.text, name, item), why_it_matters: fill(t.why, name, item), default_if_unanswered: fill(t.default, name, item), origin: 'starter' });
  }
  const answered = new Set(answeredTopics.map((t) => t.toLowerCase().trim()));
  for (const topic of trigger.topics) {
    if (answered.has(topic)) continue;
    const t = rules.topics[topic];
    if (!t) continue;
    out.push({ target_id: target, fact_type: 'generic', topic, text: fill(t.text, name, item), why_it_matters: fill(t.why, name, item), default_if_unanswered: fill(t.default, name, item), origin: 'starter' });
  }
  return out;
}

/**
 * Decides scope for one element.
 * @param {object} p
 * @param {string} p.kind        element kind
 * @param {string} p.zoneKind    kind of the element's zone
 * @param {object} p.readings    fixed words from the build call and the answer check
 * @param {Array}  p.openQuestions  open questions targeting this element
 * @returns {{status, assumed, basis, question_ids}} basis is a plain key for the reason template
 */
function decideScope({ kind, zoneKind, readings, openQuestions, rules = loadRules() }) {
  const known = rules.kinds[kind];
  const r = (key) => readings[key] || UNKNOWN;
  const external = EXTERNAL_ZONES.has(zoneKind);
  const openIds = openQuestions.map((q) => q.question_id);
  const assumedOn = (pred) => {
    const ids = openQuestions.filter(pred).map((q) => q.question_id);
    return { assumed: ids.length > 0, question_ids: ids };
  };

  if (!known || kind === 'unknown_kind') {
    return { status: 'ambiguous', assumed: openIds.length > 0, question_ids: openIds, basis: 'unknown_kind' };
  }
  const has = (rule) => known.rules.includes(rule);

  if (has('S7')) return { status: 'interface', assumed: false, question_ids: [], basis: 'supply_chain' };
  if (has('S6')) return { status: 'interface', assumed: false, question_ids: [], basis: 'third_party' };
  if (has('S4') && kind === 'identity_provider') {
    if (r('shared') === 'shared') return { status: 'interface', assumed: false, question_ids: [], basis: 'shared_identity' };
    if (r('shared') === 'dedicated' && r('controls') === 'item_team') return { status: 'in_scope', assumed: false, question_ids: [], basis: 'dedicated_identity' };
    if (r('shared') === 'dedicated') return { status: 'ambiguous', assumed: false, question_ids: [], basis: 'mixed_identity' };
    return { status: 'interface', basis: 'shared_identity', ...assumedOn((q) => q.fact_type === 'FT-03' || q.fact_type === 'FT-02') };
  }
  if (has('S5')) {
    return { status: 'out_of_scope', basis: 'vehicle', ...assumedOn((q) => q.fact_type === 'generic') };
  }
  if (has('S10')) {
    if (['human_actor', 'system_to_system_client'].includes(kind) || external) {
      return { status: 'interface', basis: kind === 'system_to_system_client' ? 'client_system' : 'actor', ...assumedOn(() => true) };
    }
    return { status: 'in_scope', assumed: false, question_ids: [], basis: 'own_component' };
  }
  if (external) return { status: 'interface', assumed: false, question_ids: [], basis: 'outside_account' };
  if (has('S8')) return { status: 'in_scope', assumed: false, question_ids: [], basis: 'monitoring' };
  if (has('S3') && r('runs') !== 'team') return { status: 'in_scope', assumed: false, question_ids: [], basis: 'managed_service' };
  if (has('S2')) return { status: 'in_scope', assumed: false, question_ids: [], basis: 'network_plumbing' };
  return { status: 'in_scope', assumed: false, question_ids: [], basis: 'own_component' };
}

/** Template reasons, used when the model's explanation is missing or unusable. */
function templateReason(basis, name, item) {
  const reasons = {
    supply_chain: `${name} is part of the build and release chain, outside ${item}. The point where it deploys into ${item}, and the credentials ${item} holds for it, are assessed.`,
    third_party: `${name} is an outside service. The connection to it, the data sent and the credentials ${item} holds for it are assessed.`,
    shared_identity: `${name} is a sign-in service shared with other systems. Only the point where ${item} checks its tokens is assessed.`,
    dedicated_identity: `${name} is set up only for ${item} and run by its team, so its configuration is assessed.`,
    mixed_identity: `${name} is used only by ${item} but run by another team, so it is not clear how much of it to assess.`,
    vehicle: `${name} is on the vehicle side, which is assessed in a separate vehicle assessment. The cloud end of its connection is assessed here.`,
    actor: `${name} uses ${item}. Users are shown as such and not broken down; their access path into ${item} is assessed.`,
    client_system: `${name} is another system that calls ${item}. The connection and how it proves its identity are assessed.`,
    outside_account: `${name} is outside ${item}'s cloud account. Its connection to ${item} is assessed.`,
    monitoring: `${name} holds ${item}'s logs or records, which are assessed.`,
    managed_service: `${name} is a cloud service used by ${item}. Its settings and permissions are assessed; the provider's internals are not.`,
    network_plumbing: `${name} is part of ${item}'s network, so it is assessed.`,
    own_component: `${name} is part of ${item}, so it is assessed.`,
    unknown_kind: `${name} is a kind of component not covered yet, so its scope cannot be decided without more facts.`,
  };
  return reasons[basis] || reasons.own_component;
}

module.exports = { loadRules, starterQuestions, decideScope, templateReason, FACT_READING, EXTERNAL_ZONES, ALL_FACT_TYPES };
