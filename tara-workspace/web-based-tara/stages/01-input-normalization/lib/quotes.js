'use strict';

/**
 * Quote check (spec 19): a fact is kept only if its quote is really in the text the
 * model was given. Matching ignores case, spacing, Markdown emphasis and quote styles.
 * A quote with "..." must match each part, in order.
 */

function normalise(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function quoteFound(quote, text) {
  const haystack = normalise(text);
  const parts = String(quote || '').split(/\.\.\.|\u2026/).map(normalise).filter(Boolean);
  if (parts.length === 0) return false;
  let from = 0;
  for (const part of parts) {
    const at = haystack.indexOf(part, from);
    if (at < 0) return false;
    from = at + part.length;
  }
  return true;
}

module.exports = { normalise, quoteFound };
