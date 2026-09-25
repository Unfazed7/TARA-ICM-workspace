'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertValidChain,
  readJson,
  fixturePath,
  validateFixture
} = require('./helpers/schema-validation');

const validFixtures = [
  [3, 'stage-03-asset-register.json'],
  [4, 'stage-04-damage-scenarios.json'],
  [5, 'stage-05-threats.json'],
  [6, 'stage-06-attack-paths.json'],
  [6, 'stage-06-attack-paths-post-engine.json'],
  [7, 'stage-07-impact-analysis.json'],
  [8, 'stage-08-risk-register.json']
];

for (const [stage, fileName] of validFixtures) {
  test(`valid fixture passes schema: ${fileName}`, () => {
    const result = validateFixture(stage, 'valid', fileName);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });
}

const invalidFixtures = [
  [3, 'stage-03-bad-no-ciaaan-true.json'],
  [4, 'stage-04-bad-attacker-language.json'],
  [5, 'stage-05-bad-stride.json'],
  [6, 'stage-06-bad-cvss.json'],
  [7, 'stage-07-bad-tool-user-safety.json']
];

for (const [stage, fileName] of invalidFixtures) {
  test(`invalid fixture fails schema: ${fileName}`, () => {
    const result = validateFixture(stage, 'invalid', fileName);
    assert.equal(result.valid, false);
  });
}

test('golden fixture chain has no orphan references', () => {
  assert.doesNotThrow(() => {
    assertValidChain({
      assets: readJson(fixturePath('valid', 'stage-03-asset-register.json')),
      damage: readJson(fixturePath('valid', 'stage-04-damage-scenarios.json')),
      threats: readJson(fixturePath('valid', 'stage-05-threats.json')),
      attacks: readJson(fixturePath('valid', 'stage-06-attack-paths-post-engine.json')),
      impacts: readJson(fixturePath('valid', 'stage-07-impact-analysis.json')),
      risks: readJson(fixturePath('valid', 'stage-08-risk-register.json'))
    });
  });
});

test('risk score mismatch is caught by chain validation', () => {
  assert.throws(() => {
    assertValidChain({
      assets: readJson(fixturePath('valid', 'stage-03-asset-register.json')),
      damage: readJson(fixturePath('valid', 'stage-04-damage-scenarios.json')),
      threats: readJson(fixturePath('valid', 'stage-05-threats.json')),
      attacks: readJson(fixturePath('valid', 'stage-06-attack-paths-post-engine.json')),
      impacts: readJson(fixturePath('valid', 'stage-07-impact-analysis.json')),
      risks: readJson(fixturePath('invalid', 'stage-08-bad-risk-score.json'))
    });
  }, /score mismatch/);
});
