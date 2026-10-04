'use strict';

/** Minimum input (DR-9, spec 19): checked before anything is read, and again after reading. */

const COMPONENT_TYPES = ['diagram', 'infra', 'config_export', 'existing_item_definition', 'asset_list'];
const BEHAVIOUR_TYPES = ['functional', 'api_spec', 'manual', 'srs', 'qa'];

function boundaryOk(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return words.length >= 6;
}

/** The group a document counts towards: the one the analyst put it in, else the one its type implies (spec 23). */
function groupOf(doc, groups = {}) {
  const chosen = groups[doc.doc_id] || groups[doc.client_doc_ref];
  if (chosen === 'components' || chosen === 'behaviour') return chosen;
  if (COMPONENT_TYPES.includes(doc.doc_type)) return 'components';
  if (BEHAVIOUR_TYPES.includes(doc.doc_type)) return 'behaviour';
  return null;
}

/**
 * @param {string|null} boundary  the boundary statement text
 * @param {Array<{doc_id?: string, client_doc_ref?: string, doc_type: string, read_status?: string}>} documents
 * @param {Object<string, 'components'|'behaviour'>} [groups]  the group chosen at upload, by doc id or file name
 * @returns {string[]} what is missing, in plain words (empty when the minimum is met)
 */
function missingInput(boundary, documents, groups = {}) {
  const usable = documents.filter((d) => d.read_status !== 'failed');
  const missing = [];
  if (!boundaryOk(boundary)) {
    missing.push('A boundary statement: at least the item name and one sentence on what it covers (boundary.txt).');
  }
  if (!usable.some((d) => groupOf(d, groups) === 'components')) {
    missing.push('A document describing components: an architecture diagram, an infrastructure or sizing document, a cloud configuration export, an existing item definition or an asset list.');
  }
  if (!usable.some((d) => groupOf(d, groups) === 'behaviour')) {
    missing.push('A document describing behaviour: a functional description, an API specification, a user manual, an SRS or written client answers.');
  }
  return missing;
}

module.exports = { missingInput, groupOf, COMPONENT_TYPES, BEHAVIOUR_TYPES };
