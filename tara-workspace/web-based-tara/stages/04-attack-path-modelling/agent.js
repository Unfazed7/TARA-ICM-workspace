'use strict';

const fs = require('fs');
const path = require('path');
const {
  formatId,
  parseArgs,
  readJson,
  requireFileArg,
  writeJson
} = require('../agent-utils');

const MODEL = 'claude-opus-4-8';
const TOOL_NAME = 'submit_attack_path';
const THINKING = { type: 'enabled', budget_tokens: 8000 };

const CVSS_ENUMS = {
  attack_vector: ['N', 'A', 'L', 'P'],
  attack_complexity: ['L', 'H'],
  privileges_required: ['N', 'L', 'H'],
  user_interaction: ['N', 'R']
};

function ensureThreats(threats) {
  if (!Array.isArray(threats) || threats.length === 0) throw new Error('No threats to process');
}

function validateAttackPaths(paths, threats) {
  if (paths.length !== threats.length) throw new Error('Exactly one AT_## per TH_## required');
  const threatIds = new Set(threats.map((threat) => threat.threat_id));
  for (const path of paths) {
    if (!threatIds.has(path.threat_id)) throw new Error(`Unknown threat_id for ${path.attack_id}`);
    for (const [step, value] of Object.entries(path.attack_path)) {
      if (!value) throw new Error(`Empty attack path step ${step} for ${path.attack_id}`);
    }
    for (const [metric, allowed] of Object.entries(CVSS_ENUMS)) {
      if (!allowed.includes(path.cvss_metrics[metric])) {
        throw new Error(`Invalid CVSS metric ${metric} for ${path.attack_id}`);
      }
      if (!path.justifications[metric]) throw new Error(`Empty justification ${metric} for ${path.attack_id}`);
    }
    if (path.afr_value !== null || path.afr_label !== null) {
      throw new Error(`${path.attack_id} must have null AFR fields before engine execution`);
    }
  }
}

function buildAttackPathTool() {
  return {
    name: TOOL_NAME,
    description: 'Submit the most feasible five-step attack path and CVSS exploitability metrics for one threat',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['attack_description', 'attack_path', 'cvss_metrics', 'justifications'],
      properties: {
        attack_description: { type: 'string', minLength: 1 },
        attack_path: {
          type: 'object',
          additionalProperties: false,
          required: [
            'step_1_initial_precondition',
            'step_2_abuse_technique',
            'step_3_exploit_effect',
            'step_4_control_gap',
            'step_5_threat_realization'
          ],
          properties: {
            step_1_initial_precondition: { type: 'string', minLength: 1 },
            step_2_abuse_technique: { type: 'string', minLength: 1 },
            step_3_exploit_effect: { type: 'string', minLength: 1 },
            step_4_control_gap: { type: 'string', minLength: 1 },
            step_5_threat_realization: { type: 'string', minLength: 1 }
          }
        },
        cvss_metrics: {
          type: 'object',
          additionalProperties: false,
          required: ['attack_vector', 'attack_complexity', 'privileges_required', 'user_interaction'],
          properties: {
            attack_vector: { type: 'string', enum: CVSS_ENUMS.attack_vector },
            attack_complexity: { type: 'string', enum: CVSS_ENUMS.attack_complexity },
            privileges_required: { type: 'string', enum: CVSS_ENUMS.privileges_required },
            user_interaction: { type: 'string', enum: CVSS_ENUMS.user_interaction }
          }
        },
        justifications: {
          type: 'object',
          additionalProperties: false,
          required: ['attack_vector', 'attack_complexity', 'privileges_required', 'user_interaction'],
          properties: {
            attack_vector: { type: 'string', minLength: 1 },
            attack_complexity: { type: 'string', minLength: 1 },
            privileges_required: { type: 'string', minLength: 1 },
            user_interaction: { type: 'string', minLength: 1 }
          }
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
    fs.readFileSync(path.join(configDir, 'cvss-afr-formula.md'), 'utf8'),
    'Model the most feasible realistic five-step attack path working backward from the damage scenario.',
    'Step 4 must describe an actual control gap, not a hypothetical or generic missing control.',
    'Assign CVSS v3.1 exploitability metrics from the attack mechanism.',
    'Return only via the submit_attack_path tool.'
  ].join('\n\n');
}

function buildUserMessage(threat) {
  return [
    `Threat ID: ${threat.threat_id}`,
    `Threat statement: ${threat.threat_statement}`,
    `STRIDE category: ${threat.stride_category}`,
    `Derivation note: ${threat.derivation_note}`,
    `Damage scenario ID: ${threat.damage_scenario_id}`,
    `Asset ID: ${threat.asset_id}`,
    `Asset title: ${threat.asset_title}`,
    `CIAAAN property: ${threat.property}`,
    'Model the most feasible 5-step attack path and assign CVSS metrics.'
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  return toolUse?.input || null;
}

async function callClaudeForThreat(threat, fetchImpl = fetch) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for Stage 04 attack path modelling');

  const requestBody = {
    model: MODEL,
    max_tokens: 16000,
    thinking: THINKING,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(threat) }],
    tools: [buildAttackPathTool()],
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

  if (!response.ok) throw new Error(`Claude attack path request failed: ${response.status}`);
  return response.json();
}

async function generateAttackPathForThreat(threat, fetchImpl) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callClaudeForThreat(threat, fetchImpl);
    const attackPath = extractToolUse(response);
    if (attackPath) return attackPath;
  }
  throw new Error(`Claude returned free text instead of ${TOOL_NAME} tool_use for ${threat.threat_id}`);
}

async function buildAttackPathsWithClaude(threats, options = {}) {
  ensureThreats(threats);

  const paths = [];
  const timestamp = options.timestamp || new Date().toISOString();
  for (const threat of threats) {
    const attackPath = await generateAttackPathForThreat(threat, options.fetchImpl);
    paths.push({
      attack_id: formatId('AT', paths.length),
      threat_id: threat.threat_id,
      damage_scenario_id: threat.damage_scenario_id,
      asset_id: threat.asset_id,
      attack_description: attackPath.attack_description,
      attack_path: attackPath.attack_path,
      cvss_metrics: attackPath.cvss_metrics,
      afr_value: null,
      afr_label: null,
      justifications: attackPath.justifications,
      created_timestamp: timestamp
    });
  }

  validateAttackPaths(paths, threats);
  return paths;
}

async function run(options) {
  const threats = readJson(options.threats);
  const attackPaths = await buildAttackPathsWithClaude(threats, { fetchImpl: options.fetchImpl });
  writeJson(options.out, attackPaths);
  return attackPaths;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    threats: requireFileArg(args, 'threats'),
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
  buildAttackPathTool,
  buildAttackPathsWithClaude,
  buildSystemPrompt,
  buildUserMessage,
  callClaudeForThreat,
  extractToolUse,
  generateAttackPathForThreat,
  run,
  validateAttackPaths,
  THINKING
};
