'use strict';

const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ROOT,
  assertValidChain,
  readJson,
  fixturePath,
  validateFixture,
  validateSchema
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

const itemDefinitionContract = [
  [
    'stage-01-document-register.schema.json',
    'stage-01-document-register.json',
    ['stage-01-bad-failed-read-no-reason.json', 'stage-01-bad-other-doc-no-label.json', 'stage-01-bad-rank-not-default.json']
  ],
  [
    'stage-01-facts.schema.json',
    'stage-01-facts.json',
    [
      'stage-01-bad-fact-no-source.json',
      'stage-01-bad-auto-resolved-exposure.json',
      'stage-01-bad-other-conflict-no-description.json',
      'stage-01-bad-other-conflict-auto-resolved.json'
    ]
  ],
  [
    'stage-02-item-definition.schema.json',
    'stage-02-item-definition.json',
    [
      'stage-02-bad-element-no-fact.json',
      'stage-02-bad-scope-no-reason.json',
      'stage-02-bad-auth-as-protocol.json',
      'stage-02-bad-exposed-no-auth.json',
      'stage-02-bad-assumed-no-question.json',
      'stage-02-bad-protocol-with-encryption.json'
    ]
  ],
  [
    'stage-02-questions.schema.json',
    'stage-02-questions.json',
    [
      'stage-02-bad-question-no-fact-type.json',
      'stage-02-bad-generic-question-no-topic.json',
      'stage-02-bad-question-target-not-element-or-link.json'
    ]
  ]
];

for (const [schemaFile, validFile, invalidFiles] of itemDefinitionContract) {
  const schema = readJson(path.join(ROOT, 'src', 'schemas', schemaFile));

  test(`valid fixture passes schema: ${validFile}`, () => {
    const result = validateSchema(readJson(fixturePath('valid', validFile)), schema);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });

  for (const invalidFile of invalidFiles) {
    test(`invalid fixture fails schema: ${invalidFile}`, () => {
      const result = validateSchema(readJson(fixturePath('invalid', invalidFile)), schema);
      assert.equal(result.valid, false);
    });
  }
}
