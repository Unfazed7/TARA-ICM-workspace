'use strict';

const fs = require('fs');
const path = require('path');
const { computeRiskScore, getRiskLevel } = require('../../_engines/risk-score');
const { calculateCVSSAFR } = require('../../_engines/cvss-afr-calc');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key || !key.startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    args[key.slice(2)] = argv[index + 1];
  }
  return args;
}

function buildRiskRegister(impactRecords, attackRecords, timestamp = new Date().toISOString()) {
  const attacksByThreat = new Map(attackRecords.map((attack) => [attack.threat_id, attack]));
  const impactsByThreat = new Map(impactRecords.map((impact) => [impact.threat_id, impact]));

  for (const attack of attackRecords) {
    if (!impactsByThreat.has(attack.threat_id)) {
      throw new Error(`No impact record found for threat ${attack.threat_id}`);
    }
  }

  const risks = impactRecords.map((impact, index) => {
    const attack = attacksByThreat.get(impact.threat_id);
    if (!attack) throw new Error(`No attack path found for threat ${impact.threat_id}`);

    const score = computeRiskScore(impact, attack);
    return {
      risk_id: null,
      threat_id: impact.threat_id,
      damage_scenario_id: impact.damage_scenario_id,
      attack_id: attack.attack_id,
      impact_id: impact.impact_id,
      asset_id: impact.asset_id,
      ...score,
      risk_rank: 0,
      created_timestamp: timestamp
    };
  });

  const ranked = risks
    .sort((a, b) => {
      if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
      return b.afr_value - a.afr_value;
    })
    .map((risk, index) => ({
      ...risk,
      risk_id: `RSK_${String(index + 1).padStart(2, '0')}`,
      risk_rank: index + 1
    }));

  validateRiskRegister(ranked, impactRecords, attackRecords);
  return ranked;
}

function prepareAttackRecordsForRiskScoring(attackRecords) {
  return attackRecords.map((attack) => {
    const expected = calculateCVSSAFR(attack.cvss_metrics);
    const missing = attack.afr_value === null || attack.afr_value === undefined
      || attack.afr_label === null || attack.afr_label === undefined;
    if (missing) return { ...attack, ...expected };
    if (attack.afr_value !== expected.afr_value || attack.afr_label !== expected.afr_label) {
      throw new Error(`${attack.attack_id}: stored AFR does not match its CVSS metrics`);
    }
    return { ...attack };
  });
}

function validateRiskRegister(risks, impactRecords, attackRecords) {
  const impactIds = new Set(impactRecords.map((impact) => impact.impact_id));
  const attackIds = new Set(attackRecords.map((attack) => attack.attack_id));
  risks.forEach((risk, index) => {
    if (risk.risk_score !== risk.impact_rating_value * risk.afr_value) {
      throw new Error(`${risk.risk_id}: risk_score must equal impact_rating_value * afr_value`);
    }
    if (risk.risk_level !== getRiskLevel(risk.risk_score)) {
      throw new Error(`${risk.risk_id}: risk_level does not match matrix threshold`);
    }
    if (risk.risk_rank !== index + 1) throw new Error(`Rank gap at ${risk.risk_rank}`);
    if (!impactIds.has(risk.impact_id)) throw new Error(`Unknown impact_id for ${risk.risk_id}`);
    if (!attackIds.has(risk.attack_id)) throw new Error(`Unknown attack_id for ${risk.risk_id}`);
    if (![0, 1, 2, 3].includes(risk.impact_rating_value)) {
      throw new Error(`Invalid impact_rating_value for ${risk.risk_id}`);
    }
    if (![1, 2, 3, 4, 5].includes(risk.afr_value)) {
      throw new Error(`Invalid afr_value for ${risk.risk_id}`);
    }
  });
}

function run(options) {
  readJson(path.resolve(__dirname, '../../_config/iso-21434-risk-matrix.json'));
  const sourceAttacks = readJson(options.attacks);
  const missingCount = sourceAttacks.filter((attack) => (
    attack.afr_value === null || attack.afr_value === undefined
    || attack.afr_label === null || attack.afr_label === undefined
  )).length;
  const attacks = prepareAttackRecordsForRiskScoring(sourceAttacks);
  if (missingCount > 0) {
    console.warn(`Calculated missing AFR values for ${missingCount} existing attack path${missingCount === 1 ? '' : 's'} from CVSS metrics.`);
  }
  const riskRegister = buildRiskRegister(readJson(options.impact), attacks, options.timestamp);
  writeJson(options.out, riskRegister);
  return riskRegister;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.impact || !args.attacks || !args.out) {
    throw new Error('Usage: node agent.js --impact <impact-analysis.json> --attacks <attack-paths.json> --out <risk-register.json>');
  }
  return run({ impact: args.impact, attacks: args.attacks, out: args.out });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildRiskRegister,
  prepareAttackRecordsForRiskScoring,
  run,
  validateRiskRegister
};
