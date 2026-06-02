'use strict';

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

const STRIDE_BY_PROPERTY = {
  confidentiality: 'information_disclosure',
  integrity: 'tampering',
  availability: 'denial_of_service',
  authenticity: 'spoofing',
  authorization: 'elevation_of_privilege',
  non_repudiation: 'repudiation'
};

const OWASP_BY_STRIDE = {
  information_disclosure: 'A02',
  tampering: 'A03',
  denial_of_service: 'API4',
  spoofing: 'A07',
  elevation_of_privilege: 'A01',
  repudiation: 'A09'
};

function buildThreats(damageScenarios, timestamp = new Date().toISOString()) {
  if (!Array.isArray(damageScenarios) || damageScenarios.length === 0) {
    throw new Error('No damage scenarios to process');
  }

  const threats = damageScenarios.map((scenario, index) => {
    const stride = STRIDE_BY_PROPERTY[scenario.property];
    return {
      threat_id: formatId('TH', index),
      damage_scenario_id: scenario.damage_id,
      asset_id: scenario.asset_id,
      asset_title: scenario.asset_title,
      property: scenario.property,
      stride_category: stride,
      threat_statement: `${scenario.asset_title} may be compromised through ${stride.replace(/_/g, ' ')} that directly causes the ${scenario.property} damage scenario.`,
      derivation_note: `Derived from ${scenario.damage_id}: ${scenario.damage_scenario}`,
      owasp_reference: OWASP_BY_STRIDE[stride],
      created_timestamp: timestamp
    };
  });

  validateThreats(threats, damageScenarios);
  return threats;
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

async function run(options) {
  const damageScenarios = readJson(options.damageScenarios);
  const threats = buildThreats(damageScenarios);
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
  buildThreats,
  run,
  validateThreats
};
