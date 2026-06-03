'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ROOT = path.resolve(__dirname, '..', '..');

function createAjv() {
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  ajv.addKeyword({
    keyword: 'uniqueItemProperties',
    type: 'array',
    schemaType: 'array',
    compile(properties) {
      return (data) => {
        for (const property of properties) {
          const seen = new Set();
          for (const item of data) {
            const value = item[property];
            if (seen.has(value)) return false;
            seen.add(value);
          }
        }
        return true;
      };
    }
  });
  return ajv;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function schemaPath(stage) {
  const files = {
    1: 'stage-01-asset-register.schema.json',
    2: 'stage-02-damage-scenarios.schema.json',
    3: 'stage-03-threats.schema.json',
    4: 'stage-04-attack-paths.schema.json',
    5: 'stage-05-impact-analysis.schema.json',
    6: 'stage-06-risk-register.schema.json'
  };
  return path.join(ROOT, 'src', 'schemas', files[stage]);
}

function fixturePath(group, fileName) {
  return path.join(ROOT, 'tests', 'fixtures', group, fileName);
}

function validateSchema(data, schema) {
  const ajv = createAjv();
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid, errors: validate.errors || [] };
}

function validateFixture(stage, group, fileName) {
  return validateSchema(readJson(fixturePath(group, fileName)), readJson(schemaPath(stage)));
}

function assertValidChain(fixtures) {
  const assets = new Map(fixtures.assets.map((asset) => [asset.asset_id, asset]));
  const damage = new Map(fixtures.damage.map((item) => [item.damage_id, item]));
  const threats = new Map(fixtures.threats.map((item) => [item.threat_id, item]));
  const attacks = new Map(fixtures.attacks.map((item) => [item.attack_id, item]));
  const impacts = new Map(fixtures.impacts.map((item) => [item.impact_id, item]));

  for (const item of fixtures.damage) {
    const asset = assets.get(item.asset_id);
    if (!asset) throw new Error(`Orphan damage scenario ${item.damage_id}: missing ${item.asset_id}`);
    if (asset.ciaaan[item.property] !== true) {
      throw new Error(`Damage scenario ${item.damage_id} references disabled property ${item.property}`);
    }
  }

  for (const item of fixtures.threats) {
    const damageScenario = damage.get(item.damage_scenario_id);
    if (!damageScenario) throw new Error(`Orphan threat ${item.threat_id}: missing ${item.damage_scenario_id}`);
    if (!assets.has(item.asset_id)) throw new Error(`Orphan threat ${item.threat_id}: missing ${item.asset_id}`);
    if (!item.threat_statement.includes(item.asset_title)) {
      throw new Error(`Threat ${item.threat_id} does not reference asset title`);
    }
  }

  for (const item of fixtures.attacks) {
    if (!threats.has(item.threat_id)) throw new Error(`Orphan attack path ${item.attack_id}: missing ${item.threat_id}`);
  }

  for (const item of fixtures.impacts) {
    if (!threats.has(item.threat_id)) throw new Error(`Orphan impact ${item.impact_id}: missing ${item.threat_id}`);
    if (!damage.has(item.damage_scenario_id)) {
      throw new Error(`Orphan impact ${item.impact_id}: missing ${item.damage_scenario_id}`);
    }
  }

  for (const item of fixtures.risks) {
    if (!threats.has(item.threat_id)) throw new Error(`Orphan risk ${item.risk_id}: missing ${item.threat_id}`);
    if (!damage.has(item.damage_scenario_id)) throw new Error(`Orphan risk ${item.risk_id}: missing damage scenario`);
    if (!attacks.has(item.attack_id)) throw new Error(`Orphan risk ${item.risk_id}: missing attack path`);
    if (!impacts.has(item.impact_id)) throw new Error(`Orphan risk ${item.risk_id}: missing impact`);
    if (item.risk_score !== item.impact_rating_value * item.afr_value) {
      throw new Error(`Risk ${item.risk_id} score mismatch`);
    }
  }
}

module.exports = {
  ROOT,
  createAjv,
  fixturePath,
  readJson,
  schemaPath,
  validateFixture,
  validateSchema,
  assertValidChain
};
