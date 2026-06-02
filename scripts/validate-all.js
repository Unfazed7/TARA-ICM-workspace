'use strict';

const fs = require('fs');
const path = require('path');
const { readJson, schemaPath, validateSchema } = require('../tests/helpers/schema-validation');

const stageByName = [
  [/stage-01/, 1],
  [/stage-02/, 2],
  [/stage-03/, 3],
  [/stage-04/, 4],
  [/stage-05/, 5],
  [/stage-06/, 6]
];

function filesFrom(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return [target];
  return fs.readdirSync(target)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(target, file));
}

function inferStage(filePath) {
  const name = path.basename(filePath);
  const match = stageByName.find(([pattern]) => pattern.test(name));
  if (!match) throw new Error(`Cannot infer schema stage from ${name}`);
  return match[1];
}

function main() {
  const target = process.argv[2];
  const expectFailure = process.argv.includes('--expect-failure');
  if (!target) throw new Error('Usage: node scripts/validate-all.js <file-or-directory> [--expect-failure]');

  let failures = 0;
  for (const filePath of filesFrom(path.resolve(target))) {
    const result = validateSchema(readJson(filePath), readJson(schemaPath(inferStage(filePath))));
    const passed = expectFailure ? !result.valid : result.valid;
    if (!passed) {
      failures += 1;
      console.error(`${filePath}: unexpected validation result`);
      console.error(JSON.stringify(result.errors, null, 2));
    }
  }

  if (failures > 0) process.exit(1);
}

main();
