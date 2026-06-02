'use strict';

const fs = require('fs');
const path = require('path');
const {
  STRIDE_CATEGORIES,
  countBy,
  formatId,
  parseArgs,
  readJson,
  requireFileArg,
  submitCheckpoint,
  writeJson
} = require('../agent-utils');

const MODEL = 'claude-opus-4-8';
const TOOL_NAME = 'submit_threat';
const OWASP_REFERENCES = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10',
  'API1', 'API2', 'API3', 'API4', 'API5', 'API6', 'API7', 'API8', 'API9', 'API10'
];

function ensureDamageScenarios(damageScenarios) {
  if (!Array.isArray(damageScenarios) || damageScenarios.length === 0) {
    throw new Error('No damage scenarios to process');
  }
}

function validateThreats(threats, damageScenarios) {
  if (threats.length !== damageScenarios.length) {
    throw new Error('Exactly one TH_## per DS_## required');
  }
  const damageIds = new Set(damageScenarios.map((scenario) => scenario.damage_id));
  for (const threat of threats) {
    if (!damageIds.has(threat.damage_scenario_id)) {
      throw new Error(`Unknown damage_scenario_id for ${threat.threat_id}`);
    }
    if (!STRIDE_CATEGORIES.includes(threat.stride_category)) {
      throw new Error(`Invalid stride_category for ${threat.threat_id}: ${threat.stride_category}`);
    }
    if (!threat.threat_statement.includes(threat.asset_title)) {
      throw new Error(`Threat statement does not contain asset title for ${threat.threat_id}`);
    }
    if (!threat.derivation_note) throw new Error(`Empty derivation_note for ${threat.threat_id}`);
  }
}

function buildThreatTool() {
  return {
    name: TOOL_NAME,
    description: 'Submit one STRIDE threat derived from one damage scenario',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['stride_category', 'threat_statement', 'derivation_note', 'owasp_reference'],
      properties: {
        stride_category: { type: 'string', enum: STRIDE_CATEGORIES },
        threat_statement: { type: 'string', minLength: 1 },
        derivation_note: { type: 'string', minLength: 1 },
        owasp_reference: {
          anyOf: [
            { type: 'string', enum: OWASP_REFERENCES },
            { type: 'null' }
          ]
        }
      }
    }
  };
}

function buildSystemPrompt() {
  const configDir = path.resolve(__dirname, '../../_config');
  return [
    fs.readFileSync(path.join(configDir, 'stride-taxonomy.md'), 'utf8'),
    fs.readFileSync(path.join(configDir, 'owasp-stride-mapping.md'), 'utf8'),
    'Derive exactly one concrete threat for the provided damage scenario.',
    'The threat statement must name the specific asset_title exactly.',
    'Return only via the submit_threat tool.'
  ].join('\n\n');
}

function buildUserMessage(damageScenario) {
  return [
    `Damage scenario ID: ${damageScenario.damage_id}`,
    `Damage scenario: ${damageScenario.damage_scenario}`,
    `Asset ID: ${damageScenario.asset_id}`,
    `Asset title: ${damageScenario.asset_title}`,
    `CIAAAN property: ${damageScenario.property}`,
    'Derive the specific attack action that would directly cause this damage scenario.'
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  return toolUse?.input || null;
}

async function callClaudeForDamageScenario(damageScenario, fetchImpl = fetch) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for Stage 03 threat identification');

  const requestBody = {
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(damageScenario) }],
    tools: [buildThreatTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME }
  };

  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`Claude threat identification request failed: ${response.status}`);
  return response.json();
}

async function generateThreatForDamageScenario(damageScenario, fetchImpl) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callClaudeForDamageScenario(damageScenario, fetchImpl);
    const threat = extractToolUse(response);
    if (threat) return threat;
  }
  throw new Error(`Claude returned free text instead of ${TOOL_NAME} tool_use for ${damageScenario.damage_id}`);
}

async function buildThreatsWithClaude(damageScenarios, options = {}) {
  ensureDamageScenarios(damageScenarios);

  const threats = [];
  const timestamp = options.timestamp || new Date().toISOString();
  for (const scenario of damageScenarios) {
    const threat = await generateThreatForDamageScenario(scenario, options.fetchImpl);
    threats.push({
      threat_id: formatId('TH', threats.length),
      damage_scenario_id: scenario.damage_id,
      asset_id: scenario.asset_id,
      asset_title: scenario.asset_title,
      property: scenario.property,
      stride_category: threat.stride_category,
      threat_statement: threat.threat_statement,
      derivation_note: threat.derivation_note,
      owasp_reference: threat.owasp_reference ?? null,
      created_timestamp: timestamp
    });
  }

  validateThreats(threats, damageScenarios);
  return threats;
}

async function run(options) {
  const damageScenarios = readJson(options.damageScenarios);
  const threats = await buildThreatsWithClaude(damageScenarios, { fetchImpl: options.fetchImpl });
  writeJson(options.out, threats);
  await submitCheckpoint(options.assessmentId, {
    stage_num: 3,
    stage_name: 'threat-identification',
    output_summary: {
      total_threats: threats.length,
      by_stride: countBy(threats, 'stride_category'),
      by_owasp: countBy(threats, 'owasp_reference')
    }
  });
  return threats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    damageScenarios: requireFileArg(args, 'damage-scenarios'),
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
  buildSystemPrompt,
  buildThreatTool,
  buildThreatsWithClaude,
  buildUserMessage,
  callClaudeForDamageScenario,
  extractToolUse,
  generateThreatForDamageScenario,
  run,
  validateThreats
};
