'use strict';

const fs = require('fs');
const path = require('path');
const {
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
const TOOL_NAME = 'submit_treatment';
const TREATMENT_OPTIONS = ['reduce', 'accept', 'share', 'avoid'];
const RISK_LEVELS = ['informational', 'low', 'medium', 'high', 'critical'];
const ACCEPTABLE_RISK_LEVELS = new Set(['informational', 'low']);
const CAL_TABLE = { informational: 1, low: 1, medium: 2, high: 3, critical: 4 };
const CONTROL_TYPES = ['preventive', 'detective', 'corrective'];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function buildTreatmentTool() {
  return {
    name: TOOL_NAME,
    description: 'Submit the risk treatment decision for one RSK_## record',
    input_schema: {
      type: 'object',
      required: [
        'treatment_option',
        'treatment_rationale',
        'goal_statement',
        'goal_self_test_note',
        'claim_statement',
        'acceptance_basis',
        'control_ids',
        'control_assignment_rationales',
        'avoidance_action',
        'residual_risk_expected'
      ],
      properties: {
        treatment_option: { type: 'string', enum: TREATMENT_OPTIONS },
        treatment_rationale: { type: 'string' },
        goal_statement: { type: ['string', 'null'] },
        goal_self_test_note: { type: ['string', 'null'] },
        claim_statement: { type: ['string', 'null'] },
        acceptance_basis: { type: ['string', 'null'] },
        control_ids: {
          type: 'array',
          items: { type: 'string', pattern: '^CTR_\\d{2,}$' },
          maxItems: 3
        },
        control_assignment_rationales: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 3
        },
        avoidance_action: { type: ['string', 'null'] },
        residual_risk_expected: { type: 'string', enum: RISK_LEVELS }
      }
    }
  };
}

function buildSystemPrompt(controlsCatalogue, webTaraConstraints) {
  return [
    controlsCatalogue,
    webTaraConstraints,
    'Goal writing rules:',
    '1. Structure: "The [Asset Title] SHALL [specific security behavior] to protect [CIAAAN property] against [specific attack mechanism from AT_##]."',
    '2. SHALL, not SHALL NOT: State what the system must do, not what it must prevent.',
    '3. Asset-specific: Must reference the exact asset_title.',
    '4. Mechanism-specific: Must reference the attack mechanism from AT_## attack_description or step_2_abuse_technique.',
    '5. Verifiable: The goal must describe behavior that can be tested.',
    '6. No attacker language: Describe the mechanism, not the actor.',
    'Claim writing rules:',
    '1. Structure: "The risk of [threat from TH_## statement] affecting [Asset Title] [CIAAAN property] is accepted because [specific numerical justification]."',
    '2. Cite all four numbers: afr_label (AFR=afr_value), impact_rating_label (score=impact_rating_value), risk_score, and risk_level.',
    '3. State threshold conformance explicitly: classified as [level], within the project acceptance threshold of <= low.',
    '4. Threat-specific: Must reference the specific TH_## threat mechanism.',
    '5. No future controls: A claim does not promise future controls or mitigations.',
    '6. Unique: Each CC_## must be distinct.',
    'CAL table: informational=1, low=1, medium=2, high=3, critical=4.',
    'Only `informational` or `low` risk levels may be accepted. Medium, high, and critical MUST be reduced, shared, or avoided.',
    'Control selection rules:',
    'Select 1-3 controls from the catalogue that most directly address the specific attack mechanism in the AT_## attack path.',
    'Do not select controls by asset type or CIAAAN property alone.',
    'Prefer combining preventive + detective controls over 2 preventive controls for the same mechanism.',
    'Controls sourced from the catalogue only (CTR_01 to CTR_89). Do not invent new control IDs.',
    'For share treatments: at least one assigned control must be a third-party or cloud provider control (Family F or G).',
    `Return only via the ${TOOL_NAME} tool.`
  ].join('\n\n');
}

function parseControlsCatalogue(markdown) {
  const controls = new Map();
  let currentFamily = null;
  let current = null;

  for (const line of markdown.split(/\r?\n/)) {
    const familyMatch = line.match(/^# FAMILY ([A-Z])\b/);
    if (familyMatch) currentFamily = familyMatch[1];

    const headerMatch = line.match(/^##\s+(CTR_\d{2,})\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[2].replace(/^[\s\-\u2013\u2014]+/, '').trim();
      current = { id: headerMatch[1], title, family: currentFamily };
      continue;
    }

    const typeMatch = line.match(/\*\*Type:\*\*\s*([a-z]+)/);
    if (typeMatch && current) {
      const type = typeMatch[1];
      if (!CONTROL_TYPES.includes(type)) throw new Error(`Invalid control type for ${current.id}: ${type}`);
      controls.set(current.id, { title: current.title, type, family: current.family });
      current = null;
    }
  }

  return controls;
}

function buildRiskChains(inputs) {
  const risks = inputs.riskRegister;
  const threats = new Map(inputs.threats.map((item) => [item.threat_id, item]));
  const damage = new Map(inputs.damageScenarios.map((item) => [item.damage_id, item]));
  const attacks = new Map(inputs.attacks.map((item) => [item.attack_id, item]));
  const impacts = new Map(inputs.impacts.map((item) => [item.impact_id, item]));
  const assets = new Map(inputs.assets.map((item) => [item.asset_id, item]));

  for (const attack of inputs.attacks) {
    if (attack.afr_value === null || attack.afr_value === undefined) {
      throw new Error(`afr_value not computed for ${attack.attack_id} - run cvss-afr-calc first`);
    }
  }

  return risks.map((risk) => {
    const threat = threats.get(risk.threat_id);
    const damageScenario = damage.get(risk.damage_scenario_id);
    const attack = attacks.get(risk.attack_id);
    const impact = impacts.get(risk.impact_id);
    const asset = assets.get(risk.asset_id);
    if (!threat) throw new Error(`Missing threat for ${risk.risk_id}`);
    if (!damageScenario) throw new Error(`Missing damage scenario for ${risk.risk_id}`);
    if (!attack) throw new Error(`Missing attack path for ${risk.risk_id}`);
    if (!impact) throw new Error(`Missing impact record for ${risk.risk_id}`);
    if (!asset) throw new Error(`Missing asset for ${risk.risk_id}`);
    return { risk, threat, damageScenario, attack, impact, asset };
  });
}

function buildUserMessage(chain) {
  const { risk, impact, attack, threat, damageScenario, asset } = chain;
  return [
    `RSK: ${risk.risk_id}, score=${risk.risk_score}, level=${risk.risk_level}, rank=${risk.risk_rank}`,
    `IM: ${impact.impact_id}`,
    `Impact narrative: ${impact.impact_narrative}`,
    `Tool user ratings: ${JSON.stringify(impact.tool_user)}`,
    `Other stakeholder ratings: ${JSON.stringify(impact.other_stakeholders)}`,
    `AT: ${attack.attack_id}`,
    `Attack description: ${attack.attack_description}`,
    `Attack path: ${JSON.stringify(attack.attack_path)}`,
    `CVSS metrics: ${JSON.stringify(attack.cvss_metrics)}`,
    `AFR: ${attack.afr_label} (${attack.afr_value})`,
    `CVSS justifications: ${JSON.stringify(attack.justifications)}`,
    `TH: ${threat.threat_id}`,
    `Threat statement: ${threat.threat_statement}`,
    `STRIDE category: ${threat.stride_category}`,
    `Derivation note: ${threat.derivation_note}`,
    `DS: ${damageScenario.damage_id}`,
    `Damage scenario: ${damageScenario.damage_scenario}`,
    `Stakeholder affected: ${damageScenario.stakeholder_affected}`,
    `Property: ${damageScenario.property}`,
    `AS: ${asset.asset_id}`,
    `Asset title: ${asset.asset_title}`,
    `Asset type: ${asset.asset_type}`,
    `CIAAAN flags: ${JSON.stringify(asset.ciaaan)}`
  ].join('\n');
}

function extractToolUse(response) {
  const content = response?.content || [];
  const toolUse = content.find((item) => item.type === 'tool_use' && item.name === TOOL_NAME);
  return toolUse?.input || null;
}

function parseTextTreatment(response) {
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

async function callClaudeForRiskChain(chain, systemPrompt, fetchImpl = fetch) {
  return callLLM({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: buildUserMessage(chain) }],
    tools: [buildTreatmentTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  }, fetchImpl);
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

async function generateTreatmentForChain(chain, systemPrompt, fetchImpl, options = {}) {
  let lastIssue = `the model returned free text or invalid JSON instead of ${TOOL_NAME}`;
  let lastRequestError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await callClaudeForRiskChain(chain, systemPrompt, fetchImpl);
      const treatment = extractToolUse(response) || parseTextTreatment(response);
      if (treatment) {
        try {
          if (options.validate) options.validate(treatment);
          return treatment;
        } catch (error) {
          lastIssue = `the model returned an invalid ${TOOL_NAME} payload (${error.message})`;
        }
      }
      lastRequestError = null;
    } catch (error) {
      lastRequestError = error;
    }
  }

  if (lastRequestError && isNonRecoverableRequestError(lastRequestError)) {
    throw new Error(
      `LLM request failed for ${chain.risk.risk_id} after two attempts: ${formatRequestError(lastRequestError)}`
    );
  }

  const fallbackReason = lastRequestError
    ? `the LLM request failed twice (${formatRequestError(lastRequestError)})`
    : lastIssue;
  if (options.fallback) {
    console.warn(
      `Using deterministic Stage 9 treatment fallback for ${chain.risk.risk_id} because ${fallbackReason}.`
    );
    return options.fallback(fallbackReason);
  }
  throw new Error(`Model did not return a valid ${TOOL_NAME} payload for ${chain.risk.risk_id}: ${fallbackReason}`);
}

function deriveCAL(riskLevel) {
  return CAL_TABLE[riskLevel];
}

function validateAcceptance(riskRecord, treatmentOption) {
  if (treatmentOption === 'accept' && !ACCEPTABLE_RISK_LEVELS.has(riskRecord.risk_level)) {
    throw new Error(`Cannot accept ${riskRecord.risk_level} risk for ${riskRecord.risk_id} - only informational/low risks may be accepted`);
  }
}

function hydrateControls(controlIds, rationales, catalogueMap, treatmentId) {
  if (controlIds.length !== rationales.length) {
    throw new Error(`control_ids length must match control_assignment_rationales length in ${treatmentId}`);
  }
  return controlIds.map((controlId, index) => {
    const control = catalogueMap.get(controlId);
    if (!control) throw new Error(`${controlId} not found in controls catalogue`);
    const assignmentRationale = rationales[index];
    if (!assignmentRationale) throw new Error(`Empty assignment_rationale for ${controlId} in ${treatmentId}`);
    return {
      control_id: controlId,
      control_title: control.title,
      control_type: control.type,
      assignment_rationale: assignmentRationale
    };
  });
}

function buildTreatmentRecord(toolArgs, chain, catalogueMap, counters, timestamp) {
  const risk = chain.risk;
  const option = toolArgs.treatment_option;
  validateAcceptance(risk, option);
  const treatmentId = formatId('TRT', counters.treatments++);
  const controlIds = Array.isArray(toolArgs.control_ids) ? toolArgs.control_ids : [];
  const rationales = Array.isArray(toolArgs.control_assignment_rationales) ? toolArgs.control_assignment_rationales : [];
  const cal = deriveCAL(risk.risk_level);
  const controlsAssigned = hydrateControls(controlIds, rationales, catalogueMap, treatmentId);

  let cybersecurityGoal = null;
  let cybersecurityClaim = null;
  let avoidanceAction = null;

  if (['reduce', 'share'].includes(option)) {
    if (!toolArgs.goal_statement) throw new Error(`Goal required for ${option} treatment in ${treatmentId}`);
    if (!toolArgs.goal_self_test_note) throw new Error(`Self-test note required in ${treatmentId}`);
    if (controlsAssigned.length < 1 || controlsAssigned.length > 3) {
      throw new Error(`Controls required for ${option} treatment in ${treatmentId}`);
    }
    if (option === 'share' && !controlIds.some((controlId) => ['F', 'G'].includes(catalogueMap.get(controlId)?.family))) {
      throw new Error(`Share treatment in ${treatmentId} requires a Family F or G control`);
    }
    cybersecurityGoal = {
      goal_id: formatId('CG', counters.goals++),
      goal_statement: toolArgs.goal_statement,
      cal,
      cal_rationale: `CAL ${cal} derived from ${risk.risk_level} risk level for ${risk.risk_id}.`,
      self_test_note: toolArgs.goal_self_test_note
    };
  } else if (option === 'accept') {
    if (!toolArgs.claim_statement) throw new Error(`Claim required for accept treatment in ${treatmentId}`);
    if (!toolArgs.acceptance_basis) throw new Error(`Acceptance basis required for accept treatment in ${treatmentId}`);
    if (controlsAssigned.length !== 0) throw new Error(`Controls must be empty for accept treatment in ${treatmentId}`);
    cybersecurityClaim = {
      claim_id: formatId('CC', counters.claims++),
      claim_statement: toolArgs.claim_statement,
      acceptance_basis: toolArgs.acceptance_basis
    };
  } else if (option === 'avoid') {
    if (!toolArgs.avoidance_action) throw new Error(`Avoidance action required for avoid treatment in ${treatmentId}`);
    if (controlsAssigned.length !== 0) throw new Error(`Controls must be empty for avoid treatment in ${treatmentId}`);
    avoidanceAction = toolArgs.avoidance_action;
  }

  return {
    treatment_id: treatmentId,
    risk_id: risk.risk_id,
    threat_id: risk.threat_id,
    damage_scenario_id: risk.damage_scenario_id,
    attack_id: risk.attack_id,
    impact_id: risk.impact_id,
    asset_id: risk.asset_id,
    treatment_option: option,
    treatment_rationale: toolArgs.treatment_rationale,
    cybersecurity_goal: cybersecurityGoal,
    cybersecurity_claim: cybersecurityClaim,
    controls_assigned: controlsAssigned,
    avoidance_action: avoidanceAction,
    cal,
    residual_risk_expected: toolArgs.residual_risk_expected,
    created_timestamp: timestamp
  };
}

function validateTreatments(treatments, chains, catalogueMap) {
  if (treatments.length !== chains.length) throw new Error('1 TRT_## per RSK_## required');
  const riskIds = new Set(chains.map((chain) => chain.risk.risk_id));
  const goalIds = new Set();
  const claimIds = new Set();

  for (const treatment of treatments) {
    if (!riskIds.has(treatment.risk_id)) throw new Error(`Unknown risk_id for ${treatment.treatment_id}`);
    if (!TREATMENT_OPTIONS.includes(treatment.treatment_option)) {
      throw new Error(`Invalid treatment_option in ${treatment.treatment_id}`);
    }
    const chain = chains.find((item) => item.risk.risk_id === treatment.risk_id);
    validateAcceptance(chain.risk, treatment.treatment_option);
    if (treatment.cal !== deriveCAL(chain.risk.risk_level)) throw new Error(`CAL mismatch in ${treatment.treatment_id}`);
    if (!RISK_LEVELS.includes(treatment.residual_risk_expected)) throw new Error(`Invalid residual_risk_expected in ${treatment.treatment_id}`);
    if (!treatment.treatment_rationale) throw new Error(`Empty treatment_rationale in ${treatment.treatment_id}`);

    if (['reduce', 'share'].includes(treatment.treatment_option)) {
      if (!treatment.cybersecurity_goal) throw new Error(`Goal required for ${treatment.treatment_option} treatment in ${treatment.treatment_id}`);
      if (treatment.cybersecurity_claim !== null) throw new Error(`Claim must be null for ${treatment.treatment_option} treatment in ${treatment.treatment_id}`);
      if (treatment.controls_assigned.length < 1 || treatment.controls_assigned.length > 3) {
        throw new Error(`Controls required for ${treatment.treatment_option} treatment in ${treatment.treatment_id}`);
      }
      if (!treatment.cybersecurity_goal.goal_statement) throw new Error(`Empty goal statement in ${treatment.treatment_id}`);
      if (!treatment.cybersecurity_goal.self_test_note) throw new Error(`Self-test note required in ${treatment.treatment_id}`);
      if (goalIds.has(treatment.cybersecurity_goal.goal_id)) throw new Error(`Duplicate goal_id ${treatment.cybersecurity_goal.goal_id}`);
      goalIds.add(treatment.cybersecurity_goal.goal_id);
    }

    if (treatment.treatment_option === 'accept') {
      if (treatment.cybersecurity_goal !== null) throw new Error(`Goal must be null for accept treatment in ${treatment.treatment_id}`);
      if (!treatment.cybersecurity_claim) throw new Error(`Claim required for accept treatment in ${treatment.treatment_id}`);
      if (treatment.controls_assigned.length !== 0) throw new Error(`Controls must be empty for accept treatment in ${treatment.treatment_id}`);
      const claim = treatment.cybersecurity_claim.claim_statement;
      if (!claim) throw new Error(`Empty claim statement in ${treatment.treatment_id}`);
      if (!claim.includes(String(chain.risk.afr_value)) || !claim.includes(String(chain.risk.risk_score))) {
        throw new Error(`Claim must cite AFR value and risk score in ${treatment.treatment_id}`);
      }
      if (claimIds.has(treatment.cybersecurity_claim.claim_id)) throw new Error(`Duplicate claim_id ${treatment.cybersecurity_claim.claim_id}`);
      claimIds.add(treatment.cybersecurity_claim.claim_id);
    }

    if (treatment.treatment_option === 'avoid') {
      if (treatment.cybersecurity_goal !== null) throw new Error(`Goal must be null for avoid treatment in ${treatment.treatment_id}`);
      if (treatment.cybersecurity_claim !== null) throw new Error(`Claim must be null for avoid treatment in ${treatment.treatment_id}`);
      if (!treatment.avoidance_action) throw new Error(`Avoidance action required for avoid treatment in ${treatment.treatment_id}`);
    }

    for (const control of treatment.controls_assigned) {
      if (!catalogueMap.has(control.control_id)) throw new Error(`${control.control_id} not found in controls catalogue`);
      if (!control.assignment_rationale) throw new Error(`Empty assignment_rationale for ${control.control_id} in ${treatment.treatment_id}`);
    }
  }
}

const FALLBACK_CONTROLS_BY_STRIDE = {
  spoofing: ['CTR_01', 'CTR_11'],
  tampering: ['CTR_34', 'CTR_58'],
  repudiation: ['CTR_57', 'CTR_59'],
  information_disclosure: ['CTR_50', 'CTR_54'],
  denial_of_service: ['CTR_32', 'CTR_33'],
  elevation_of_privilege: ['CTR_16', 'CTR_22']
};

const FALLBACK_MECHANISM_BY_STRIDE = {
  spoofing: 'unverified identities and credential replay',
  tampering: 'unauthorized configuration or data modifications',
  repudiation: 'security-relevant actions without tamper-evident attribution',
  information_disclosure: 'unauthorized retrieval of sensitive data and credentials',
  denial_of_service: 'resource-exhaustion requests and connection floods',
  elevation_of_privilege: 'requests that exceed the authenticated identity and authorization scope'
};

function selectFallbackControlIds(chain, catalogueMap) {
  const text = `${chain.attack.attack_description || ''} ${JSON.stringify(chain.attack.attack_path || {})}`.toLowerCase();
  let controlIds = FALLBACK_CONTROLS_BY_STRIDE[chain.threat.stride_category] || ['CTR_36', 'CTR_61'];

  if (/flood|rate limit|resource exhaustion|held-open|connection/.test(text)) {
    controlIds = ['CTR_32', 'CTR_33'];
  } else if (/rbac|authorization|privilege|permission|tenant/.test(text)) {
    controlIds = ['CTR_16', 'CTR_22'];
  } else if (/secret|token|credential|metadata|imds/.test(text)) {
    controlIds = ['CTR_55', 'CTR_63'];
  } else if (/configuration|xds|container|runtime|image|node|pipeline/.test(text)) {
    controlIds = ['CTR_72', 'CTR_74'];
  } else if (/inject|schema|input|payload/.test(text)) {
    controlIds = ['CTR_42', 'CTR_58'];
  }

  const available = controlIds.filter((controlId) => catalogueMap.has(controlId));
  if (available.length > 0) return available.slice(0, 2);
  return [...catalogueMap.keys()].slice(0, 1);
}

function buildFallbackTreatment(chain, catalogueMap) {
  const { risk, threat, attack, damageScenario, asset } = chain;
  const option = ACCEPTABLE_RISK_LEVELS.has(risk.risk_level) ? 'accept' : 'reduce';
  const residualRiskExpected = risk.risk_level === 'critical'
    ? 'high'
    : risk.risk_level === 'high'
      ? 'medium'
      : risk.risk_level === 'medium'
        ? 'low'
        : risk.risk_level;

  if (option === 'accept') {
    return {
      treatment_option: 'accept',
      treatment_rationale: `${risk.risk_id} is ${risk.risk_level} with score ${risk.risk_score}, which is within the project acceptance threshold of low or below.`,
      goal_statement: null,
      goal_self_test_note: null,
      claim_statement: `The risk of ${threat.threat_statement} affecting ${asset.asset_title} ${damageScenario.property} is accepted because AFR is ${risk.afr_label} (AFR=${risk.afr_value}), impact is ${risk.impact_rating_label} (score=${risk.impact_rating_value}), risk_score is ${risk.risk_score}, and risk_level is ${risk.risk_level}, which is within the project acceptance threshold of <= low.`,
      acceptance_basis: `${risk.risk_id} is classified ${risk.risk_level}, within the documented acceptance threshold of informational or low.`,
      control_ids: [],
      control_assignment_rationales: [],
      avoidance_action: null,
      residual_risk_expected: residualRiskExpected
    };
  }

  const controlIds = selectFallbackControlIds(chain, catalogueMap);
  const controlTitles = controlIds.map((controlId) => catalogueMap.get(controlId).title);
  const mechanism = FALLBACK_MECHANISM_BY_STRIDE[threat.stride_category]
    || `the attack mechanism documented in ${attack.attack_id}`;
  return {
    treatment_option: 'reduce',
    treatment_rationale: `${risk.risk_id} is ${risk.risk_level} with score ${risk.risk_score}; reducing the likelihood of ${mechanism} is required before residual-risk acceptance.`,
    goal_statement: `The ${asset.asset_title} SHALL enforce ${controlTitles.join(' and ')} to protect ${damageScenario.property} against ${mechanism}.`,
    goal_self_test_note: `Verify that the controls are enforced specifically on ${asset.asset_title} and prevent or detect the ${attack.attack_id} mechanism; a generic control applied only to another asset does not satisfy this goal.`,
    claim_statement: null,
    acceptance_basis: null,
    control_ids: controlIds,
    control_assignment_rationales: controlIds.map((controlId) =>
      `${catalogueMap.get(controlId).title} directly reduces or detects ${mechanism} in ${attack.attack_id}.`
    ),
    avoidance_action: null,
    residual_risk_expected: residualRiskExpected
  };
}

function summarizeTreatments(treatments) {
  return {
    total_treatments: treatments.length,
    treatment_distribution: countBy(treatments, 'treatment_option'),
    total_goals: treatments.filter((treatment) => treatment.cybersecurity_goal).length,
    total_claims: treatments.filter((treatment) => treatment.cybersecurity_claim).length,
    total_controls_assigned: treatments.reduce((sum, treatment) => sum + treatment.controls_assigned.length, 0),
    cal_distribution: countBy(treatments, 'cal')
  };
}

async function buildRiskTreatments(inputs, options = {}) {
  const configDir = path.resolve(__dirname, '../../_config');
  const controlsCatalogue = options.controlsCatalogue || readText(path.join(configDir, 'controls-catalogue.md'));
  const webTaraConstraints = options.webTaraConstraints || readText(path.join(configDir, 'web-tara-constraints.md'));
  const catalogueMap = parseControlsCatalogue(controlsCatalogue);
  const chains = buildRiskChains(inputs);
  const systemPrompt = buildSystemPrompt(controlsCatalogue, webTaraConstraints);
  const counters = { treatments: 0, goals: 0, claims: 0 };
  const timestamp = options.timestamp || new Date().toISOString();
  const treatments = [];

  for (const chain of chains) {
    const validateCandidate = (candidate) => {
      const preview = buildTreatmentRecord(
        candidate,
        chain,
        catalogueMap,
        { ...counters },
        timestamp
      );
      validateTreatments([preview], [chain], catalogueMap);
    };
    const toolArgs = await generateTreatmentForChain(chain, systemPrompt, options.fetchImpl, {
      validate: validateCandidate,
      fallback: options.allowFallback
        ? () => buildFallbackTreatment(chain, catalogueMap)
        : undefined
    });
    treatments.push(buildTreatmentRecord(toolArgs, chain, catalogueMap, counters, timestamp));
  }

  validateTreatments(treatments, chains, catalogueMap);
  return treatments;
}

async function run(options) {
  const inputs = {
    riskRegister: readJson(options.riskRegister),
    threats: readJson(options.threats),
    damageScenarios: readJson(options.damageScenarios),
    attacks: readJson(options.attacks),
    impacts: readJson(options.impacts),
    assets: readJson(options.assets)
  };
  const treatments = await buildRiskTreatments(inputs, {
    fetchImpl: options.fetchImpl,
    allowFallback: true
  });
  writeJson(options.out, treatments);
  await submitCheckpoint(options.assessmentId, {
    stage_num: 9,
    stage_name: 'risk-treatment',
    output_summary: summarizeTreatments(treatments)
  });
  return treatments;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await run({
    riskRegister: requireFileArg(args, 'risk-register'),
    threats: requireFileArg(args, 'threats'),
    damageScenarios: requireFileArg(args, 'damage-scenarios'),
    attacks: requireFileArg(args, 'attacks'),
    impacts: requireFileArg(args, 'impacts'),
    assets: requireFileArg(args, 'assets'),
    assessmentId: requireFileArg(args, 'assessment-id'),
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
  ACCEPTABLE_RISK_LEVELS,
  CAL_TABLE,
  buildRiskChains,
  buildRiskTreatments,
  buildSystemPrompt,
  buildTreatmentRecord,
  buildTreatmentTool,
  buildUserMessage,
  callClaudeForRiskChain,
  deriveCAL,
  extractToolUse,
  parseTextTreatment,
  generateTreatmentForChain,
  hydrateControls,
  parseControlsCatalogue,
  buildFallbackTreatment,
  run,
  summarizeTreatments,
  validateAcceptance,
  validateTreatments
};
