'use strict';

const {
  RATINGS,
  assertRating,
  formatId,
  parseArgs,
  readJson,
  requireFileArg,
  writeJson
} = require('../agent-utils');

const FIXED_SAFETY_RATIONALE = 'Not applicable - web-based tools operate in software only and cannot directly cause physical harm to the tool user. Safety impacts from downstream vehicle effects are out of scope for web-based TARA.';
const FIXED_FINANCIAL_RATIONALE = 'Not applicable - web-based automotive tools do not handle the tool user personal financial transactions. Direct financial loss to the tool user is not a credible damage scenario for this system type.';

function buildImpactAnalysis(threats, damageScenarios, timestamp = new Date().toISOString()) {
  if (!Array.isArray(threats) || threats.length === 0) throw new Error('No threats to process');
  const damageById = new Map(damageScenarios.map((scenario) => [scenario.damage_id, scenario]));

  const impacts = threats.map((threat, index) => {
    const damage = damageById.get(threat.damage_scenario_id);
    if (!damage) throw new Error(`No damage scenario found for threat ${threat.threat_id}`);
    const ratings = ratingsForProperty(threat.property);
    return {
      impact_id: formatId('IM', index),
      threat_id: threat.threat_id,
      damage_scenario_id: threat.damage_scenario_id,
      asset_id: threat.asset_id,
      property: threat.property,
      impact_narrative: `${threat.threat_statement} The resulting impact is tied to ${damage.damage_scenario}`,
      tool_user: {
        safety: 'Negligible',
        privacy: ratings.toolPrivacy,
        financial: 'Negligible',
        operational: ratings.toolOperational,
        rationale_safety: FIXED_SAFETY_RATIONALE,
        rationale_privacy: `Privacy impact follows the ${threat.property} damage to ${threat.asset_title}.`,
        rationale_financial: FIXED_FINANCIAL_RATIONALE,
        rationale_operational: `Operational impact reflects disruption to workflows using ${threat.asset_title}.`
      },
      other_stakeholders: {
        legal: ratings.legal,
        financial: ratings.orgFinancial,
        business: ratings.business,
        rationale_legal: `Legal exposure follows from ${damage.stakeholder_affected} impact in ${damage.damage_id}.`,
        rationale_financial: `Organizational financial impact follows remediation and service recovery needs for ${threat.asset_title}.`,
        rationale_business: `Business impact follows trust and continuity effects from ${threat.threat_id}.`
      },
      created_timestamp: timestamp
    };
  });

  validateImpactAnalysis(impacts, threats, damageScenarios);
  return impacts;
}

function ratingsForProperty(property) {
  const table = {
    confidentiality: {
      toolPrivacy: 'Major',
      toolOperational: 'Moderate',
      legal: 'Major',
      orgFinancial: 'Moderate',
      business: 'Major'
    },
    integrity: {
      toolPrivacy: 'Moderate',
      toolOperational: 'Major',
      legal: 'Moderate',
      orgFinancial: 'Major',
      business: 'Major'
    },
    availability: {
      toolPrivacy: 'Negligible',
      toolOperational: 'Major',
      legal: 'Moderate',
      orgFinancial: 'Major',
      business: 'Major'
    },
    authenticity: {
      toolPrivacy: 'Moderate',
      toolOperational: 'Moderate',
      legal: 'Major',
      orgFinancial: 'Major',
      business: 'Major'
    },
    authorization: {
      toolPrivacy: 'Moderate',
      toolOperational: 'Major',
      legal: 'Moderate',
      orgFinancial: 'Major',
      business: 'Major'
    },
    non_repudiation: {
      toolPrivacy: 'Negligible',
      toolOperational: 'Moderate',
      legal: 'Major',
      orgFinancial: 'Moderate',
      business: 'Major'
    }
  };
  return table[property] || table.integrity;
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
  const impacts = buildImpactAnalysis(threats, damageScenarios);
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
  buildImpactAnalysis,
  ratingsForProperty,
  run,
  validateImpactAnalysis
};
