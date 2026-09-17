'use strict';

const fs = require('fs');
const path = require('path');
const {
  RATINGS,
  assertRating,
  formatId,
  parseArgs,
  readJson,
  requireFileArg,
  writeJson
} = require('../agent-utils');

const { callLLM } = require('../llm-client');
const MODEL = 'claude-opus-4-8';
const TOOL_NAME = 'submit_impact_analysis';
const FIXED_SAFETY_RATIONALE = 'Not applicable - web-based tools operate in software only and cannot directly cause physical harm to the tool user. Safety impacts from downstream vehicle effects are out of scope for web-based TARA.';
const FIXED_FINANCIAL_RATIONALE = 'Not applicable - web-based automotive tools do not handle the tool user personal financial transactions. Direct financial loss to the tool user is not a credible damage scenario for this system type.';

function ensureThreats(threats) {
  if (!Array.isArray(threats) || threats.length === 0) throw new Error('No threats to process');
}

function buildImpactTool() {
  return {
    name: TOOL_NAME,
    description: 'Submit impact analysis ratings and rationales for one threat',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['impact_narrative', 'tool_user', 'other_stakeholders'],
      properties: {
        impact_narrative: { type: 'string', minLength: 1 },
        tool_user: {
          type: 'object',
          additionalProperties: false,
          required: ['privacy', 'operational', 'rationale_privacy', 'rationale_operational'],
          properties: {
            privacy: { type: 'string', enum: RATINGS },
            operational: { type: 'string', enum: RATINGS },
            rationale_privacy: { type: 'string', minLength: 1 },
            rationale_operational: { type: 'string', minLength: 1 }
          }
        },
        other_stakeholders: {
          type: 'object',
          additionalProperties: false,
          required: [
            'legal',
            'financial',
            'business',
            'rationale_legal',
            'rationale_financial',
            'rationale_business'
          ],
          properties: {
            legal: { type: 'string', enum: RATINGS },
            financial: { type: 'string', enum: RATINGS },
            business: { type: 'string', enum: RATINGS },
            rationale_legal: { type: 'string', minLength: 1 },
            rationale_financial: { type: 'string', minLength: 1 },
            rationale_business: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  };
}

function buildSystemPrompt() {
  const configDir = path.resolve(__dirname, '../../_config');
  return [
    fs.readFileSync(path.join(configDir, 'impact-dimensions.md'), 'utf8'),
    fs.readFileSync(path.join(configDir, 'web-tara-constraints.md'), 'utf8'),
    'Tool User Safety and Financial are always Negligible - do not compute them.',
    'Rate only tool_user.privacy, tool_user.operational, other_stakeholders.legal, other_stakeholders.financial, and other_stakeholders.business.',
    'Write a specific impact narrative derived from the threat statement, and derive ratings from the damage scenario.',
    'Apply the four rating guard rules before scoring any dimension:',
    '1. Safety cap: maximum rating is Major — never Severe — for web-based TARA.',
    '2. Privacy gate: if the damage scenario contains no explicit exposure language ("is disclosed", "is exposed", "is extracted", "accessed without authorization"), privacy must be Negligible.',
    '3. Financial inference guard: rate Other Stakeholders Financial only if the damage scenario explicitly describes financial loss or revenue impact — do not infer it from data disclosure alone.',
    '4. Party attribution: apply a consequence only to the stakeholder party the damage scenario explicitly attributes it to — do not cross-apply consequences between parties.',
    `Return only via the ${TOOL_NAME} tool.`
  ].join('\n\n');
}

function buildUserMessage(threat, damageScenario) {
  return [
    `Threat ID: ${threat.threat_id}`,
    `Threat statement: ${threat.threat_statement}`,
    `STRIDE category: ${threat.stride_category}`,
    `Derivation note: ${threat.derivation_note}`,
    `Damage scenario ID: ${damageScenario.damage_id}`,
    `Damage scenario: ${damageScenario.damage_scenario}`,
    `Stakeholder affected: ${damageScenario.stakeholder_affected}`,
    `Asset ID: ${damageScenario.asset_id}`,
    `Asset title: ${damageScenario.asset_title}`,
    `CIAAAN property: ${damageScenario.property}`,
    'Produce one impact narrative and the five non-fixed impact ratings with rationales.'
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  if (!toolUse?.input) return null;
  if (Array.isArray(toolUse.input.impact_analysis)) return toolUse.input.impact_analysis[0] || null;
  return toolUse.input;
}

async function callClaudeForThreat(threat, damageScenario, fetchImpl = fetch) {
  return callLLM({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(threat, damageScenario) }],
    tools: [buildImpactTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  }, fetchImpl);
}

async function generateImpactForThreat(threat, damageScenario, fetchImpl) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callClaudeForThreat(threat, damageScenario, fetchImpl);
    const impact = extractToolUse(response);
    if (impact) return impact;
  }
  throw new Error(`Claude returned free text instead of ${TOOL_NAME} tool_use for ${threat.threat_id}`);
}

async function buildImpactAnalysisWithClaude(threats, damageScenarios, options = {}) {
  ensureThreats(threats);
  const damageById = new Map(damageScenarios.map((scenario) => [scenario.damage_id, scenario]));
  const impacts = [];
  const timestamp = options.timestamp || new Date().toISOString();

  for (const threat of threats) {
    const damage = damageById.get(threat.damage_scenario_id);
    if (!damage) throw new Error(`No damage scenario found for threat ${threat.threat_id}`);
    const impact = await generateImpactForThreat(threat, damage, options.fetchImpl);
    impacts.push({
      impact_id: formatId('IM', impacts.length),
      threat_id: threat.threat_id,
      damage_scenario_id: threat.damage_scenario_id,
      asset_id: threat.asset_id,
      property: threat.property,
      impact_narrative: impact.impact_narrative,
      tool_user: {
        safety: 'Negligible',
        privacy: impact.tool_user?.privacy,
        financial: 'Negligible',
        operational: impact.tool_user?.operational,
        rationale_safety: FIXED_SAFETY_RATIONALE,
        rationale_privacy: impact.tool_user?.rationale_privacy,
        rationale_financial: FIXED_FINANCIAL_RATIONALE,
        rationale_operational: impact.tool_user?.rationale_operational
      },
      other_stakeholders: {
        legal: impact.other_stakeholders?.legal,
        financial: impact.other_stakeholders?.financial,
        business: impact.other_stakeholders?.business,
        rationale_legal: impact.other_stakeholders?.rationale_legal,
        rationale_financial: impact.other_stakeholders?.rationale_financial,
        rationale_business: impact.other_stakeholders?.rationale_business
      },
      created_timestamp: timestamp
    });
  }

  validateImpactAnalysis(impacts, threats, damageScenarios);
  return impacts;
}

function validateImpactAnalysis(impacts, threats, damageScenarios) {
  if (impacts.length !== threats.length) throw new Error('1 IM_## per TH_## required');
  const threatIds = new Set(threats.map((threat) => threat.threat_id));
  const damageIds = new Set(damageScenarios.map((scenario) => scenario.damage_id));
  for (const impact of impacts) {
    if (!threatIds.has(impact.threat_id)) throw new Error(`Unknown threat_id for ${impact.impact_id}`);
    if (!damageIds.has(impact.damage_scenario_id)) throw new Error(`Unknown damage_scenario_id for ${impact.impact_id}`);
    if (impact.tool_user.safety !== 'Negligible') throw new Error(`${impact.impact_id}: safety must be Negligible`);
    if (impact.tool_user.financial !== 'Negligible') throw new Error(`${impact.impact_id}: financial must be Negligible`);
    const dimensions = {
      privacy: impact.tool_user.privacy,
      operational: impact.tool_user.operational,
      legal: impact.other_stakeholders.legal,
      financial: impact.other_stakeholders.financial,
      business: impact.other_stakeholders.business
    };
    for (const [dimension, rating] of Object.entries(dimensions)) assertRating(rating, dimension);
    assertRating(impact.tool_user.safety, 'safety');
    assertRating(impact.tool_user.financial, 'financial');
    for (const group of [impact.tool_user, impact.other_stakeholders]) {
      for (const [key, value] of Object.entries(group)) {
        if (key.startsWith('rationale_') && !value) throw new Error(`Empty rationale for ${key} in ${impact.impact_id}`);
      }
    }
    if (!RATINGS.includes(impact.tool_user.safety) || !RATINGS.includes(impact.tool_user.financial)) {
      throw new Error(`Invalid fixed rating in ${impact.impact_id}`);
    }
    if (!impact.impact_narrative) throw new Error(`Empty impact_narrative for ${impact.impact_id}`);
  }
}

async function run(options) {
  const threats = readJson(options.threats);
  const damageScenarios = readJson(options.damageScenarios);
  const impacts = await buildImpactAnalysisWithClaude(threats, damageScenarios, { fetchImpl: options.fetchImpl });
  writeJson(options.out, impacts);
  return impacts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    threats: requireFileArg(args, 'threats'),
    damageScenarios: requireFileArg(args, 'damage-scenarios'),
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
  buildImpactAnalysisWithClaude,
  buildImpactTool,
  buildSystemPrompt,
  buildUserMessage,
  callClaudeForThreat,
  extractToolUse,
  generateImpactForThreat,
  run,
  validateImpactAnalysis
};
