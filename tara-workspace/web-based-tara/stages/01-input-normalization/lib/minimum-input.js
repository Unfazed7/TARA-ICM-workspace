'use strict';

/** Minimum input (DR-9, spec 19): checked before anything is read, and again after reading. */

const COMPONENT_TYPES = ['diagram', 'infra', 'config_export', 'existing_item_definition', 'asset_list'];
const BEHAVIOUR_TYPES = ['functional', 'api_spec', 'manual', 'srs', 'qa'];

function boundaryOk(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return words.length >= 6;
}

/**
 * @param {string|null} boundary  the boundary statement text
 * @param {Array<{doc_type: string, read_status?: string}>} documents
 * @returns {string[]} what is missing, in plain words (empty when the minimum is met)
 */
function missingInput(boundary, documents) {
  const usable = documents.filter((d) => d.read_status !== 'failed');
  const missing = [];
  if (!boundaryOk(boundary)) {
    missing.push('A boundary statement: at least the item name and one sentence on what it covers (boundary.txt).');
  }
  if (!usable.some((d) => COMPONENT_TYPES.includes(d.doc_type))) {
    missing.push('A document describing components: an architecture diagram, an infrastructure or sizing document, a cloud configuration export, an existing item definition or an asset list.');
  }
  if (!usable.some((d) => BEHAVIOUR_TYPES.includes(d.doc_type))) {
    missing.push('A document describing behaviour: a functional description, an API specification, a user manual, an SRS or written client answers.');
  }
  return missing;
}

module.exports = { missingInput, COMPONENT_TYPES, BEHAVIOUR_TYPES };
