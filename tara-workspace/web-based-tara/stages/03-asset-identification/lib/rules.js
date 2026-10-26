'use strict';

/**
 * The hard rules of Stage 03 (CONTEXT.md), enforced by code after the model has proposed
 * the assets. The model proposes; code decides what stays.
 */

const PROPERTIES = ['confidentiality', 'integrity', 'availability', 'authenticity', 'authorization', 'non_repudiation'];
const ASSET_TYPES = ['communication_path', 'data_store', 'ecu', 'function', 'auth_credential', 'api_endpoint', 'cloud_service'];
// An interface element yields only the item's side: the link and the credentials the item holds.
const INTERFACE_TYPES = new Set(['communication_path', 'auth_credential']);

function scopeOf(def, scopeDecisions) {
  const decisions = scopeDecisions || def.scope_decisions || [];
  return new Map(decisions.map((d) => [d.element_id, d.status]));
}

/** Everything a model-written source id can legitimately point at. */
function sourceIndex(def) {
  const index = new Map();
  for (const e of def.elements || []) index.set(e.element_id, { kind: 'element', item: e });
  for (const l of def.links || []) index.set(l.link_id, { kind: 'link', item: l });
  for (const f of def.functions || []) index.set(f.function_id, { kind: 'function', item: f });
  return index;
}

/**
 * @returns {{kept: object[], dropped: {source_id: string, title: string, why: string}[]}}
 */
function enforce(def, reply, scopeDecisions) {
  const scope = scopeOf(def, scopeDecisions);
  const index = sourceIndex(def);
  const containers = new Set((def.containers || []).map((c) => c.container_id));
  const kept = [];
  const dropped = [];
  const seen = new Set();
  const drop = (row, why) => dropped.push({ source_id: row.source_id, title: row.title, why });

  for (const row of (reply && reply.assets) || []) {
    const src = index.get(row.source_id);
    if (containers.has(row.source_id)) { drop(row, 'a container is never an asset'); continue; }
    if (!src) { drop(row, 'its source does not exist in the Item Definition'); continue; }
    if (!ASSET_TYPES.includes(row.asset_type)) { drop(row, 'unknown asset type'); continue; }
    if (!PROPERTIES.some((p) => row.ciaaan && row.ciaaan[p] && row.ciaaan[p].applies === true)) { drop(row, 'no property applies'); continue; }

    if (src.kind === 'element') {
      const status = scope.get(row.source_id) || 'in_scope';
      if (status === 'out_of_scope') { drop(row, 'the component is outside the assessment'); continue; }
      if (status === 'interface' && !INTERFACE_TYPES.has(row.asset_type)) { drop(row, 'only the item\'s side of an interface is assessed'); continue; }
    } else if (src.kind === 'link') {
      const ends = [src.item.source_id, src.item.destination_id].map((id) => scope.get(id) || 'in_scope');
      if (!ends.includes('in_scope') && !ends.includes('ambiguous')) { drop(row, 'neither end of the connection is inside the assessment'); continue; }
    }
    const key = `${row.source_id}|${row.asset_type}|${String(row.title).toLowerCase().trim()}`;
    if (seen.has(key)) { drop(row, 'duplicate of another asset'); continue; }
    seen.add(key);
    kept.push(row);
  }
  return { kept, dropped };
}

/** Builds the register rows (Stage 03 shape, same as the upload import) from kept model rows. */
function toRegister(kept, { timestamp = new Date().toISOString() } = {}) {
  return kept.map((row, i) => {
    const ciaaan = {};
    const reasons = {};
    for (const p of PROPERTIES) {
      ciaaan[p] = row.ciaaan[p].applies === true;
      reasons[p] = row.ciaaan[p].reason;
    }
    return {
      asset_id: `AS_${String(i + 1).padStart(2, '0')}`,
      asset_title: row.title,
      asset_type: row.asset_type,
      asset_description: row.description,
      ciaaan,
      input_mode: 'diagram',
      created_timestamp: timestamp,
      source_element_id: row.source_id,
      reason: row.reason,
      ciaaan_reasons: reasons,
    };
  });
}

module.exports = { enforce, toRegister, scopeOf, PROPERTIES, ASSET_TYPES };
