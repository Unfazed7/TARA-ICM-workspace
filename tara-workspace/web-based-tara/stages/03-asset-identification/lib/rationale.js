'use strict';

/**
 * Stage 03 Rationale (spec 26, step 5): what code or the model changed, added or removed, shown to the
 * analyst as Assumptions. Same item shape as Stage 02. `topic` is set by code. The pipeline never waits.
 */

const crypto = require('crypto');
const { PROPERTY_NAMES } = require('../../../_engines/asset-rules');

const clip = (text, n) => (text.length <= n ? text : `${text.slice(0, n - 3)}...`);

/** Source quotes from the asset's facts, when Stage 01's facts are at hand; else the ids it was worked out from. */
function whyOf(candidate, factsById) {
  const sources = [];
  const seen = new Set();
  for (const id of candidate.factIds || []) {
    for (const ref of (factsById.get(id) || { source_refs: [] }).source_refs) {
      const key = `${ref.doc_id}|${ref.location}|${ref.quote}`;
      if (!seen.has(key) && sources.length < 3) { seen.add(key); sources.push({ doc_id: ref.doc_id, location: ref.location, quote: ref.quote }); }
    }
  }
  return sources.length ? { sources } : { from_ids: candidate.sourceIds };
}

function writeRationale({ notes, factsById, anchorId }) {
  const items = [];
  const used = new Set();
  const add = (key, item) => {
    let n = 300000 + (parseInt(crypto.createHash('sha1').update(key).digest('hex').slice(0, 8), 16) % 99999);
    while (used.has(n)) n += 1;
    used.add(n);
    items.push({ rationale_id: `RAT-${n}`, stage: '03', topic: 'assets', review: { status: 'unreviewed' }, ...item });
  };

  for (const note of notes) {
    const a = note.asset;
    if (note.kind === 'changed' || note.kind === 'moved') {
      const word = PROPERTY_NAMES[note.property];
      const p = a.properties[note.property];
      add(`${a.assetId}.${note.property}.${note.kind}`, {
        kind: 'assumption',
        attention: 'needs_attention',
        title: clip(`${word} is proposed to ${p.applies ? 'apply' : 'not apply'} to "${a.name}"`, 160),
        concluded: p.reason,
        why: whyOf(a.candidate, factsById),
        assumed: note.kind === 'moved'
          ? `Because the reason is about a missing check on who may do what, it is recorded as Authorization instead of Confidentiality. It is used until you decide.`
          : `The proposal is used until you confirm it or change it.`,
        would_change: a.wouldChange,
        affects: [`${a.assetId}.${note.property}`],
      });
    } else if (note.kind === 'added') {
      add(`${a.assetId}.added`, {
        kind: 'gap',
        attention: 'needs_attention',
        title: clip(`"${a.name}" is proposed as an asset`, 160),
        concluded: a.why || a.description,
        why: whyOf(a.candidate, factsById),
        assumed: 'This kind of component has no row in the asset rules yet, so the asset and every property are proposed and used until you decide.',
        would_change: a.wouldChange,
        affects: [a.assetId],
      });
    } else if (note.kind === 'removed') {
      add(`${a.assetId}.removed`, {
        kind: 'assumption',
        attention: 'information',
        title: clip(`"${a.name}" is left out because "${note.because.name}" already covers it`, 160),
        concluded: `Everything that could go wrong with "${a.name}" is already covered by "${note.because.name}".`,
        why: whyOf(a.candidate, factsById),
        assumed: `Only "${note.because.name}" is kept as an asset.`,
        would_change: 'The analyst deciding that this should be an asset of its own.',
        affects: [a.candidate.sourceIds[0]],
      });
    } else if (note.kind === 'model-failed') {
      add('model-failed', {
        kind: 'gap',
        attention: 'needs_attention',
        title: 'The reasons were not written by the model',
        concluded: 'The model could not write the descriptions and reasons for this run. Every asset keeps its starting properties with a standard reason.',
        why: { from_ids: [anchorId] },
        assumed: 'The starting properties from the asset rules are used as they are.',
        would_change: 'Building the assets again.',
        affects: [anchorId],
      });
    }
  }
  return items;
}

module.exports = { writeRationale };
