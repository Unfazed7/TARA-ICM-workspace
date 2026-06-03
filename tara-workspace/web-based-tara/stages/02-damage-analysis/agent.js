'use strict';

const fs = require('fs');
const path = require('path');
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

const { callLLM } = require('../llm-client');
const MODEL = 'claude-opus-4-8';

const STAKEHOLDER_BY_PROPERTY = {
  confidentiality: 'tool_user',
  integrity: 'organization',
  availability: 'organization',
  authenticity: 'organization',
  authorization: 'organization',
  non_repudiation: 'regulator'
};

const STAKEHOLDERS = ['tool_user', 'organization', 'vehicle_owner', 'regulator', 'oem'];
const TOOL_NAME = 'submit_damage_scenarios_for_asset';

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

function buildDamageScenarioTool() {
  return {
    name: TOOL_NAME,
    description: 'Submit one damage scenario for each applicable CIAAAN property of a single asset',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        damage_scenarios: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['property', 'damage_scenario', 'stakeholder_affected'],
            properties: {
              property: { type: 'string', enum: CIAAAN_PROPERTIES },
              damage_scenario: { type: 'string', minLength: 1 },
              stakeholder_affected: { type: 'string', enum: STAKEHOLDERS }
            }
          }
        }
      },
      required: ['damage_scenarios']
    }
  };
}

function buildSystemPrompt() {
  const configDir = path.resolve(__dirname, '../../_config');
  return [
    fs.readFileSync(path.join(configDir, 'ciaaan-properties.md'), 'utf8'),
    fs.readFileSync(path.join(configDir, 'web-tara-constraints.md'), 'utf8'),
    'For each requested CIAAAN property, return exactly one damage scenario.',
    'Damage scenarios describe consequences, not attacks. Do not use attacker, hacker, or malicious actor language.',
    'Use this format: If the [CIAAAN property] of [Asset Title] is compromised, [specific adverse consequence] affecting [specific stakeholder] in the context of [specific function].'
  ].join('\n\n');
}

function buildUserMessage(asset, properties) {
  return [
    `Asset ID: ${asset.asset_id}`,
    `Asset title: ${asset.asset_title}`,
    `Asset type: ${asset.asset_type}`,
    `Asset description: ${asset.asset_description}`,
    `Applicable CIAAAN properties: ${properties.join(', ')}`,
    'Derive one specific damage scenario for each applicable property.'
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  if (!toolUse) return null;
  return toolUse.input?.damage_scenarios || null;
}

async function callClaudeForAsset(asset, properties, fetchImpl = fetch) {
  return callLLM({
    model: MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(asset, properties) }],
    tools: [buildDamageScenarioTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  }, fetchImpl);
}

async function generateDamageScenariosForAsset(asset, properties, fetchImpl) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callClaudeForAsset(asset, properties, fetchImpl);
    const scenarios = extractToolUse(response);
    if (Array.isArray(scenarios)) {
      if (scenarios.length !== properties.length) {
        throw new Error(`Wrong scenario count returned for ${asset.asset_id}: expected ${properties.length}, got ${scenarios.length}`);
      }
      return scenarios;
    }
  }
  throw new Error(`Claude returned free text instead of ${TOOL_NAME} tool_use for ${asset.asset_id}`);
}

async function buildDamageScenariosWithClaude(assets, options = {}) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('asset-register.json is empty');
  }

  const scenarios = [];
  const timestamp = options.timestamp || new Date().toISOString();
  for (const asset of assets) {
    const applicable = CIAAAN_PROPERTIES.filter((property) => asset.ciaaan[property] === true);
    if (applicable.length === 0) {
      console.warn(`Skipping ${asset.asset_id}: no true CIAAAN flags`);
      continue;
    }

    const returned = await generateDamageScenariosForAsset(asset, applicable, options.fetchImpl);
    for (const item of returned) {
      scenarios.push({
        damage_id: formatId('DS', scenarios.length),
        asset_id: asset.asset_id,
        asset_title: asset.asset_title,
        property: item.property,
        damage_scenario: item.damage_scenario,
        stakeholder_affected: item.stakeholder_affected,
        created_timestamp: timestamp
      });
    }
  }

  validateDamageScenarios(scenarios, assets);
  return scenarios;
}

async function run(options) {
  const assets = readJson(options.assets);
  const scenarios = options.useDeterministic
    ? buildDamageScenarios(assets)
    : await buildDamageScenariosWithClaude(assets, { fetchImpl: options.fetchImpl });
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
  buildDamageScenarioTool,
  buildDamageScenarios,
  buildDamageScenariosWithClaude,
  buildSystemPrompt,
  buildUserMessage,
  callClaudeForAsset,
  createScenarioText,
  extractToolUse,
  generateDamageScenariosForAsset,
  run,
  validateDamageScenarios
};
