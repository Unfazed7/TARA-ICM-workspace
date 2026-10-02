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

const { callLLM } = require('../llm-client');
const MODEL = 'claude-opus-4-8';
const TOOL_NAME = 'submit_threat';
const OWASP_REFERENCES = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10',
  'API1', 'API2', 'API3', 'API4', 'API5', 'API6', 'API7', 'API8', 'API9', 'API10'
];

const FALLBACK_THREAT_BY_PROPERTY = {
  confidentiality: {
    stride_category: 'information_disclosure',
    action: 'gain unauthorized access to data or responses exposed by',
    control_gap: 'access-control or data-exposure safeguards are bypassed',
    owasp_reference: 'A01'
  },
  integrity: {
    stride_category: 'tampering',
    action: 'alter data, configuration, or processing performed by',
    control_gap: 'integrity validation or change controls are bypassed',
    owasp_reference: 'A08'
  },
  availability: {
    stride_category: 'denial_of_service',
    action: 'exhaust, block, or disable',
    control_gap: 'availability and resource-protection controls are insufficient',
    owasp_reference: 'API4'
  },
  authenticity: {
    stride_category: 'spoofing',
    action: 'impersonate a trusted identity or source accepted by',
    control_gap: 'identity verification controls are bypassed',
    owasp_reference: 'A07'
  },
  authorization: {
    stride_category: 'elevation_of_privilege',
    action: 'invoke privileged operations through',
    control_gap: 'authorization enforcement is bypassed',
    owasp_reference: 'A01'
  },
  non_repudiation: {
    stride_category: 'repudiation',
    action: 'remove or falsify activity evidence recorded by',
    control_gap: 'audit-trail integrity and accountability controls are bypassed',
    owasp_reference: 'A09'
  }
};

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
    'Derive exactly one threat for the provided damage scenario.',
    'Write the threat as one flowing sentence with three parts: (1) what the attacker first does or gains access to, (2) what they do next and what specific gap or missing control allows it, (3) the outcome — stated as what actually results, not as a declared intention.',
    'Use plain language. Do not end with "with the goal of" — state the outcome as the natural consequence of the action.',
    'The threat must be specific to this asset. Self-test: could this statement apply unchanged to a different asset? If yes, rederive it around the mechanism unique to this asset.',
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

function isUsableThreatPayload(threat) {
  return Boolean(
    threat
    && STRIDE_CATEGORIES.includes(threat.stride_category)
    && typeof threat.threat_statement === 'string'
    && threat.threat_statement.trim()
    && typeof threat.derivation_note === 'string'
    && threat.derivation_note.trim()
    && (threat.owasp_reference == null || OWASP_REFERENCES.includes(threat.owasp_reference))
  );
}

function buildFallbackThreat(damageScenario, fallbackReason) {
  const mapping = FALLBACK_THREAT_BY_PROPERTY[damageScenario.property];
  if (!mapping) {
    throw new Error(
      `Cannot derive fallback threat for unsupported property ${damageScenario.property} on ${damageScenario.damage_id}`
    );
  }

  return {
    stride_category: mapping.stride_category,
    threat_statement: [
      `An attacker could ${mapping.action} ${damageScenario.asset_title} after ${mapping.control_gap},`,
      `resulting in the damage described by ${damageScenario.damage_id}: ${damageScenario.damage_scenario}`
    ].join(' '),
    derivation_note: [
      `${damageScenario.property} maps to ${mapping.stride_category} under the STRIDE taxonomy.`,
      fallbackReason
        ? `This deterministic fallback was used because ${fallbackReason}.`
        : `This deterministic fallback was used because the model did not return the required ${TOOL_NAME} tool call after two attempts.`
    ].join(' '),
    owasp_reference: mapping.owasp_reference
  };
}

function formatRequestError(error) {
  const details = [error?.message || String(error)];
  if (error?.cause?.code) details.push(error.cause.code);
  if (error?.cause?.message && error.cause.message !== error.message) {
    details.push(error.cause.message);
  }
  return details.join(' — ');
}

function isNonRecoverableRequestError(error) {
  const message = error?.message || String(error);
  return /API key not set|LLM API error (400|401|403|404)\b/i.test(message);
}

function ensureAssetTitleInStatement(statement, assetTitle) {
  const trimmed = String(statement || '').trim();
  if (trimmed.includes(assetTitle)) return trimmed;
  return `${assetTitle}: ${trimmed}`;
}

async function callClaudeForDamageScenario(damageScenario, fetchImpl = fetch) {
  return callLLM({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(damageScenario) }],
    tools: [buildThreatTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  }, fetchImpl);
}

async function generateThreatForDamageScenario(damageScenario, fetchImpl) {
  let lastRequestError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await callClaudeForDamageScenario(damageScenario, fetchImpl);
      const threat = extractToolUse(response);
      if (isUsableThreatPayload(threat)) return threat;
      lastRequestError = null;
    } catch (error) {
      lastRequestError = error;
    }
  }
  if (lastRequestError) {
    const formattedError = formatRequestError(lastRequestError);
    if (isNonRecoverableRequestError(lastRequestError)) {
      throw new Error(
        `LLM request failed for ${damageScenario.damage_id} after two attempts: ${formattedError}`
      );
    }
    return buildFallbackThreat(
      damageScenario,
      `the LLM request failed twice (${formattedError})`
    );
  }
  return buildFallbackThreat(damageScenario);
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
      threat_statement: ensureAssetTitleInStatement(threat.threat_statement, scenario.asset_title),
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
    stage_num: 5,
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
  buildFallbackThreat,
  ensureAssetTitleInStatement,
  isUsableThreatPayload,
  buildThreatTool,
  buildThreatsWithClaude,
  buildUserMessage,
  callClaudeForDamageScenario,
  extractToolUse,
  generateThreatForDamageScenario,
  run,
  validateThreats
};
