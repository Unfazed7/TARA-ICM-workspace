'use strict';

const {
  formatId,
  parseArgs,
  readJson,
  requireFileArg,
  writeJson
} = require('../agent-utils');

const CVSS_ENUMS = {
  attack_vector: ['N', 'A', 'L', 'P'],
  attack_complexity: ['L', 'H'],
  privileges_required: ['N', 'L', 'H'],
  user_interaction: ['N', 'R']
};

function buildAttackPaths(threats, timestamp = new Date().toISOString()) {
  if (!Array.isArray(threats) || threats.length === 0) throw new Error('No threats to process');

  const paths = threats.map((threat, index) => ({
    attack_id: formatId('AT', index),
    threat_id: threat.threat_id,
    damage_scenario_id: threat.damage_scenario_id,
    asset_id: threat.asset_id,
    attack_description: `Most feasible path for ${threat.asset_title}: ${threat.threat_statement}`,
    attack_path: buildFiveStepPath(threat),
    cvss_metrics: selectCvssMetrics(threat),
    afr_value: null,
    afr_label: null,
    justifications: buildJustifications(threat),
    created_timestamp: timestamp
  }));

  validateAttackPaths(paths, threats);
  return paths;
}

function buildFiveStepPath(threat) {
  return {
    step_1_initial_precondition: `${threat.asset_title} is reachable through its normal web application access path.`,
    step_2_abuse_technique: `The actor targets the ${threat.property} weakness described by ${threat.threat_id}.`,
    step_3_exploit_effect: `The ${threat.stride_category.replace(/_/g, ' ')} condition is triggered against ${threat.asset_title}.`,
    step_4_control_gap: `The implemented controls do not fully enforce the expected ${threat.property} boundary.`,
    step_5_threat_realization: `The damage scenario ${threat.damage_scenario_id} is realized for ${threat.asset_title}.`
  };
}

function selectCvssMetrics(threat) {
  const defaults = {
    attack_vector: 'N',
    attack_complexity: 'L',
    privileges_required: 'L',
    user_interaction: 'N'
  };
  if (threat.stride_category === 'denial_of_service') {
    return { ...defaults, privileges_required: 'N' };
  }
  if (threat.stride_category === 'spoofing') {
    return { ...defaults, attack_complexity: 'H', privileges_required: 'N', user_interaction: 'R' };
  }
  return defaults;
}

function buildJustifications(threat) {
  return {
    attack_vector: `${threat.asset_title} is evaluated as a web-exposed or network-adjacent asset.`,
    attack_complexity: `The path follows the direct mechanism described in ${threat.threat_id}.`,
    privileges_required: `Privileges reflect the access implied by the ${threat.property} property.`,
    user_interaction: `User interaction is based on whether the threat requires a separate user action.`
  };
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

async function run(options) {
  const threats = readJson(options.threats);
  const attackPaths = buildAttackPaths(threats);
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
  buildAttackPaths,
  run,
  selectCvssMetrics,
  validateAttackPaths
};
