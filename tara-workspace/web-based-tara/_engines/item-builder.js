'use strict';

/**
 * Turns the model's proposed Item Definition into checked items with ids (spec 21, D-45).
 * The model refers to things by name and cites Stage 01 facts; code assigns ids, drops
 * anything it cannot trace to a usable fact, and applies the fixed rules: the zone
 * decides the parent (D-27), actors carry no provider, hosting or exposure (D-34),
 * exposure needs evidence and an open exposure disagreement means exposed (D-33),
 * each network gets its boundary configuration element, and trust-boundary crossings
 * come from the zones.
 */

const { EXTERNAL_ZONES } = require('./scope-rules');

const ACTOR_KINDS = new Set(['human_actor', 'system_to_system_client']);
const pad = (n, w) => String(n).padStart(w, '0');
const key = (name) => String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();

function cleanData(items) {
  return (items || []).map((d) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== null && v !== '')));
}

/**
 * @param {object} p
 * @param {object} p.reply        the build call's reply
 * @param {Array}  p.facts        Stage 01 facts that are not rejected
 * @param {Array}  p.rejectedIds  ids of rejected Stage 01 facts
 * @param {Array}  p.conflicts    Stage 01 conflicts
 * @param {string|null} p.boundary analyst's boundary statement
 * @param {boolean} p.diagramGiven
 * @returns {{itemDef, readings, answeredTopics, notes, newKinds, names}}
 */
function buildItem({ reply, facts, rejectedIds = [], conflicts = [], boundary, diagramGiven }) {
  const usable = new Map(facts.map((f) => [f.fact_id, f]));
  const rejected = new Set(rejectedIds);
  const notes = [];
  const log = [];
  const newKinds = [];

  const checkFacts = (ids, what) => {
    const ok = [];
    for (const id of new Set(ids || [])) {
      if (usable.has(id)) ok.push(id);
      else log.push({ what, fact_id: id, reason: rejected.has(id) ? 'refers to a rejected fact' : 'fact does not exist' });
    }
    return ok;
  };

  // Zones
  const zones = [];
  const zoneByName = new Map();
  for (const z of reply.zones || []) {
    const fact_ids = checkFacts(z.fact_ids, `zone ${z.name}`);
    if (!fact_ids.length || zoneByName.has(key(z.name))) {
      log.push({ dropped: 'zone', name: z.name, reason: fact_ids.length ? 'repeated name' : 'no usable fact' });
      continue;
    }
    const zone = { zone_id: `ZN-${pad(zones.length + 1, 2)}`, kind: z.kind, name: z.name, fact_ids };
    zones.push(zone);
    zoneByName.set(key(z.name), zone);
  }

  // Containers, parents resolved after all are known
  const containers = [];
  const containerByName = new Map();
  const containerReadings = new Map();
  for (const c of reply.containers || []) {
    const fact_ids = checkFacts(c.fact_ids, `container ${c.name}`);
    if (!fact_ids.length || containerByName.has(key(c.name))) {
      log.push({ dropped: 'container', name: c.name, reason: fact_ids.length ? 'repeated name' : 'no usable fact' });
      continue;
    }
    const container = { container_id: `CTR-${pad(containers.length + 1, 2)}`, kind: c.kind, name: c.name, fact_ids };
    const zone = c.zone && zoneByName.get(key(c.zone));
    if (zone) container.zone_id = zone.zone_id;
    containers.push(container);
    containerByName.set(key(c.name), { container, parentName: c.parent });
    containerReadings.set(container.container_id, c.readings || {});
  }
  for (const { container, parentName } of containerByName.values()) {
    const parent = parentName && containerByName.get(key(parentName));
    if (parent && parent.container !== container) container.parent_id = parent.container.container_id;
  }
  const accountLevel = containers.find((c) => c.kind === 'account_level_managed_services');
  const firstAccount = containers.find((c) => c.kind === 'cloud_account');

  // Open exposure disagreements from Stage 01 (D-33): their facts make an element exposed.
  const exposureConflicts = conflicts.filter((c) => c.kind === 'internet_exposure' && !c.auto_resolved);

  // Elements
  const elements = [];
  const elementByName = new Map();
  const readings = new Map();
  const answeredTopics = new Map();
  const forcedExposure = [];
  for (const e of reply.elements || []) {
    const fact_ids = checkFacts(e.fact_ids, `element ${e.name}`);
    if (!fact_ids.length) {
      log.push({ dropped: 'element', name: e.name, reason: 'no usable fact: components not in the facts become questions, never elements' });
      continue;
    }
    if (elementByName.has(key(e.name))) {
      log.push({ dropped: 'element', name: e.name, reason: 'repeated name' });
      continue;
    }
    const zone = zoneByName.get(key(e.zone));
    if (!zone) {
      log.push({ dropped: 'element', name: e.name, reason: `zone "${e.zone}" was not built` });
      notes.push({ kind: 'ambiguity', touches: 'existence', title: `"${e.name}" could not be placed`, text: `"${e.name}" is described in the documents, but the network area it sits in is not shown, so it is not listed.`, fact_ids, affects: [] });
      continue;
    }
    const element = { element_id: `EL-${pad(elements.length + 1, 3)}`, name: e.name, asset_type: e.asset_type };
    if (e.asset_type === 'unknown_kind') {
      element.asset_type_label = e.asset_type_label || e.name;
      newKinds.push({ element_id: element.element_id, name: e.name, label: element.asset_type_label });
    }
    const external = EXTERNAL_ZONES.has(zone.kind);
    const named = e.container && containerByName.get(key(e.container));
    if (!external) {
      const parent = named ? named.container : (accountLevel || firstAccount);
      if (!parent) {
        log.push({ dropped: 'element', name: e.name, reason: 'inside the item but no container was built' });
        continue;
      }
      if (!named) notes.push({ kind: 'ambiguity', touches: 'scope', title: `Where "${e.name}" sits is not stated`, text: `The documents do not say which network or service area holds "${e.name}". It is placed in "${parent.name}".`, fact_ids, affects: [element.element_id] });
      element.parent_container_id = parent.container_id;
    }
    element.zone_id = zone.zone_id;
    if (!ACTOR_KINDS.has(e.asset_type)) {
      element.provider = e.provider || 'unknown';
      element.hosting_type = e.hosting_type || 'unknown';
      let evidence = checkFacts(e.exposure_fact_ids, `exposure of ${e.name}`);
      let value = e.internet_exposed;
      const disputed = exposureConflicts.filter((c) => c.fact_ids.some((id) => fact_ids.includes(id) || evidence.includes(id)));
      if (disputed.length) {
        value = 'yes';
        evidence = [...new Set([...evidence, ...disputed.flatMap((c) => c.fact_ids).filter((id) => fact_ids.includes(id) || evidence.includes(id))])];
        forcedExposure.push({ element, conflicts: disputed });
      }
      if (value === 'yes' && !evidence.length) value = 'unknown';
      if (value === 'unknown' && /\binternal\b/i.test(e.name)) value = 'no';
      element.internet_exposed = { value, evidence_fact_ids: value === 'unknown' ? [] : evidence };
    }
    element.is_entry_point = Boolean(e.is_entry_point);
    const exposed = element.internet_exposed && element.internet_exposed.value === 'yes';
    if (e.auth_method) element.auth_method = e.auth_method;
    else if (element.is_entry_point || exposed) {
      element.auth_method = 'unknown';
      notes.push({ kind: 'ambiguity', touches: 'authentication', title: `How callers of "${e.name}" sign in is not stated`, text: `"${e.name}" can be reached from outside, but the documents do not say how callers are authenticated.`, fact_ids, affects: [element.element_id] });
    }
    element.owner_operator = e.owner_operator || 'unknown';
    const data = cleanData(e.data_handled);
    if (data.length) element.data_handled = data;
    if ((e.stated_security_config || []).length) element.stated_security_config = e.stated_security_config;
    element.fact_ids = fact_ids;
    element.confidence = e.confidence;
    elements.push(element);
    elementByName.set(key(e.name), element);
    readings.set(element.element_id, { ...(e.readings || {}), reachable: (e.readings && e.readings.reachable !== 'unknown') ? e.readings.reachable : (element.internet_exposed && element.internet_exposed.value !== 'unknown' ? element.internet_exposed.value : 'unknown') });
    answeredTopics.set(element.element_id, e.answered_topics || []);
  }

  // One network boundary configuration element per network (DR-13)
  for (const vpc of containers.filter((c) => c.kind === 'vpc')) {
    const hasOne = elements.some((e) => e.asset_type === 'network_boundary_configuration' && e.parent_container_id === vpc.container_id);
    if (hasOne) continue;
    const childZone = containers.filter((c) => c.parent_id === vpc.container_id && c.zone_id).map((c) => zones.find((z) => z.zone_id === c.zone_id)).find((z) => z && !EXTERNAL_ZONES.has(z.kind))
      || zones.find((z) => !EXTERNAL_ZONES.has(z.kind));
    if (!childZone) continue;
    const element = {
      element_id: `EL-${pad(elements.length + 1, 3)}`,
      name: `${vpc.name} boundary configuration`,
      asset_type: 'network_boundary_configuration',
      parent_container_id: vpc.container_id,
      zone_id: childZone.zone_id,
      provider: 'unknown',
      hosting_type: 'managed',
      internet_exposed: { value: 'no', evidence_fact_ids: [] },
      is_entry_point: false,
      owner_operator: 'unknown',
      fact_ids: vpc.fact_ids,
      confidence: 'medium',
    };
    elements.push(element);
    elementByName.set(key(element.name), element);
    readings.set(element.element_id, {});
    answeredTopics.set(element.element_id, []);
    notes.push({ kind: 'assumption', touches: 'scope', title: `"${vpc.name}" has its own boundary configuration`, text: `Every network has security groups, access lists and routes. They are listed as one component for "${vpc.name}".`, fact_ids: vpc.fact_ids, affects: [element.element_id] });
  }

  // Links
  const links = [];
  const zoneOf = (el) => el.zone_id;
  for (const l of reply.links || []) {
    const source = elementByName.get(key(l.source));
    const destination = elementByName.get(key(l.destination));
    const fact_ids = checkFacts(l.fact_ids, `link ${l.source} -> ${l.destination}`);
    if (!source || !destination) {
      const missing = !source ? l.source : l.destination;
      log.push({ dropped: 'link', from: l.source, to: l.destination, reason: `"${missing}" is not a built element` });
      if (fact_ids.length) notes.push({ kind: 'ambiguity', touches: 'existence', title: `A connection to "${missing}" is not listed`, text: `The documents describe a connection from "${l.source}" to "${l.destination}", but "${missing}" is not a listed component, so the connection is left out.`, fact_ids, affects: [(source || destination || {}).element_id].filter(Boolean) });
      continue;
    }
    if (!fact_ids.length) {
      log.push({ dropped: 'link', from: l.source, to: l.destination, reason: 'no usable fact' });
      continue;
    }
    const link = {
      link_id: `IF-${pad(links.length + 1, 2)}`,
      type: l.type,
      source_id: source.element_id,
      destination_id: destination.element_id,
      direction: l.direction,
      protocol: l.protocol,
    };
    if (l.port) link.port = l.port;
    Object.assign(link, {
      usage_at_destination: l.usage_at_destination || 'unknown',
      authentication: l.authentication || 'unknown',
      encryption: l.encryption || 'unknown',
      data_carried: cleanData(l.data_carried),
      crosses_trust_boundary: zoneOf(source) !== zoneOf(destination),
      remark: l.remark || '',
    });
    if (l.sync_async) link.sync_async = l.sync_async;
    link.inferred_from_text = diagramGiven ? Boolean(l.inferred_from_text) : true;
    link.fact_ids = fact_ids;
    link.confidence = l.confidence;
    link.source_name = source.name;
    link.destination_name = destination.name;
    links.push(link);
  }

  // Functions
  const functions = [];
  for (const f of reply.functions || []) {
    const fact_ids = checkFacts(f.fact_ids, `function ${f.name}`);
    const ids = (names) => names.map((n) => elementByName.get(key(n))).filter(Boolean).map((e) => e.element_id);
    const element_ids = [...new Set(ids(f.elements || []))];
    if (!fact_ids.length || !element_ids.length) {
      log.push({ dropped: 'function', name: f.name, reason: fact_ids.length ? 'names no built element' : 'no usable fact' });
      continue;
    }
    const fn = { function_id: `FN-${pad(functions.length + 1, 3)}`, name: f.name, description: f.description, actor_ids: [...new Set(ids(f.actors || []))], element_ids };
    if ((f.endpoints || []).length) fn.endpoints = f.endpoints;
    const read = cleanData(f.data_read);
    const written = cleanData(f.data_written);
    if (read.length) fn.data_read = read;
    if (written.length) fn.data_written = written;
    fn.privileged = Boolean(f.privileged);
    fn.fact_ids = fact_ids;
    functions.push(fn);
  }

  // Assumptions, plus one for every exposure forced by an open disagreement
  const assumptions = [];
  for (const a of reply.assumptions || []) {
    const based_on = checkFacts(a.fact_ids, 'assumption');
    if (!based_on.length) {
      log.push({ dropped: 'assumption', text: a.text, reason: 'no usable fact' });
      continue;
    }
    assumptions.push({ assumption_id: `ASM-${pad(assumptions.length + 1, 2)}`, text: a.text, based_on });
  }
  for (const { element, conflicts: disputed } of forcedExposure) {
    const ids = [...new Set(disputed.flatMap((c) => c.fact_ids))].filter((id) => usable.has(id));
    if (assumptions.some((a) => ids.every((id) => a.based_on.includes(id)))) continue;
    assumptions.push({
      assumption_id: `ASM-${pad(assumptions.length + 1, 2)}`,
      text: `"${element.name}" is treated as reachable from the internet, an entry point of its own, until the client confirms otherwise.`,
      based_on: ids,
    });
  }

  const responsibility_split = (reply.responsibility_split || [])
    .map((r) => ({ element: elementByName.get(key(r.element)), r }))
    .filter(({ element }) => element)
    .map(({ element, r }) => ({ element_id: element.element_id, provider_side: r.provider_side, customer_side: r.customer_side }));

  const byType = (type) => facts.filter((f) => f.fact_type === type).map((f) => f.fact_id);
  const stated_control_fact_ids = [...new Set([...checkFacts(reply.stated_control_fact_ids, 'stated controls'), ...byType('control_stated')])];
  const stated_absence_fact_ids = [...new Set([...checkFacts(reply.stated_absence_fact_ids, 'stated absences'), ...byType('absence_stated')])];

  const boundaryText = boundary && boundary.trim();
  const proposed = !boundaryText;
  const itemDef = {
    item_name: reply.item_name,
    boundary_statement: { text: boundaryText || reply.boundary_proposal || `${reply.item_name} and everything deployed for it.`, proposed },
    containers,
    zones,
    elements,
    links,
    functions,
    scope_decisions: [],
    assumptions,
    responsibility_split,
    stated_control_fact_ids,
    stated_absence_fact_ids,
    stakeholders: reply.stakeholders || [],
  };
  return { itemDef, readings, containerReadings, answeredTopics, notes, newKinds, log };
}

/** Removes helper fields that are not part of the stored format. */
function stripHelpers(itemDef) {
  return { ...itemDef, links: itemDef.links.map(({ source_name, destination_name, ...link }) => link) };
}

module.exports = { buildItem, stripHelpers, ACTOR_KINDS };
