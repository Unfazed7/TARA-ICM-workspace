'use strict';

/**
 * What code decides after the model has answered (spec 26, step 4). Every change the model makes to a
 * starting property is kept with `origin: model` and `reviewed: false`, so it shows as proposed and
 * becomes an Assumption that needs the analyst (D-52).
 */

const { PROPERTIES, PROPERTY_NAMES, loadRules, typeLabel } = require('../../../_engines/asset-rules');

const ID_IN_TEXT = /\b(EL|IF|FN|FCT|SD|ASM|Q|CNF|DOC|CTR|ZN|EXT|NET|INF|WL|DS|IAM|API|COMM)-\d{1,3}\b/;
const MISSING_CHECK = /(missing|no|without|lack\w*|absent)\s+(an?\s+|the\s+)?(entitlement|authori[sz]ation|access)[\s-]*(check|control)|(entitlement|authori[sz]ation|access)\s+(check|control)s?\s+(is|are)\s+(missing|absent)|who may (read|see|do)/i;
const PREFIXES = new Set(['EXT', 'NET', 'INF', 'WL', 'DS', 'IAM', 'API', 'COMM']);

const plain = (text, min) => typeof text === 'string' && text.trim().length >= min && !ID_IN_TEXT.test(text);
const clean = (text) => text.trim().replace(/\s+/g, ' ');

/** Template reasons, used when the model gave none or one that is unusable. */
function templateReason(name, property, applies) {
  const n = name.toLowerCase();
  const on = {
    C: `${name} holds data that only the right people may read.`,
    I: `An unauthorised change to ${n} would change what the portal does or shows.`,
    A: `If ${n} stops, what depends on it stops too.`,
    Au: `Others rely on ${n} being genuine.`,
    Az: `${name} decides, or depends on, who may do what.`,
    NR: `Actions done through ${n} must be provable later.`,
  };
  const off = {
    C: `${name} keeps no data of its own that needs to stay private.`,
    I: `Nothing in ${n} can be changed in a way that matters on its own.`,
    A: `Losing ${n} for a while does not stop the portal's functions.`,
    Au: `No one relies on proving where ${n} comes from.`,
    Az: `${name} grants no rights of its own.`,
    NR: `Nothing done through ${n} needs to be proven afterwards.`,
  };
  return (applies ? on : off)[property];
}

/**
 * The data categories held by data-store and credential candidates. A workload's Confidentiality may be on
 * only for data of a kind that no such row covers (spec 26 check 2).
 */
function coveredCategories(candidates) {
  const covered = new Set();
  for (const c of candidates.filter((x) => x.prefix === 'DS' || x.prefix === 'IAM')) c.categories.forEach((cat) => covered.add(cat));
  return covered;
}

function uncoveredData(candidate, def, covered) {
  const byId = new Map((def.elements || []).map((e) => [e.element_id, e]));
  return candidate.sourceIds.some((id) => ((byId.get(id) || {}).data_handled || []).some((d) => d.category && d.category !== 'unspecified' && !covered.has(d.category)));
}

function blankProperties(candidate) {
  const props = {};
  for (const p of PROPERTIES) {
    const applies = candidate.defaults.includes(p);
    props[p] = { applies, reason: templateReason(candidate.name, p, applies), origin: 'default', reviewed: candidate.hasRow };
  }
  return props;
}

/**
 * @param {object} args
 * @param {object[]} args.candidates   from deriveCandidates
 * @param {object[]} args.unmatched    components with no table row
 * @param {object|null} args.reply     the model's reply, or null when the model failed
 * @param {object} args.def            the Item Definition
 * @returns {{assets: object[], notes: object[]}}
 */
function applyReply({ candidates, unmatched, reply, def, rules = loadRules() }) {
  const notes = [];
  const rows = new Map(((reply && reply.assets) || []).map((r) => [r.id, r]));
  const covered = coveredCategories(candidates);
  const assets = [];

  for (const c of candidates) {
    const row = rows.get(c.assetId) || {};
    const name = plain(row.name, 3) && row.name.trim().length <= 80 ? clean(row.name) : c.name;
    const asset = {
      candidate: c,
      assetId: c.assetId,
      name,
      description: plain(row.description, 20) ? clean(row.description) : (c.description || `${c.noun.charAt(0).toUpperCase()}${c.noun.slice(1)} of ${name}.`),
      wouldChange: plain(row.would_change, 10) ? clean(row.would_change) : 'A document or an answer from the client that says otherwise.',
      properties: blankProperties({ ...c, name }),
      removed: false,
    };
    for (const p of PROPERTIES) {
      const reason = row.reasons && row.reasons[p];
      if (plain(reason, 10)) asset.properties[p].reason = clean(reason);
    }

    for (const change of row.changes || []) {
      const p = change.property;
      if (!PROPERTIES.includes(p) || typeof change.applies !== 'boolean' || !plain(change.reason, 10)) {
        notes.push({ kind: 'rejected', asset, property: p, why: 'the proposal had no usable reason' });
        continue;
      }
      let target = p;
      let applies = change.applies;
      let moved = false;
      if (p === 'C' && applies && MISSING_CHECK.test(change.reason)) { target = 'Az'; moved = true; }
      if (target === 'C' && applies && c.prefix === 'WL' && !uncoveredData(c, def, covered)) {
        notes.push({ kind: 'rejected', asset, property: 'C', why: 'a workload keeps no data of its own that another row does not cover' });
        continue;
      }
      if (asset.properties[target].applies === applies) continue;
      asset.properties[target] = { applies, reason: clean(change.reason), origin: 'model', reviewed: false };
      notes.push({ kind: moved ? 'moved' : 'changed', asset, property: target, applies });
    }
    assets.push(asset);
  }

  // Rows whose every consequence another row owns.
  const byId = new Map(assets.map((a) => [a.assetId, a]));
  for (const a of assets) {
    const row = rows.get(a.assetId) || {};
    const target = byId.get(row.duplicate_of);
    if (row.duplicate_of && target && target !== a && !target.removed) {
      a.removed = true;
      notes.push({ kind: 'removed', asset: a, because: target });
    }
  }

  // Assets for components that have no table row: the model proposes, the analyst looks.
  const counter = {};
  for (const a of assets) counter[a.candidate.prefix] = Math.max(counter[a.candidate.prefix] || 0, Number(a.assetId.split('-')[1]));
  const knownUnmatched = new Map(unmatched.map((u) => [u.id, u]));
  const added = new Set();
  for (const add of (reply && reply.additions) || []) {
    const u = knownUnmatched.get(add.source_id);
    const props = add.properties || [];
    const usable = u && PREFIXES.has(add.prefix) && !added.has(add.source_id) && plain(add.name, 3) && plain(add.description, 20) && plain(add.reason, 10)
      && PROPERTIES.every((p) => props.some((x) => x.property === p && typeof x.applies === 'boolean' && plain(x.reason, 10)))
      && props.some((x) => x.applies);
    if (!usable) {
      notes.push({ kind: 'rejected-addition', sourceId: add.source_id, why: 'it was missing a reason, a property or a known component' });
      continue;
    }
    added.add(add.source_id);
    counter[add.prefix] = (counter[add.prefix] || 0) + 1;
    const element = (def.elements || []).find((e) => e.element_id === add.source_id);
    const candidate = {
      prefix: add.prefix, name: clean(add.name), kind: 'element', sourceIds: [add.source_id], sourceLabel: `${add.source_id} ${u.name}`, scope: 'in_scope',
      interface: false, factIds: (element && element.fact_ids) || [], hasRow: false, defaults: [], mayAdd: [], categories: [], typeKey: u.type, noun: 'asset',
      typeLabel: typeLabel(rules, add.prefix, u.type), assetId: `${add.prefix}-${String(counter[add.prefix]).padStart(2, '0')}`,
    };
    const asset = {
      candidate, assetId: candidate.assetId, name: candidate.name, description: clean(add.description),
      wouldChange: plain(add.would_change, 10) ? clean(add.would_change) : 'A document or an answer from the client that says otherwise.',
      properties: {}, removed: false, why: clean(add.reason),
    };
    for (const p of PROPERTIES) {
      const x = props.find((y) => y.property === p);
      asset.properties[p] = { applies: x.applies, reason: clean(x.reason), origin: 'model', reviewed: false };
    }
    assets.push(asset);
    notes.push({ kind: 'added', asset });
  }

  // Every kept asset needs at least one property that applies.
  for (const a of assets) {
    if (!a.removed && !PROPERTIES.some((p) => a.properties[p].applies)) {
      a.removed = true;
      notes.push({ kind: 'dropped', asset: a });
    }
  }
  if (!reply) notes.push({ kind: 'model-failed' });
  return { assets: assets.filter((a) => !a.removed), notes };
}

/** The asset in the shape of the schema `stage-03-assets.schema.json`. */
function toRecord(asset, rules) {
  const c = asset.candidate;
  const order = rules.families.map((f) => f.prefix);
  return {
    asset_id: asset.assetId,
    family: c.prefix,
    name: asset.name,
    type_label: c.typeLabel,
    description: asset.description,
    source: { kind: c.kind, ids: c.sourceIds, label: c.sourceLabel, scope: c.scope },
    interface: Boolean(c.interface),
    would_change: asset.wouldChange,
    fact_ids: c.factIds,
    asset_type_row: c.hasRow,
    properties: Object.fromEntries(PROPERTIES.map((p) => [p, asset.properties[p]])),
    _order: [order.includes(c.prefix) ? order.indexOf(c.prefix) : order.length, Number(asset.assetId.split('-')[1])],
  };
}

module.exports = { applyReply, toRecord, templateReason, PROPERTY_NAMES };
