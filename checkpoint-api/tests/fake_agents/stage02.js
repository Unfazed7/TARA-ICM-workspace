#!/usr/bin/env node
'use strict';
// Fake Stage 02 for pipeline tests: checks it got the stored Stage 01 result (not the
// documents), then writes item-01's answer-key Item Definition. No model.
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const stored = JSON.parse(fs.readFileSync(path.join(args.stage01, 'facts.json'), 'utf8'));
if (!stored.facts.length || fs.existsSync(path.join(args.stage01, 'manifest.json'))) process.exit(1);
const key = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'synthetic', 'item-01', 'expected');
const read = (name) => JSON.parse(fs.readFileSync(path.join(key, name), 'utf8'));
fs.mkdirSync(args.out, { recursive: true });
fs.writeFileSync(path.join(args.out, 'item-definition.json'), JSON.stringify({ ...read('item-definition.json'), scope_decisions: read('scope-decisions.json') }));
fs.writeFileSync(path.join(args.out, 'questions.json'), JSON.stringify(read('questions.json')));
fs.writeFileSync(path.join(args.out, 'rationale.json'), '[]');
fs.writeFileSync(path.join(args.out, 'seen-boundary.txt'), args.boundary || '');
