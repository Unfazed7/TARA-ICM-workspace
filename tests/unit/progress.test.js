'use strict';
// Progress lines for the run log: printed only when a stage runs from the command line.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { execFileSync } = require('child_process');

const AGENT = path.resolve(__dirname, '..', '..', 'tara-workspace', 'web-based-tara', 'stages', '01-input-normalization', 'agent.js');
const INPUTS = path.resolve(__dirname, '..', 'fixtures', 'synthetic', 'item-01', 'inputs');

test('a stage run from the command line prints progress and model call results without the key', () => {
  const env = { ...process.env, OPENROUTER_API_KEY: '', LLM_API_KEY: '', LLM_AUDIT_FILE: path.join(require('os').tmpdir(), 'progress-test-audit.jsonl') };
  let stdout = '';
  try {
    execFileSync('node', [AGENT, '--input', INPUTS, '--out', require('fs').mkdtempSync(path.join(require('os').tmpdir(), 'p-'))], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    stdout = err.stdout.toString();
  }
  assert.match(stdout, /^\[01\] 4 document\(s\) found; boundary set$/m);
  assert.match(stdout, /^\[01\] Reading architecture\.drawio \(diagram\)$/m);
  assert.match(stdout, /^\[01\] Model call 01-extract-text failed after .* OPENROUTER_API_KEY is required/m);
});

test('progress is silent when a stage is used as a library', () => {
  const { progress } = require('../../tara-workspace/web-based-tara/stages/progress');
  const write = process.stdout.write;
  let printed = '';
  process.stdout.write = (chunk) => { printed += chunk; return true; };
  try {
    progress('should not print');
  } finally {
    process.stdout.write = write;
  }
  assert.strictEqual(printed, '');
});

test('a stage stopped for missing input exits with code 2 and no crash text', () => {
  const env = { ...process.env, OPENROUTER_API_KEY: '', LLM_API_KEY: '', LLM_AUDIT_FILE: path.join(require('os').tmpdir(), 'progress-test-audit.jsonl') };
  let code = 0;
  let stderr = '';
  try {
    execFileSync('node', [AGENT, '--input', INPUTS, '--out', require('fs').mkdtempSync(path.join(require('os').tmpdir(), 'p-'))], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    code = err.status;
    stderr = err.stderr.toString();
  }
  assert.strictEqual(code, 2);
  assert.match(stderr, /^Stage 01 stopped\. Missing input:/);
  assert.doesNotMatch(stderr, /Assertion failed/);
});
