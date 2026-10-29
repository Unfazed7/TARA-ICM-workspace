'use strict';

// A fake model for the Stage 03 tests: answers the one call from the candidates in the prompt.
// It makes the changes the checks have to deal with: a missing-check reason (moves C to Az), a property
// turned off, a Confidentiality proposal on a workload that holds data no store covers, a duplicate, and an
// asset for a component with no table row.

const PROPS = ['C', 'I', 'A', 'Au', 'Az', 'NR'];

function candidatesIn(userText) {
  return userText.split('\n').filter((l) => l.startsWith('{"id":')).map((l) => JSON.parse(l));
}

function unmatchedIn(userText) {
  return userText.split('\n').filter((l) => l.startsWith('{"source_id":')).map((l) => JSON.parse(l));
}

function replyFor(userText) {
  const assets = candidatesIn(userText).map((c) => {
    const row = {
      id: c.id,
      name: c.name.replace(/ identity$/, ' identity'),
      description: `${c.name} as the item definition describes it, kept for the item's own use.`,
      reason: `${c.name} is part of the item and worth protecting.`,
      would_change: 'A document that says this component is handled differently.',
      reasons: Object.fromEntries(PROPS.map((p) => [p, c.starts_with.includes(p) ? `${c.name} needs this property protected.` : `${c.name} does not need this property protected on its own.`])),
      changes: [],
      duplicate_of: '',
    };
    if (c.from.startsWith('EL-015')) row.changes.push({ property: 'C', applies: true, reason: 'The service has no entitlement check, so anyone could read the requests it handles.' });
    if (c.from.startsWith('EL-016')) row.changes.push({ property: 'C', applies: true, reason: 'It handles certificates to sign for a while.' });
    if (c.from.startsWith('EL-023')) row.changes.push({ property: 'C', applies: true, reason: 'Application logs may contain request details that only staff should read.' });
    if (c.from.startsWith('EL-017')) row.changes.push({ property: 'Au', applies: false, reason: 'Nothing relies on proving where the cached data came from.' });
    if (c.from.startsWith('EL-026')) row.duplicate_of = 'NET-01';
    return row;
  });
  const additions = unmatchedIn(userText).filter((u) => u.source_id === 'EL-005').map((u) => ({
    source_id: u.source_id, prefix: 'INF', name: 'CDN delivery settings', description: 'How the CDN serves the portal pages and the revocation list to users.',
    would_change: 'A document showing the CDN serves nothing of the portal.', reason: 'Both the pages and the revocation list reach users through it.',
    properties: PROPS.map((p) => ({ property: p, applies: p === 'I' || p === 'A', reason: p === 'I' || p === 'A' ? 'A changed or missing delivery would reach every user.' : 'It plays no part in this on its own.' })),
  }));
  return { assets, additions };
}

function fakeFetch(captured = {}) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    captured.body = body;
    const user = body.messages.find((m) => m.role === 'user').content;
    return { ok: true, json: async () => ({ id: 'fake', model: 'fake/model', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(replyFor(user)) } }], usage: {} }) };
  };
}

module.exports = { replyFor, fakeFetch, candidatesIn };
