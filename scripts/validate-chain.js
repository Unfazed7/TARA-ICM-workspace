'use strict';

const path = require('path');
const { assertValidChain, readJson } = require('../tests/helpers/schema-validation');

function main() {
  const directory = path.resolve(process.argv[2] || 'tests/fixtures/valid');
  assertValidChain({
    assets: readJson(path.join(directory, 'stage-01-asset-register.json')),
    damage: readJson(path.join(directory, 'stage-02-damage-scenarios.json')),
    threats: readJson(path.join(directory, 'stage-03-threats.json')),
    attacks: readJson(path.join(directory, 'stage-04-attack-paths-post-engine.json')),
    impacts: readJson(path.join(directory, 'stage-05-impact-analysis.json')),
    risks: readJson(path.join(directory, 'stage-06-risk-register.json'))
  });
  console.log('Cross-reference chain OK');
}

main();
