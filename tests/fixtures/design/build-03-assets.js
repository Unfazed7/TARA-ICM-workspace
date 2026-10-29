'use strict';
// Builds tests/fixtures/design/03-assets.json from the sample data inside the design
// (.meta/design/03-assets/Main.dc.html): the 22 assets, the 3 Assumptions, the thread on DS-02 Confidentiality
// and the proposed change of Comments.dc.html. Run: node tests/fixtures/design/build-03-assets.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const html = fs.readFileSync(path.join(ROOT, '.meta', 'design', '03-assets', 'Main.dc.html'), 'utf8');
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(`class DCLogic { constructor(props) { this.props = props || {}; } setState() {} }\n${script}\nthis.Component = Component;`, sandbox);
const design = new sandbox.Component({});

// REASON and FLIP live inside renderVals() in the design; read their source and evaluate it.
const grab = (name) => vm.runInNewContext(`(${script.match(new RegExp(`var ${name} = (\\{[\\s\\S]*?\\n    \\});`))[1]})`);
const REASON = grab('REASON');
const FLIP = grab('FLIP');

const E = path.join(ROOT, 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const def = JSON.parse(fs.readFileSync(path.join(E, 'item-definition.json'), 'utf8'));
const factsOf = (id) => ((def.elements.find((e) => e.element_id === id) || def.functions.find((f) => f.function_id === id) || def.links.find((l) => l.link_id === id) || {}).fact_ids || []);

function source(from) {
  if (/^Function inventory: (\w+)/.test(from)) {
    const id = { issue: 'FN-004', revoke: 'FN-006' }[RegExp.$1];
    const f = def.functions.find((x) => x.function_id === id);
    return { kind: 'function', ids: [id], label: `${id} ${f.name}` };
  }
  if (/^IF-/.test(from)) return { kind: 'link', ids: from.split(/,\s*/), label: from };
  return { kind: 'element', ids: [...from.matchAll(/EL-\d+/g)].map((m) => m[0]), label: from };
}

const assets = design.ASSETS.map((a) => {
  const src = source(a.from);
  const properties = {};
  for (const p of design.PROPS) {
    const applies = a.applies.includes(p.k);
    properties[p.k] = { applies, reason: REASON[p.k][applies ? 0 : 1](a), origin: 'default', reviewed: true };
  }
  return {
    asset_id: a.id, family: a.fam, name: a.name, type_label: a.type, description: a.desc,
    source: { ...src, scope: a.scope === 'interface' ? 'interface' : 'in_scope' },
    interface: a.iface, reason: a.why, would_change: 'A document that says this component is handled differently.',
    fact_ids: [...new Set(src.ids.flatMap(factsOf))], asset_type_row: true, properties,
  };
});

const rationale = design.ASSUMPTIONS.map((x, i) => ({
  rationale_id: `RAT-9000${i + 1}`, stage: '03', kind: 'assumption', topic: 'assets', attention: 'needs_attention',
  title: x.text.replace(/\.$/, ''), concluded: x.text, why: { from_ids: [design.ASSETS.find((a) => a.id === x.about) && source(design.ASSETS.find((a) => a.id === x.about).from).ids[0]] },
  assumed: 'It is used until you decide.', would_change: 'A document or an answer from the client.', affects: [`${x.about}.${x.prop}`], review: { status: 'unreviewed' },
  design_id: x.id,
}));

const quotes = Object.fromEntries(design.ASSETS.filter((a) => a.quotes.length).map((a) => [a.id, a.quotes.map((q) => ({ text: q.q, where: q.w }))]));
const fixture = {
  note: 'Generated from the sample data of the 03 Assets design by build-03-assets.js. Quotes are given separately because the store takes them from Stage 01 facts.',
  assets, rationale, confirmed_design_ids: ['AS-03-03'], quotes,
  comments: [{ asset_id: 'DS-02', property: 'C', author: 'analyst', text: 'Ask the client what the cache holds before we confirm this.' }],
  change_proposed: [
    { asset_id: 'WL-01', property: 'C', author: 'analyst', text: 'Confidentiality should not apply here. The service passes requests on and keeps nothing itself.' },
    { asset_id: 'WL-01', property: 'C', author: 'assistant', text: 'Agreed. The certificate service stores nothing of its own; the requests it handles are covered by DS-01 Certificate records. Under the D-22 rule this cell should be off.', proposed_change: { property: 'C', applies: false, state: 'open' } },
  ],
};
fs.writeFileSync(path.join(__dirname, '03-assets.json'), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`${assets.length} assets, ${rationale.length} assumptions`);
