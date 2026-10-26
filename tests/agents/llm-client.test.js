'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { callLLM, getConfig, resolveStageSettings } = require('../../tara-workspace/web-based-tara/stages/llm-client');

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL', 'LLM_AUDIT_FILE'];

function withEnv(updates, callback) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.LLM_AUDIT_FILE = require('path').join(require('os').tmpdir(), `tara-llm-audit-agents-${process.pid}.jsonl`);
  Object.assign(process.env, updates);
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const key of ENV_KEYS) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    });
}

test('OpenRouter is the default provider and the model comes from models.json', async () => {
  await withEnv({ LLM_API_KEY: 'test-key' }, () => {
    assert.equal(getConfig().provider, 'openrouter');
    assert.equal(resolveStageSettings().model, 'anthropic/claude-sonnet-5.5');
    assert.equal(resolveStageSettings('04-anything').model, 'anthropic/claude-sonnet-5.5');
  });
});

test('LLM_MODEL overrides the model for every stage', async () => {
  await withEnv({ LLM_API_KEY: 'test-key', LLM_MODEL: 'some-lab/other-model' }, () => {
    assert.equal(resolveStageSettings().model, 'some-lab/other-model');
    assert.equal(resolveStageSettings('03-assets').model, 'some-lab/other-model');
  });
});

test('an unavailable OpenRouter model reports the model and corrective setting', async () => {
  await withEnv({ LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'test-key', LLM_MODEL: 'stealth/space-bunny-alpha' }, async () => {
    const fakeFetch = async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { message: 'No endpoints found for stealth/space-bunny-alpha.', code: 404 } }),
    });
    await assert.rejects(
      () => callLLM({ max_tokens: 32, messages: [] }, fakeFetch),
      /Configured LLM model "stealth\/space-bunny-alpha" is unavailable.*LLM_MODEL/,
    );
  });
});
