#!/usr/bin/env node
'use strict';
// Fake Stage 01 for pipeline tests: writes item-01's answer-key output. No model.
// FAKE_FAIL=missing exits 2 with a missing-input message, as the real agent does.
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
if (process.env.FAKE_FAIL === 'missing') {
  process.stderr.write('Stage 01 stopped. Missing input:\n- A document describing behaviour.\n');
  process.exit(2);
}
if (!fs.existsSync(path.join(args.input, 'manifest.json'))) process.exit(1);
const key = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const read = (name) => JSON.parse(fs.readFileSync(path.join(key, name), 'utf8'));
fs.mkdirSync(args.out, { recursive: true });
fs.writeFileSync(path.join(args.out, 'document-register.json'), JSON.stringify(read('document-register.json')));
fs.writeFileSync(path.join(args.out, 'facts.json'), JSON.stringify({ facts: read('facts.json'), conflicts: read('conflicts.json') }));
fs.writeFileSync(path.join(args.out, 'rationale.json'), '[]');
fs.writeFileSync(path.join(args.out, 'seen-input.txt'), args.input);
