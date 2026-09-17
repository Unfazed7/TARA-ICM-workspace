'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  callLLM,
  fetchWithRetry,
  isTransientFetchError
} = require('../../tara-workspace/web-based-tara/stages/llm-client');

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('transient terminated fetch errors are retried', async () => {
  const previousRetries = process.env.LLM_RETRIES;
  process.env.LLM_RETRIES = '1';
  let calls = 0;

  const response = await fetchWithRetry('https://example.test', {}, async () => {
    calls += 1;
    if (calls === 1) throw new Error('terminated');
    return { status: 200 };
  });

  assert.equal(calls, 2);
  assert.equal(response.status, 200);
  restoreEnv('LLM_RETRIES', previousRetries);
});

test('OpenAI-compatible call translates tool call response after retry', async () => {
  const previousProvider = process.env.LLM_PROVIDER;
  const previousApiKey = process.env.LLM_API_KEY;
  const previousModel = process.env.LLM_MODEL;
  const previousBaseUrl = process.env.LLM_BASE_URL;
  const previousRetries = process.env.LLM_RETRIES;

  process.env.LLM_PROVIDER = 'openrouter';
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'test-model';
  process.env.LLM_BASE_URL = 'https://example.test/v1';
  process.env.LLM_RETRIES = '1';

  let calls = 0;
  const result = await callLLM({
    max_tokens: 128,
    system: 'test',
    messages: [{ role: 'user', content: 'call tool' }],
    tools: [{
      name: 'submit_test',
      description: 'Submit test',
      input_schema: {
        type: 'object',
        properties: { ok: { type: 'boolean' } },
        required: ['ok']
      }
    }],
    tool_choice: { type: 'tool', name: 'submit_test' }
  }, async () => {
    calls += 1;
    if (calls === 1) throw new Error('fetch failed: terminated');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            tool_calls: [{
              id: 'call_1',
              function: {
                name: 'submit_test',
                arguments: JSON.stringify({ ok: true })
              }
            }]
          }
        }]
      })
    };
  });

  assert.equal(calls, 2);
  assert.equal(result.content[0].type, 'tool_use');
  assert.equal(result.content[0].name, 'submit_test');
  assert.deepEqual(result.content[0].input, { ok: true });

  restoreEnv('LLM_PROVIDER', previousProvider);
  restoreEnv('LLM_API_KEY', previousApiKey);
  restoreEnv('LLM_MODEL', previousModel);
  restoreEnv('LLM_BASE_URL', previousBaseUrl);
  restoreEnv('LLM_RETRIES', previousRetries);
});

test('transient error detector covers observed provider failures', () => {
  assert.equal(isTransientFetchError(new Error('terminated')), true);
  assert.equal(isTransientFetchError(new Error('fetch failed')), true);
  assert.equal(isTransientFetchError(new Error('validation failed')), false);
});
