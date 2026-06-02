'use strict';

const {
  CIAAAN_PROPERTIES,
  countBy,
  formatId,
  hasAttackerLanguage,
  parseArgs,
  readJson,
  requireFileArg,
  submitCheckpoint,
  toTitle,
  writeJson
} = require('../agent-utils');

const STAKEHOLDER_BY_PROPERTY = {
  confidentiality: 'tool_user',
  integrity: 'organization',
  availability: 'organization',
  authenticity: 'organization',
  authorization: 'organization',
  non_repudiation: 'regulator'
};

function buildDamageScenarios(assets, timestamp = new Date().toISOString()) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('asset-register.json is empty');
  }

  const scenarios = [];
  for (const asset of assets) {
    const applicable = CIAAAN_PROPERTIES.filter((property) => asset.ciaaan[property] === true);
    if (applicable.length === 0) {
      console.warn(`Skipping ${asset.asset_id}: no true CIAAAN flags`);
      continue;
    }

    for (const property of applicable) {
      const damage = createScenarioText(asset, property);
      scenarios.push({
        damage_id: formatId('DS', scenarios.length),
        asset_id: asset.asset_id,
        asset_title: asset.asset_title,
        property,
        damage_scenario: damage,
        stakeholder_affected: STAKEHOLDER_BY_PROPERTY[property],
        created_timestamp: timestamp
      });
    }
  }

  validateDamageScenarios(scenarios, assets);
  return scenarios;
}

function createScenarioText(asset, property) {
  const label = toTitle(property);
  const consequence = {
    confidentiality: 'sensitive diagnostic or vehicle data is exposed beyond its intended audience',
    integrity: 'diagnostic workflow decisions are based on untrusted or altered application behavior',
    availability: 'required diagnostic workflows are interrupted or unavailable when service teams need them',
    authenticity: 'the platform cannot reliably verify the identity of the actor or system using the function',
    authorization: 'privileged diagnostic functionality is used outside the permitted access boundary',
    non_repudiation: 'the platform cannot prove which actor performed a diagnostic action during later review'
  }[property];
  return `If the ${label} of ${asset.asset_title} is compromised, ${consequence} affecting ${STAKEHOLDER_BY_PROPERTY[property]} in the context of ${asset.asset_title} operations.`;
}

function validateDamageScenarios(scenarios, assets) {
  const assetById = new Map(assets.map((asset) => [asset.asset_id, asset]));
  const seenPairs = new Set();
  for (const scenario of scenarios) {
    const asset = assetById.get(scenario.asset_id);
    if (!asset) throw new Error(`Unknown asset_id for ${scenario.damage_id}: ${scenario.asset_id}`);
    if (asset.ciaaan[scenario.property] !== true) {
      throw new Error(`${scenario.damage_id} references disabled property ${scenario.property}`);
    }
    const pair = `${scenario.asset_id}:${scenario.property}`;
    if (seenPairs.has(pair)) throw new Error(`Duplicate damage scenario for ${pair}`);
    seenPairs.add(pair);
    if (hasAttackerLanguage(scenario.damage_scenario)) {
      throw new Error(`Damage scenario contains attacker language: ${scenario.damage_id}`);
    }
  }
}

async function run(options) {
  const assets = readJson(options.assets);
  const scenarios = buildDamageScenarios(assets);
  writeJson(options.out, scenarios);
  await submitCheckpoint(options.assessmentId, {
    stage_num: 2,
    stage_name: 'damage-analysis',
    output_summary: {
      total_damage_scenarios: scenarios.length,
      by_property: countBy(scenarios, 'property'),
      assets_covered: new Set(scenarios.map((scenario) => scenario.asset_id)).size
    }
  });
  return scenarios;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    assets: requireFileArg(args, 'assets'),
    assessmentId: args['assessment-id'],
    out: requireFileArg(args, 'out')
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildDamageScenarios,
  createScenarioText,
  run,
  validateDamageScenarios
};
