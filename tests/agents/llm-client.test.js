'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  callLLM,
  getConfig,
} = require('../../tara-workspace/web-based-tara/stages/llm-client');

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL'];

function withEnv(updates, callback) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
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

test('OpenRouter defaults to the supported tool-calling model', async () => {
  await withEnv({ LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'test-key' }, () => {
    assert.equal(getConfig().model, 'nvidia/nemotron-3.5-lightning:free');
  });
});

test('an unavailable OpenRouter model reports the model and corrective setting', async () => {
  await withEnv({
    LLM_PROVIDER: 'openrouter',
    LLM_API_KEY: 'test-key',
    LLM_MODEL: 'stealth/space-bunny-alpha',
  }, async () => {
    const fakeFetch = async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({
        error: { message: 'No endpoints found for stealth/space-bunny-alpha.', code: 404 },
      }),
    });

    await assert.rejects(
      () => callLLM({ max_tokens: 32, messages: [] }, fakeFetch),
      /Configured LLM model "stealth\/space-bunny-alpha" is unavailable.*LLM_MODEL/,
    );
  });
});
