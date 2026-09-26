'use strict';

/**
 * Unified LLM client supporting:
 *   LLM_PROVIDER=anthropic  → Anthropic native API (default)
 *   LLM_PROVIDER=openrouter → OpenRouter (OpenAI-compatible, free models)
 *   LLM_PROVIDER=openai     → Any OpenAI-compatible endpoint
 *
 * Environment variables:
 *   LLM_PROVIDER   anthropic | openrouter | openai  (default: anthropic)
 *   LLM_API_KEY    API key for the chosen provider
 *   LLM_MODEL      Model identifier (overrides per-agent default)
 *   LLM_BASE_URL   Base URL for openai-compatible providers
 *
 * Anthropic fallback: ANTHROPIC_API_KEY still works when LLM_PROVIDER=anthropic.
 */

const DEFAULT_MODELS = {
  anthropic: 'claude-opus-4-8',
  openrouter: 'nousresearch/hermes-3-llama-3.1-405b:free',
  openai: 'gpt-4o-mini',
};

const BASE_URLS = {
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

function getConfig() {
  const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
  const apiKey = process.env.LLM_API_KEY
    || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : null);
  const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;
  const baseUrl = process.env.LLM_BASE_URL || BASE_URLS[provider] || BASE_URLS.openrouter;
  return { provider, apiKey, model, baseUrl };
}

// ── Format translators ────────────────────────────────────────────────────────

function toOpenAITools(anthropicTools) {
  return anthropicTools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

function toOpenAIToolChoice(anthropicToolChoice) {
  if (!anthropicToolChoice) return undefined;
  if (anthropicToolChoice.type === 'tool') {
    return { type: 'function', function: { name: anthropicToolChoice.name } };
  }
  return 'auto';
}

function openAIResponseToAnthropic(data) {
  const choice = data.choices && data.choices[0];
  if (!choice) throw new Error('LLM returned no choices');
  const message = choice.message || {};
  const content = [];

  if (message.content) {
    content.push({ type: 'text', text: message.content });
  }

  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const tc of message.tool_calls) {
      let input;
      try {
        input = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
      } catch {
        input = {};
      }
      content.push({
        type: 'tool_use',
        id: tc.id || `tc_${Date.now()}`,
        name: tc.function.name,
        input,
      });
    }
  }

  return { content, stop_reason: choice.finish_reason || 'end_turn' };
}

// ── Main call ─────────────────────────────────────────────────────────────────

/**
 * callLLM — drop-in replacement for direct Anthropic fetch calls.
 *
 * @param {object} params
 * @param {string}  params.model      - Anthropic model id (overridden by LLM_MODEL env)
 * @param {number}  params.max_tokens
 * @param {string}  params.system
 * @param {Array}   params.messages
 * @param {Array}   [params.tools]
 * @param {object}  [params.tool_choice]
 * @param {Function} [fetchImpl]      - injectable fetch (for testing)
 * @returns {Promise<object>} Anthropic-style response: { content: [...], stop_reason }
 */
async function callLLM(params, fetchImpl = fetch) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error(
      `LLM API key not set. Set LLM_API_KEY (or ANTHROPIC_API_KEY for Anthropic provider).`
    );
  }

  if (config.provider === 'anthropic') {
    const body = {
      model: config.model,
      max_tokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
    };
    if (params.tools) body.tools = params.tools;
    if (params.tool_choice) body.tool_choice = params.tool_choice;

    const res = await fetchImpl(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // OpenAI-compatible path (openrouter / openai)
  const messages = [];
  if (params.system) messages.push({ role: 'system', content: params.system });
  messages.push(...params.messages);

  const body = {
    model: config.model,
    max_tokens: params.max_tokens,
    messages,
  };

  if (params.tools && params.tools.length > 0) {
    body.tools = toOpenAITools(params.tools);
    body.tool_choice = toOpenAIToolChoice(params.tool_choice) || 'auto';
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/Unfazed7/tara-icm-workspace';
    headers['X-Title'] = 'TARA Aegis';
  }

  const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return openAIResponseToAnthropic(data);
}

module.exports = { callLLM, getConfig };
