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

function parseTextImpact(response) {
  const text = (response?.content || [])
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const candidates = [
    fenced?.[1],
    firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : null,
    text
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed?.impact_analysis)) return parsed.impact_analysis[0] || null;
      return parsed;
    } catch {
      // Try the next representation; prose-only responses fall back below.
    }
  }
  return null;
}

function isUsableTextImpact(impact) {
  if (!impact || typeof impact.impact_narrative !== 'string' || !impact.impact_narrative.trim()) return false;
  const toolUser = impact.tool_user;
  const others = impact.other_stakeholders;
  if (!toolUser || !others) return false;
  const ratings = [
    toolUser.privacy,
    toolUser.operational,
    others.legal,
    others.financial,
    others.business
  ];
  if (!ratings.every((rating) => RATINGS.includes(rating))) return false;
  return [
    toolUser.rationale_privacy,
    toolUser.rationale_operational,
    others.rationale_legal,
    others.rationale_financial,
    others.rationale_business
  ].every((rationale) => typeof rationale === 'string' && rationale.trim());
}

function isCompleteToolImpact(impact) {
  if (!impact || typeof impact.impact_narrative !== 'string' || !impact.impact_narrative.trim()) return false;
  const toolUser = impact.tool_user;
  const others = impact.other_stakeholders;
  if (!toolUser || !others) return false;
  return [
    toolUser.privacy,
    toolUser.operational,
    toolUser.rationale_privacy,
    toolUser.rationale_operational,
    others.legal,
    others.financial,
    others.business,
    others.rationale_legal,
    others.rationale_financial,
    others.rationale_business
  ].every((value) => typeof value === 'string' && value.trim());
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function buildFallbackImpact(threat, damageScenario, fallbackReason) {
  const text = `${damageScenario.damage_scenario} ${threat.threat_statement}`.toLowerCase();
  const affectsOrganization = damageScenario.stakeholder_affected !== 'tool_user';
  const hasExposure = includesAny(text, [
    /\bdisclos/, /\bexpos/, /\bextract/, /accessed without authorization/, /\breveal/, /\bleak/,
    /\breadable\b/, /\bretrieve\b/, /\bserved to\b/, /\boutside (?:their|the) permitted scope\b/,
    /\bother tenants?\b/, /\blaid bare\b/, /\bno longer (?:exists|separate)\b/
  ]);
  const sensitiveExposure = includesAny(text, [
    /personal/, /credential/, /token/, /identity/, /authentication/, /session/, /sensitive/,
    /vehicle identifiers?/, /tenant.*data/, /diagnostic.*data/, /work-order/, /cloud identity/
  ]);
  const majorOperational = includesAny(text, [
    /\bunavailable/, /complete interruption/, /no practical workaround/, /\bhalts?\b/, /\bdisabled?\b/,
    /\bunreachable\b/, /\bstop working\b/, /\bno alternate\b/, /\bunmanageable\b/, /\bunusable\b/,
    /\bno new .+ can be\b/, /\bcannot be (?:updated|repaired|completed|performed)\b/
  ]);
  const moderateOperational = includesAny(text, [
    /\bdisrupt/, /\bdegrad/, /\bdelay/, /\bretr/, /incorrect/, /unauthorized/, /without valid/,
    /\baltered?\b/, /\bmodified\b/, /\bfails? to\b/, /\bskipped\b/, /cannot be relied/,
    /\bfalse basis\b/, /\bwrong\b/, /\boutside (?:their|the) permitted scope\b/
  ]);
  const explicitFinancial = includesAny(text, [
    /financial (?:loss|impact|cost)/,
    /monetary (?:loss|impact|cost)/,
    /(?:revenue|budget) (?:loss|impact|reduction)/,
    /(?:incident response|recovery|remediation|service outage) costs?/
  ]);
  const majorFinancial = explicitFinancial && includesAny(text, [
    /substantial/, /major/, /long-term/, /catastrophic/, /survival/
  ]);
  const majorLegal = includesAny(text, [
    /criminal liability/, /operating licen[cs]e/, /significant fines?/, /lawsuits?/, /contractual breach/
  ]);
  const moderateLegal = includesAny(text, [
    /regulat/, /\blegal/, /compliance/, /unauthorized/, /privacy/, /personal data/,
    /other tenants?/, /outside (?:their|the) permitted scope/
  ]);
  const majorBusiness = includesAny(text, [
    /customer churn/, /market share/, /major reputational/, /at scale/, /shutdown/, /irreversible/
  ]);
  const moderateBusiness = includesAny(text, [
    /trust/, /reputation/, /customer/, /service operations?/, /business/, /workflow/, /\boperations?\b/
  ]);

  const materiallyAffectsOrganization = affectsOrganization && (
    ['confidentiality', 'integrity', 'availability', 'authenticity', 'authorization', 'non_repudiation']
      .includes(damageScenario.property)
    || hasExposure
    || majorOperational
    || moderateOperational
  );

  const privacy = hasExposure ? (sensitiveExposure ? 'Major' : 'Moderate') : 'Negligible';
  const operational = majorOperational ? 'Major' : moderateOperational ? 'Moderate' : 'Negligible';
  const legal = affectsOrganization
    ? (majorLegal ? 'Major' : (moderateLegal || hasExposure) ? 'Moderate' : 'Negligible')
    : 'Negligible';
  const financial = affectsOrganization && explicitFinancial ? (majorFinancial ? 'Major' : 'Moderate') : 'Negligible';
  const business = affectsOrganization
    ? (majorBusiness ? 'Major' : (moderateBusiness || materiallyAffectsOrganization) ? 'Moderate' : 'Negligible')
    : 'Negligible';
  const reason = fallbackReason || `the model did not return the required ${TOOL_NAME} tool call after two attempts`;

  return {
    impact_narrative: `${threat.asset_title} is compromised through ${String(threat.stride_category).replace(/_/g, ' ')}, causing this consequence: ${damageScenario.damage_scenario}`,
    tool_user: {
      privacy,
      operational,
      rationale_privacy: privacy === 'Negligible'
        ? 'The damage scenario contains no explicit exposure of personal, work-related, session, identity, vehicle, or tenant data.'
        : `The damage scenario explicitly describes ${sensitiveExposure ? 'sensitive' : 'limited'} data exposure affecting users or tenant data.`,
      rationale_operational: operational === 'Negligible'
        ? 'The damage scenario contains no explicit loss or degradation of a user-facing workflow, service, update, or operation.'
        : `The described loss or degradation of service and operational capability has a ${operational.toLowerCase()} effect.`,
    },
    other_stakeholders: {
      legal,
      financial,
      business,
      rationale_legal: legal === 'Negligible'
        ? 'No explicit organizational legal or regulatory consequence is described.'
        : `The organizational consequence contains legal, compliance, or unauthorized-action indicators rated ${legal.toLowerCase()}.`,
      rationale_financial: financial === 'Negligible'
        ? 'No explicit financial loss, revenue impact, or direct monetary cost is described.'
        : `The damage scenario explicitly describes a ${financial.toLowerCase()} financial consequence for the organization.`,
      rationale_business: business === 'Negligible'
        ? 'No explicit organizational business, customer, or service consequence is described.'
        : `The described service or business disruption has a ${business.toLowerCase()} organizational impact.`
    },
    fallback_reason: reason
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
  let lastRequestError = null;
  let lastResponseIssue = `the model returned free text or invalid JSON instead of ${TOOL_NAME}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await callClaudeForThreat(threat, damageScenario, fetchImpl);
      const toolImpact = extractToolUse(response);
      if (toolImpact && isCompleteToolImpact(toolImpact)) return toolImpact;
      if (toolImpact) {
        lastResponseIssue = `the model returned an incomplete ${TOOL_NAME} payload`;
      }
      const textImpact = parseTextImpact(response);
      if (isUsableTextImpact(textImpact)) return textImpact;
      if (!toolImpact && textImpact) {
        lastResponseIssue = 'the model returned JSON that does not satisfy the impact-analysis contract';
      }
      lastRequestError = null;
    } catch (error) {
      lastRequestError = error;
    }
  }
  if (lastRequestError && isNonRecoverableRequestError(lastRequestError)) {
    throw new Error(
      `LLM request failed for ${threat.threat_id} after two attempts: ${formatRequestError(lastRequestError)}`
    );
  }
  const fallbackReason = lastRequestError
    ? `the LLM request failed twice (${formatRequestError(lastRequestError)})`
    : lastResponseIssue;
  console.warn(
    `Using deterministic Stage 7 impact fallback for existing threat ${threat.threat_id} because ${fallbackReason}.`
  );
  return buildFallbackImpact(threat, damageScenario, fallbackReason);
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
  buildFallbackImpact,
  buildImpactTool,
  buildSystemPrompt,
  buildUserMessage,
  callClaudeForThreat,
  extractToolUse,
  parseTextImpact,
  generateImpactForThreat,
  run,
  validateImpactAnalysis
};
