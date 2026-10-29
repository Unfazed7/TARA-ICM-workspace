#!/usr/bin/env node
'use strict';
// Fake Stage 03 for pipeline tests: writes item-01's checked answer. No model.
// FAKE_FAIL=stage03 exits 2 with a message, as a failing agent would.
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
if (process.env.FAKE_FAIL === 'stage03') {
  process.stderr.write('Stage 03 stopped. The model did not answer.\n');
  process.exit(2);
}
if (!args.stage02 || !fs.existsSync(args.stage02)) process.exit(1);
const key = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
fs.mkdirSync(args.out, { recursive: true });
fs.writeFileSync(path.join(args.out, 'assets.json'), fs.readFileSync(path.join(key, 'assets.json')));
fs.writeFileSync(path.join(args.out, 'rationale.json'), fs.readFileSync(path.join(key, 'assets-rationale.json')));
fs.writeFileSync(path.join(args.out, 'seen-input.txt'), args.stage02);
