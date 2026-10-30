'use strict';
// Preloaded into the real Stage 04 to 10 programs by the fakes: no model answers, so each program takes its own
// built-in answer (the deterministic fallback), exactly as it does when the model is unreachable.
// The checkpoint post is acknowledged; every model call fails.
global.fetch = async (url) => {
  if (String(url).startsWith('http://127.0.0.1:9/api/')) return { ok: true, status: 201, json: async () => ({}), text: async () => '{}' };
  throw new Error('network down (test)');
};
process.env.LLM_API_KEY = process.env.LLM_API_KEY || 'test-key';
process.env.LLM_PROVIDER = 'openai';
process.env.LLM_BASE_URL = 'http://127.0.0.1:9';
process.env.CHECKPOINT_API_URL = 'http://127.0.0.1:9';
