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

const { callLLM, getConfig } = require('../llm-client');
const { calculateCVSSAFR } = require('../../_engines/cvss-afr-calc');
const MODEL = 'claude-opus-4-8';
const TOOL_NAME = 'submit_attack_path';
const THINKING = { type: 'enabled', budget_tokens: 8000 };
const MAX_OUTPUT_TOKENS = 4096;

const ATTACK_PATH_STEPS = [
  'step_1_initial_precondition',
  'step_2_abuse_technique',
  'step_3_exploit_effect',
  'step_4_control_gap',
  'step_5_threat_realization'
];

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

function enrichAttackPathsWithAFR(paths) {
  return paths.map((attackPath) => ({
    ...attackPath,
    ...calculateCVSSAFR(attackPath.cvss_metrics)
  }));
}

function validateEnrichedAttackPaths(paths) {
  for (const attackPath of paths) {
    const expected = calculateCVSSAFR(attackPath.cvss_metrics);
    if (attackPath.afr_value !== expected.afr_value || attackPath.afr_label !== expected.afr_label) {
      throw new Error(`${attackPath.attack_id}: AFR does not match its CVSS metrics`);
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
    'Model the most feasible five-step attack path working backward from the damage scenario.',
    'Each step must be 1–2 sentences. Write for a security manager, not a penetration tester — clear and specific, but not overly technical.',
    'Steps must connect: begin steps 2–5 with a short bridge phrase that references what the previous step established (e.g. "With this access...", "Because no validation exists...", "This allows the attacker to...").',
    'Step 1: who the attacker is and what initial position or access they hold.',
    'Step 2: the specific action they take using that position.',
    'Step 3: what they can now reach or do as a direct result.',
    'Step 4: the specific control gap — the actual missing or weak control on this asset — that lets Step 3 succeed.',
    'Step 5: the direct outcome that realizes the damage scenario.',
    'Do not pad artificially: if the threat\'s causal chain is genuinely complete in fewer steps, compress the remaining steps to confirm closure rather than inventing filler content.',
    'The attack_description must be a single sentence covering the full chain — the TL;DR a reviewer reads first.',
    'Assign CVSS v3.1 exploitability metrics from the attack mechanism. Derive Scope per threat: use Scope=Changed only for SSRF-into-IAM, RCE-to-OS, or cross-tenant BFLA/BOLA patterns.',
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
    'Model the most feasible 5-step attack path. Each step is 1–2 sentences and opens with a phrase connecting it to the previous step. The attack_description is one sentence summarising the full chain.'
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  return toolUse?.input || null;
}

function parseTextAttackPath(response) {
  const text = (response?.content || [])
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
  if (!text) return null;

  const candidates = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.unshift(fenced[1].trim());
  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(text.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next representation.
    }
  }
  return null;
}

function validateAttackPathPayload(attackPath) {
  if (!attackPath || typeof attackPath !== 'object' || Array.isArray(attackPath)) {
    throw new Error('attack-path payload must be an object');
  }
  if (typeof attackPath.attack_description !== 'string' || !attackPath.attack_description.trim()) {
    throw new Error('attack_description is required');
  }
  if (!attackPath.attack_path || typeof attackPath.attack_path !== 'object') {
    throw new Error('attack_path is required');
  }
  for (const step of ATTACK_PATH_STEPS) {
    if (typeof attackPath.attack_path[step] !== 'string' || !attackPath.attack_path[step].trim()) {
      throw new Error(`${step} is required`);
    }
  }
  if (!attackPath.cvss_metrics || typeof attackPath.cvss_metrics !== 'object') {
    throw new Error('cvss_metrics is required');
  }
  for (const [metric, allowed] of Object.entries(CVSS_ENUMS)) {
    if (!allowed.includes(attackPath.cvss_metrics[metric])) {
      throw new Error(`Invalid CVSS metric ${metric}`);
    }
  }
  if (!attackPath.justifications || typeof attackPath.justifications !== 'object') {
    throw new Error('justifications are required');
  }
  for (const metric of Object.keys(CVSS_ENUMS)) {
    if (typeof attackPath.justifications[metric] !== 'string' || !attackPath.justifications[metric].trim()) {
      throw new Error(`Justification for ${metric} is required`);
    }
  }
  return attackPath;
}

function compact(value, maxLength = 280) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildFallbackAttackPath(threat) {
  const source = `${threat.threat_statement || ''} ${threat.derivation_note || ''}`.toLowerCase();
  const attackVector = /physical|on-site|obd/.test(source)
    ? 'P'
    : /adjacent|same network|local network|private network/.test(source)
      ? 'A'
      : /local shell|local access|host access/.test(source)
        ? 'L'
        : 'N';
  const attackComplexity = /race condition|timing|specific condition|co-scheduled|depends on|cannot guarantee/.test(source)
    ? 'H'
    : 'L';
  const privilegesRequired = /anonymous|unauthenticated|no account|without credentials/.test(source)
    ? 'N'
    : /cluster-admin|administrator|admin-level|control-plane credentials|privileged credential/.test(source)
      ? 'H'
      : 'L';
  const userInteraction = /phishing|user must|victim must|clicks? (?:a|the)|opens? (?:a|the) link/.test(source)
    ? 'R'
    : 'N';
  const mechanism = String(threat.stride_category || 'threat').replace(/_/g, ' ');
  const statement = compact(threat.threat_statement, 320);
  const derivation = compact(threat.derivation_note, 260);

  return {
    attack_description: compact(
      `${threat.asset_title}: the ${mechanism} mechanism described in ${threat.threat_id} is exercised until ${threat.property} is compromised.`,
      420
    ),
    attack_path: {
      step_1_initial_precondition: `The threat actor has the ${attackVector === 'N' ? 'network reachability' : attackVector === 'A' ? 'adjacent-network position' : attackVector === 'L' ? 'local execution position' : 'physical access'} and ${privilegesRequired === 'N' ? 'requires no prior privileges' : privilegesRequired === 'L' ? 'holds a limited authenticated or execution context' : 'holds a privileged administrative context'} needed to reach ${threat.asset_title}.`,
      step_2_abuse_technique: `Using this position, the actor applies the ${mechanism} technique captured by ${threat.threat_id}: ${statement}`,
      step_3_exploit_effect: `This action gives the actor the capability to interfere with ${threat.asset_title} and advance from initial access to a direct compromise of its ${threat.property} property.`,
      step_4_control_gap: `Because the documented control weakness remains unmitigated, the preceding capability is not prevented or detected. ${derivation}`,
      step_5_threat_realization: `This completes the path by realizing ${threat.threat_id} and compromising ${threat.asset_title} ${threat.property}, producing the linked ${threat.damage_scenario_id} consequence.`
    },
    cvss_metrics: {
      attack_vector: attackVector,
      attack_complexity: attackComplexity,
      privileges_required: privilegesRequired,
      user_interaction: userInteraction
    },
    justifications: {
      attack_vector: `Attack Vector is ${attackVector} because the initial position described for ${threat.threat_id} is ${attackVector === 'N' ? 'remotely network reachable' : attackVector === 'A' ? 'limited to an adjacent network' : attackVector === 'L' ? 'local to the target environment' : 'dependent on physical access'}.`,
      attack_complexity: `Attack Complexity is ${attackComplexity} because the documented chain ${attackComplexity === 'H' ? 'depends on conditions outside the actor’s direct control' : 'uses a repeatable sequence without a separate race or unpredictable prerequisite'}.`,
      privileges_required: `Privileges Required is ${privilegesRequired} because the initial precondition ${privilegesRequired === 'N' ? 'does not require an authenticated identity' : privilegesRequired === 'L' ? 'starts from limited access rather than administration' : 'requires an administrative or control-plane context'}.`,
      user_interaction: `User Interaction is ${userInteraction} because the path ${userInteraction === 'R' ? 'requires a separate user or victim action' : 'can be completed by the actor without a separate user action'}.`
    }
  };
}

function formatRequestError(error) {
  const details = [error?.message || String(error)];
  if (error?.cause?.code) details.push(error.cause.code);
  if (error?.cause?.message && error.cause.message !== error.message) details.push(error.cause.message);
  return details.join(' — ');
}

function isNonRecoverableRequestError(error) {
  return /API key not set|(LLM|Anthropic) API error (400|401|403|404)\b|Configured LLM model .* is unavailable/i
    .test(error?.message || String(error));
}

async function callClaudeForThreat(threat, fetchImpl = fetch) {
  const params = {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(threat) }],
    tools: [buildAttackPathTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  };
  // Extended thinking only supported on Anthropic native API
  if (getConfig().provider === 'anthropic') {
    params.thinking = THINKING;
  }
  return callLLM(params, fetchImpl);
}

async function generateAttackPathForThreat(threat, fetchImpl) {
  let lastIssue = `the model returned free text or invalid JSON instead of ${TOOL_NAME}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await callClaudeForThreat(threat, fetchImpl);
      const attackPath = extractToolUse(response) || parseTextAttackPath(response);
      if (attackPath) {
        try {
          return validateAttackPathPayload(attackPath);
        } catch (error) {
          lastIssue = `invalid ${TOOL_NAME} payload (${error.message})`;
        }
      }
      console.warn(
        `Stage 6 ${threat.threat_id} attempt ${attempt + 1}/2 did not produce a valid attack path: ${lastIssue}`
      );
    } catch (error) {
      const details = formatRequestError(error);
      if (isNonRecoverableRequestError(error)) {
        throw new Error(`LLM request failed for ${threat.threat_id}: ${details}`);
      }
      lastIssue = `transient LLM request failure (${details})`;
      console.warn(`Stage 6 ${threat.threat_id} attempt ${attempt + 1}/2 failed: ${details}`);
    }
  }
  console.warn(`Using deterministic Stage 6 attack-path fallback for ${threat.threat_id} because ${lastIssue}.`);
  return validateAttackPathPayload(buildFallbackAttackPath(threat));
}

async function buildAttackPathsWithClaude(threats, options = {}) {
  ensureThreats(threats);

  const paths = [];
  const timestamp = options.timestamp || new Date().toISOString();
  for (let index = 0; index < threats.length; index += 1) {
    const threat = threats[index];
    console.log(`Stage 6 processing ${threat.threat_id} (${index + 1}/${threats.length})`);
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
  const preEnginePaths = await buildAttackPathsWithClaude(threats, { fetchImpl: options.fetchImpl });
  const attackPaths = enrichAttackPathsWithAFR(preEnginePaths);
  validateEnrichedAttackPaths(attackPaths);
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
  buildFallbackAttackPath,
  extractToolUse,
  enrichAttackPathsWithAFR,
  generateAttackPathForThreat,
  parseTextAttackPath,
  run,
  validateAttackPaths,
  validateEnrichedAttackPaths,
  validateAttackPathPayload,
  MAX_OUTPUT_TOKENS,
  THINKING
};
