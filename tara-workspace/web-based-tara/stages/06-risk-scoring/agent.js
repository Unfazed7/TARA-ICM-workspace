'use strict';

const fs = require('fs');
const path = require('path');
const { assignRiskRanks, computeRiskScore } = require('../../_engines/risk-score');

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
      risk_id: `RSK_${String(index + 1).padStart(2, '0')}`,
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

  return assignRiskRanks(risks);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.impact || !args.attacks || !args.out) {
    throw new Error('Usage: node agent.js --impact <impact-analysis.json> --attacks <attack-paths.json> --out <risk-register.json>');
  }

  const riskRegister = buildRiskRegister(readJson(args.impact), readJson(args.attacks));
  writeJson(args.out, riskRegister);
}

if (require.main === module) {
  main();
}

module.exports = { buildRiskRegister };
