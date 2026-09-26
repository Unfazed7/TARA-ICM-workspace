'use strict';

// Checks the synthetic reference items in tests/fixtures/synthetic/.
// Expected files are split for review; the tests join them where a schema needs one object.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOT, readJson, validateSchema } = require('./helpers/schema-validation');

const SYNTHETIC = path.join(ROOT, 'tests', 'fixtures', 'synthetic');
const EXTERNAL_ZONES = new Set(['internet_external', 'corporate_it', 'third_party_saas', 'vehicle_field_device']);
const QUESTION_CAP = 3;
const QUESTION_CAP_UNKNOWN_KIND = 7;

const schema = (name) => readJson(path.join(ROOT, 'src', 'schemas', name));

const items = fs.existsSync(SYNTHETIC)
  ? fs.readdirSync(SYNTHETIC).filter((name) => fs.existsSync(path.join(SYNTHETIC, name, 'expected')))
  : [];

for (const item of items) {
  const dir = path.join(SYNTHETIC, item);
  const expected = (name) => readJson(path.join(dir, 'expected', name));

  const register = expected('document-register.json');
  const facts = expected('facts.json');
  const conflicts = expected('conflicts.json');
  const scopeDecisions = expected('scope-decisions.json');
  const itemDefinition = { ...expected('item-definition.json'), scope_decisions: scopeDecisions };
  const questions = expected('questions.json');

  const check = (name, data, schemaFile) => {
    test(`${item}: ${name} validates against ${schemaFile}`, () => {
      const result = validateSchema(data, schema(schemaFile));
      assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
    });
  };

  check('document-register.json', register, 'stage-01-document-register.schema.json');
  check('facts.json + conflicts.json', { facts, conflicts }, 'stage-01-facts.schema.json');
  check('item-definition.json + scope-decisions.json', itemDefinition, 'stage-02-item-definition.schema.json');
  check('questions.json', questions, 'stage-02-questions.schema.json');

  test(`${item}: match-map.json is a stub`, () => {
    const matchMap = expected('match-map.json');
    assert.equal(matchMap.item, item);
    assert.deepEqual(matchMap.elements, {});
    assert.deepEqual(matchMap.links, {});
  });

  test(`${item}: register hashes match the input files`, () => {
    for (const doc of register) {
      const file = path.join(dir, 'inputs', doc.client_doc_ref);
      assert.ok(fs.existsSync(file), `${doc.doc_id}: missing input ${doc.client_doc_ref}`);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      assert.equal(doc.sha256, hash, `${doc.doc_id}: sha256 does not match ${doc.client_doc_ref}`);
    }
  });

  test(`${item}: every source and conflict points to something that exists`, () => {
    const docIds = new Set(register.map((doc) => doc.doc_id));
    const factIds = new Set(facts.map((fact) => fact.fact_id));
    for (const fact of facts) {
      for (const ref of fact.source_refs) {
        assert.ok(docIds.has(ref.doc_id), `${fact.fact_id}: unknown document ${ref.doc_id}`);
      }
    }
    for (const conflict of conflicts) {
      for (const id of [...conflict.fact_ids, ...conflict.loser_fact_ids]) {
        assert.ok(factIds.has(id), `${conflict.conflict_id}: unknown fact ${id}`);
      }
    }
  });

  test(`${item}: item definition references only existing, non-rejected facts and ids`, () => {
    const usable = new Set(facts.filter((fact) => fact.status !== 'rejected').map((fact) => fact.fact_id));
    const zones = new Map(itemDefinition.zones.map((zone) => [zone.zone_id, zone]));
    const containers = new Set(itemDefinition.containers.map((c) => c.container_id));
    const elements = new Set(itemDefinition.elements.map((e) => e.element_id));
    const questionIds = new Set(questions.map((q) => q.question_id));
    const factRefs = [];

    for (const c of itemDefinition.containers) {
      factRefs.push([c.container_id, c.fact_ids]);
      if (c.parent_id) assert.ok(containers.has(c.parent_id), `${c.container_id}: unknown parent`);
      if (c.zone_id) assert.ok(zones.has(c.zone_id), `${c.container_id}: unknown zone`);
    }
    for (const z of itemDefinition.zones) factRefs.push([z.zone_id, z.fact_ids]);
    for (const e of itemDefinition.elements) {
      factRefs.push([e.element_id, [...e.fact_ids, ...e.internet_exposed.evidence_fact_ids]]);
      assert.ok(zones.has(e.zone_id), `${e.element_id}: unknown zone`);
      const external = EXTERNAL_ZONES.has(zones.get(e.zone_id).kind);
      if (external) {
        assert.equal(e.parent_container_id, undefined, `${e.element_id}: external element has a container (R-13)`);
      } else {
        assert.ok(containers.has(e.parent_container_id), `${e.element_id}: needs exactly one known container (R-13)`);
      }
    }
    for (const l of itemDefinition.links) {
      factRefs.push([l.link_id, l.fact_ids]);
      assert.ok(elements.has(l.source_id), `${l.link_id}: unknown source`);
      assert.ok(elements.has(l.destination_id), `${l.link_id}: unknown destination`);
      const zoneOf = (id) => itemDefinition.elements.find((e) => e.element_id === id).zone_id;
      assert.equal(l.crosses_trust_boundary, zoneOf(l.source_id) !== zoneOf(l.destination_id), `${l.link_id}: trust boundary flag`);
    }
    for (const fn of itemDefinition.functions) {
      factRefs.push([fn.function_id, fn.fact_ids]);
      for (const id of [...fn.actor_ids, ...fn.element_ids]) assert.ok(elements.has(id), `${fn.function_id}: unknown ${id}`);
    }
    for (const sd of scopeDecisions) {
      factRefs.push([sd.decision_id, sd.based_on_fact_ids]);
      for (const id of sd.based_on_question_ids) assert.ok(questionIds.has(id), `${sd.decision_id}: unknown ${id}`);
    }
    for (const a of itemDefinition.assumptions) {
      factRefs.push([a.assumption_id, a.based_on.filter((id) => id.startsWith('FCT-'))]);
      for (const id of a.based_on.filter((x) => x.startsWith('Q-'))) assert.ok(questionIds.has(id), `${a.assumption_id}: unknown ${id}`);
    }
    factRefs.push(['stated controls', itemDefinition.stated_control_fact_ids || []]);
    factRefs.push(['stated absences', itemDefinition.stated_absence_fact_ids || []]);
    for (const [owner, ids] of factRefs) {
      for (const id of ids) assert.ok(usable.has(id), `${owner}: fact ${id} is missing or rejected (R-12)`);
    }
  });

  test(`${item}: one scope decision per element`, () => {
    const counts = new Map();
    for (const sd of scopeDecisions) counts.set(sd.element_id, (counts.get(sd.element_id) || 0) + 1);
    for (const e of itemDefinition.elements) {
      assert.equal(counts.get(e.element_id), 1, `${e.element_id}: expected exactly one scope decision`);
    }
    assert.equal(counts.size, itemDefinition.elements.length, 'scope decision for an unknown element');
  });

  test(`${item}: questions have known targets, no duplicates and respect the cap`, () => {
    const kinds = new Map(itemDefinition.elements.map((e) => [e.element_id, e.kind]));
    const linkIds = new Set(itemDefinition.links.map((l) => l.link_id));
    const seen = new Set();
    const visible = new Map();
    for (const q of questions) {
      assert.ok(kinds.has(q.target_id) || linkIds.has(q.target_id), `${q.question_id}: unknown target (R-05)`);
      const key = `${q.target_id}|${q.fact_type === 'generic' ? q.topic : q.fact_type}`;
      assert.ok(!seen.has(key), `${q.question_id}: duplicate question (R-06)`);
      seen.add(key);
      if (q.status !== 'dropped_answered_by_docs') visible.set(q.target_id, (visible.get(q.target_id) || 0) + 1);
    }
    for (const [target, count] of visible) {
      const cap = kinds.get(target) === 'unknown_kind' ? QUESTION_CAP_UNKNOWN_KIND : QUESTION_CAP;
      assert.ok(count <= cap, `${target}: ${count} visible questions, cap is ${cap} (R-07)`);
    }
  });

  test(`${item}: no em dashes in inputs, expected output or README`, () => {
    const files = [
      path.join(dir, 'README.md'),
      ...fs.readdirSync(path.join(dir, 'inputs')).filter((f) => !f.endsWith('.png')).map((f) => path.join(dir, 'inputs', f)),
      ...fs.readdirSync(path.join(dir, 'expected')).map((f) => path.join(dir, 'expected', f))
    ];
    for (const file of files) {
      assert.ok(!fs.readFileSync(file, 'utf8').includes('\u2014'), `${path.relative(ROOT, file)} contains an em dash (W1)`);
    }
  });
}
