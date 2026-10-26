'use strict';

/**
 * Stage 03 Rationale: one Assumption per asset (why it is an asset) and one per CIAAAN
 * property (why it applies or not). Written from the register by code; `topic` is set by
 * code (spec 23). Same item shape as Stage 02 (lib/rationale.js there). The pipeline never
 * waits for review.
 */

const { topicForText } = require('../../../_engines/topics');
const { PROPERTIES } = require('./rules');

const LABEL = {
  confidentiality: 'Confidentiality', integrity: 'Integrity', availability: 'Availability',
  authenticity: 'Authenticity', authorization: 'Authorization', non_repudiation: 'Non-repudiation',
};

const clip = (text, n) => (text.length <= n ? text : `${text.slice(0, n - 3)}...`);
const enough = (text, fallback) => (String(text || '').trim().length >= 5 ? String(text).trim() : fallback);

function writeRationale({ register, unsure }) {
  const items = [];
  const add = (item) => {
    items.push({ rationale_id: `RAT-${300 + items.length + 1}`, stage: '03', review: { status: 'unreviewed' }, ...item });
  };
  for (const asset of register) {
    const flagged = unsure.get(asset.asset_id) || new Set();
    const assetUnsure = flagged.has('asset');
    add({
      kind: assetUnsure ? 'ambiguity' : 'assumption',
      topic: topicForText(`${asset.asset_title} ${asset.asset_description}`, 'scope'),
      attention: assetUnsure ? 'needs_attention' : 'information',
      title: clip(`"${asset.asset_title}" is treated as an asset`, 160),
      concluded: enough(asset.reason, `"${asset.asset_title}" is worth protecting.`),
      why: { from_ids: [asset.source_element_id] },
      assumed: 'It is kept as an asset in this register until the analyst says otherwise.',
      would_change: 'The analyst telling us this is not worth protecting, or is part of another asset.',
      affects: [asset.source_element_id],
    });
    for (const p of PROPERTIES) {
      const applies = asset.ciaaan[p];
      const propUnsure = flagged.has(p);
      add({
        kind: propUnsure ? 'ambiguity' : 'assumption',
        topic: topicForText(asset.ciaaan_reasons[p], 'data'),
        attention: propUnsure ? 'needs_attention' : 'information',
        title: clip(`${LABEL[p]} ${applies ? 'applies to' : 'does not apply to'} "${asset.asset_title}"`, 160),
        concluded: enough(asset.ciaaan_reasons[p], `${LABEL[p]} ${applies ? 'applies' : 'does not apply'}.`),
        why: { from_ids: [asset.source_element_id] },
        assumed: applies ? `${LABEL[p]} is protected for this asset.` : `${LABEL[p]} is not protected separately for this asset.`,
        would_change: 'More detail about this component in the Item Definition, or the analyst deciding otherwise.',
        affects: [asset.source_element_id],
      });
    }
  }
  return items;
}

module.exports = { writeRationale };
