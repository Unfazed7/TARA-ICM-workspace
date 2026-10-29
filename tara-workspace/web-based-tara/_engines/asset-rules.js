'use strict';

/**
 * Reads `_config/asset-rules.md` (spec 26, D-56) the way `scope-rules.js` reads `scoping-facts.md`:
 * on every run, so the analyst can refine the tables without a code change. Windows line endings are accepted.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', '_config', 'asset-rules.md');
const PROPERTIES = ['C', 'I', 'A', 'Au', 'Az', 'NR'];
const PROPERTY_NAMES = {
  C: 'Confidentiality', I: 'Integrity', A: 'Availability', Au: 'Authenticity', Az: 'Authorization', NR: 'Non-repudiation',
};

const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const ticks = (text) => (text.match(/`([^`]+)`/g) || []).map((s) => s.replace(/`/g, ''));

/** The rows of the first table that follows a heading starting with `heading`. */
function tableAfter(text, heading) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith(heading));
  if (at < 0) return [];
  const rows = [];
  let seen = false;
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith('## ')) break;
    if (!line.trim().startsWith('|')) {
      if (seen && rows.length) break;
      continue;
    }
    seen = true;
    const row = cells(line);
    if (/^-+$/.test(row[0].replace(/\s/g, '')) || row[0] === '') continue;
    rows.push(row);
  }
  return rows.slice(1); // drops the header row
}

/** "C, I" -> ['C', 'I'] (checked against the known codes). */
function codes(text) {
  return text.split(',').map((s) => s.trim()).filter(Boolean).map((c) => {
    if (!PROPERTIES.includes(c)) throw new Error(`asset-rules.md: unknown property "${c}"`);
    return c;
  });
}

/** "C if a, b; NR if c" -> [{properties: ['C'], when: ['a','b']}, ...]. */
function ifRules(text) {
  if (!text) return [];
  return text.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const m = /^(.+?)\s+if\s+(.+)$/.exec(part);
    if (!m) throw new Error(`asset-rules.md: cannot read the rule "${part}"`);
    return { properties: codes(m[1]), when: m[2].split(',').map((s) => s.trim()).filter(Boolean) };
  });
}

function parse(text) {
  const components = new Map();
  for (const [type, prefix, noun, def, ifData, mayAdd] of tableAfter(text, '## 2.')) {
    components.set(ticks(type)[0], { prefix, noun, defaults: codes(def || ''), ifData: ifRules(ifData || ''), mayAdd: codes(mayAdd || '') });
  }
  const sources = new Map();
  for (const [source, prefix, noun, def, ifRule, mayAdd] of tableAfter(text, '## 3.')) {
    const key = /^function/i.test(source) ? 'function' : /^credential/i.test(source) ? 'credential' : /^key or cert/i.test(source) ? 'key' : /^connection/i.test(source) ? 'link' : source;
    sources.set(key, { prefix, noun, defaults: codes(def || ''), ifRules: ifRules(ifRule || ''), mayAdd: codes(mayAdd || '') });
  }
  const noRowLine = text.split(/\r?\n/).find((l) => l.startsWith('No row yet:')) || '';
  const sensitiveLine = text.split(/\r?\n/).find((l) => l.startsWith('Sensitive data categories')) || '';
  const labels = tableAfter(text, '## 6.').map(([prefix, source, label]) => ({ prefix, sources: source.split(',').map((s) => s.trim()), label }));
  const registerTypes = new Map(tableAfter(text, '## 7.').map(([prefix, type]) => [prefix, type]));
  const families = tableAfter(text, '## 8.').map(([prefix, name]) => ({ prefix, name }));
  return {
    components,
    sources,
    noRow: new Set(ticks(noRowLine)),
    sensitive: new Set(ticks(sensitiveLine.replace(/^Sensitive data categories for connections:\s*/, ''))),
    labels,
    registerTypes,
    families,
  };
}

function loadRules(file = FILE) {
  return parse(fs.readFileSync(file, 'utf8'));
}

/** The label for an asset: the first row for its prefix whose source is `any` or matches `kind`. */
function typeLabel(rules, prefix, kind) {
  const hit = rules.labels.find((r) => r.prefix === prefix && (r.sources.includes(kind) || r.sources.includes('any')));
  return hit ? hit.label : 'Asset';
}

/** Default properties for a component, plus the "If data" ones that match the data categories it holds. */
function defaultProperties(row, categories) {
  const on = new Set(row.defaults);
  for (const rule of row.ifData || []) if (rule.when.some((c) => categories.has(c))) rule.properties.forEach((p) => on.add(p));
  return PROPERTIES.filter((p) => on.has(p));
}

module.exports = { loadRules, parse, typeLabel, defaultProperties, PROPERTIES, PROPERTY_NAMES };
