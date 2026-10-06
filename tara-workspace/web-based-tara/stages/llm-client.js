'use strict';

/**
 * The only path to a model (spec .meta/specs/17-llm-client.md, decision D-40).
 *
 *   LLM_PROVIDER=openrouter → OpenRouter, model and provider pinned per stage in
 *                             _config/models.json (default)
 *   LLM_PROVIDER=anthropic  → Anthropic native API (legacy, not used in the rebuild)
 *   LLM_PROVIDER=openai     → any OpenAI-compatible endpoint (legacy, not used in the rebuild)
 *
 * Environment variables:
 *   OPENROUTER_API_KEY / ANTHROPIC_API_KEY / LLM_API_KEY   API key
 *   LLM_MODEL       overrides the model for local experiments (recorded in the audit log)
 *   LLM_BASE_URL    base URL override
 *   LLM_MODELS_FILE path to models.json (default: ../_config/models.json)
 *   LLM_AUDIT_FILE  audit log path (default: ../audit/llm-calls.jsonl)
 */

const fs = require('fs');
const path = require('path');
const { progress } = require('./progress');

const WEB_TARA_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MODELS_FILE = path.join(WEB_TARA_ROOT, '_config', 'models.json');
const DEFAULT_AUDIT_FILE = path.join(WEB_TARA_ROOT, 'audit', 'llm-calls.jsonl');

const BASE_URLS = {
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const KEY_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
};

const REFUSAL_REASONS = new Set(['refusal', 'content_filter']);

function loadModelsConfig() {
  const file = process.env.LLM_MODELS_FILE || DEFAULT_MODELS_FILE;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isUnset(value) {
  return value === undefined || value === null || value === '' || value === 'UNSET';
}

/**
 * Resolves the settings for one call. `stage` is a key under `stages` in models.json;
 * without it the `default` entry is used.
 */
function resolveStageSettings(stage) {
  const config = loadModelsConfig();
  const entry = (stage && config.stages && config.stages[stage]) || config.default;
  const label = stage || 'default';
  if (!entry) throw new Error(`No entry for stage ${label} in _config/models.json`);
  const model = process.env.LLM_MODEL || entry.model;
  if (isUnset(model)) throw new Error(`Model for stage ${label} is not set in _config/models.json`);
  return {
    stage: label,
    model,
    modelOverridden: Boolean(process.env.LLM_MODEL),
    provider: isUnset(entry.provider) ? null : entry.provider,
    allowFallbacks: config.provider_routing ? config.provider_routing.allow_fallbacks === true : false,
    temperature: typeof entry.temperature === 'number' ? entry.temperature : null,
    maxTokens: entry.max_tokens,
    promptVersion: isUnset(entry.prompt_version) ? null : entry.prompt_version,
  };
}

function getConfig() {
  const provider = (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();
  const apiKey = process.env.LLM_API_KEY || process.env[KEY_VARS[provider]] || null;
  const baseUrl = process.env.LLM_BASE_URL || BASE_URLS[provider] || BASE_URLS.openrouter;
  return { provider, apiKey, baseUrl };
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

  const reasons = [choice.finish_reason, choice.native_finish_reason].filter(Boolean);
  const refused = reasons.some((r) => REFUSAL_REASONS.has(String(r).toLowerCase())) || Boolean(message.refusal);

  return {
    id: data.id || null,
    model: data.model || null,
    provider: data.provider || null,
    usage: data.usage || null,
    content,
    stop_reason: refused ? 'refusal' : (choice.finish_reason || 'end_turn'),
  };
}

// ── Audit ─────────────────────────────────────────────────────────────────────

function writeAudit(record) {
  const file = process.env.LLM_AUDIT_FILE || DEFAULT_AUDIT_FILE;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
  } catch (err) {
    // An audit failure must be visible but must not hide the model result.
    process.stderr.write(`llm-client: could not write audit record: ${err.message}\n`);
  }
}

function usageCounts(usage) {
  if (!usage) return { input_tokens: null, output_tokens: null };
  return {
    input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
    output_tokens: usage.completion_tokens ?? usage.output_tokens ?? null,
  };
}

// ── Strict schema ─────────────────────────────────────────────────────────────

/**
 * Some providers refuse an enum on a type list such as ['string', 'null'] in strict mode.
 * Rewrites that form as anyOf [{type, enum}, {type: 'null'}]; everything else is unchanged.
 */
function toStrictSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toStrictSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) out[key] = toStrictSchema(value);
  if (Array.isArray(out.type) && Array.isArray(out.enum)) {
    const types = out.type.filter((t) => t !== 'null');
    const values = out.enum.filter((v) => v !== null);
    const { type, enum: _enum, ...rest } = out;
    const choice = { ...rest, type: types.length === 1 ? types[0] : types, enum: values };
    return out.type.includes('null') ? { anyOf: [choice, { type: 'null' }] } : choice;
  }
  return out;
}

/** Strict providers compile at most this many nullable or union-typed fields per schema. */
const UNION_LIMIT = 16;

const isNullable = (node) => Boolean(node) && (
  (Array.isArray(node.type) && node.type.includes('null')) ||
  (Array.isArray(node.anyOf) && node.anyOf.some((o) => o && o.type === 'null'))
);

function countUnions(node) {
  if (Array.isArray(node)) return node.reduce((n, x) => n + countUnions(x), 0);
  if (!node || typeof node !== 'object') return 0;
  const own = Array.isArray(node.type) || Array.isArray(node.anyOf) ? 1 : 0;
  return own + Object.values(node).reduce((n, v) => n + countUnions(v), 0);
}

/**
 * Over the limit, nullable strings are sent as plain strings where "" means none, and nullable
 * enums gain the value "". `restoreNulls` turns those "" back into null in the reply.
 */
function flattenNullable(node) {
  if (Array.isArray(node)) return node.map(flattenNullable);
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node.anyOf) && isNullable(node)) {
    const choices = node.anyOf.filter((o) => o && o.type !== 'null');
    if (choices.length === 1 && choices[0].type === 'string') {
      const one = flattenNullable(choices[0]);
      return one.enum ? { ...one, enum: [...one.enum, ''] } : one;
    }
  }
  if (Array.isArray(node.type) && isNullable(node)) {
    const types = node.type.filter((t) => t !== 'null');
    if (types.length === 1 && types[0] === 'string') {
      const { type, ...rest } = node;
      const one = flattenNullable({ ...rest, type: 'string' });
      return one.enum ? { ...one, enum: [...one.enum.filter((v) => v !== null), ''] } : one;
    }
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) out[key] = flattenNullable(value);
  return out;
}

function restoreNulls(value, schema) {
  if (!schema || value === null || value === undefined) return value;
  if (value === '' && isNullable(schema)) return null;
  if (Array.isArray(value)) return value.map((v) => restoreNulls(v, schema.items));
  if (typeof value === 'object' && schema.properties) {
    for (const key of Object.keys(value)) value[key] = restoreNulls(value[key], schema.properties[key]);
  }
  return value;
}

/** The schema to send, and whether replies need their nulls restored. */
function prepareSchema(schema) {
  const strict = toStrictSchema(schema);
  if (countUnions(strict) <= UNION_LIMIT) return { send: strict, flattened: false, original: strict };
  return { send: flattenNullable(strict), flattened: true, original: strict };
}

// ── Main call ─────────────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string}  [params.stage]           key in models.json `stages` (else `default`)
 * @param {string}  [params.model]           honoured only on the legacy anthropic provider
 * @param {number}  [params.max_tokens]      overrides the models.json value
 * @param {string}  [params.system]
 * @param {Array}   params.messages
 * @param {Array}   [params.tools]
 * @param {object}  [params.tool_choice]
 * @param {object}  [params.thinking]        legacy anthropic provider only
 * @param {object}  [params.response_schema] {name, schema} for strict JSON output
 * @param {Function} [fetchImpl]             injectable fetch (tests)
 * @returns {Promise<object>} {content, stop_reason, model, provider, usage, id}
 */
async function callLLM(params, fetchImpl = fetch) {
  const started = Date.now();
  progress(`Model call ${params.stage || 'default'} started`);
  try {
    let result;
    try {
      result = await callModel(params, fetchImpl);
    } catch (err) {
      if (!params.response_schema || !SCHEMA_TOO_BIG.test(err.message)) throw err;
      progress(`Model call ${params.stage || 'default'}: the provider refused the strict format for its size; asking for the same JSON in the prompt instead`);
      result = await callWithSchemaInPrompt(params, fetchImpl);
    }
    progress(`Model call ${params.stage || 'default'} finished in ${((Date.now() - started) / 1000).toFixed(1)} s (${result.model || 'model'}, ${result.stop_reason})`);
    return result;
  } catch (err) {
    progress(`Model call ${params.stage || 'default'} failed after ${((Date.now() - started) / 1000).toFixed(1)} s: ${err.message}`);
    throw err;
  }
}

/** Provider errors that mean "this schema is too big to enforce", not "this request is wrong". */
const SCHEMA_TOO_BIG = /grammar is too large|too many parameters with union types|schema is too (large|complex)/i;

function jsonFromText(text) {
  const body = String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('the reply held no JSON object');
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Fallback when a provider will not enforce a schema: the schema goes into the prompt and code
 * checks the reply against it (extra fields dropped). One repair attempt with the errors listed.
 */
async function callWithSchemaInPrompt(params, fetchImpl) {
  const Ajv = require('ajv');
  const schema = toStrictSchema(params.response_schema.schema);
  const validate = new Ajv({ allErrors: true, strict: false, removeAdditional: 'all' }).compile(schema);
  const rule = `\n\nReply with one JSON object only, no other text, that matches this JSON Schema exactly (every listed field present; use null where the schema allows it and nothing is known):\n${JSON.stringify(schema)}`;
  const { response_schema: _drop, ...plain } = params;
  let messages = params.messages;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await callModel({ ...plain, system: `${params.system || ''}${rule}`, messages }, fetchImpl);
    if (isRefusal(result)) return result;
    const text = (result.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    let data;
    let problem;
    try {
      data = jsonFromText(text);
      if (!validate(data)) problem = validate.errors.slice(0, 10).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
    } catch (err) {
      problem = err.message;
    }
    if (!problem) {
      result.content = [{ type: 'text', text: JSON.stringify(data) }];
      return result;
    }
    if (attempt === 2) throw new Error(`the reply did not match the expected format: ${problem}`);
    progress(`Reply did not match the format (${problem}); asking once more`);
    messages = [...params.messages, { role: 'assistant', content: text }, { role: 'user', content: `That reply does not match the schema: ${problem}. Send the corrected JSON object only.` }];
  }
  return null;
}

async function callModel(params, fetchImpl) {
  const config = getConfig();
  if (!config.apiKey) {
    const keyVar = KEY_VARS[config.provider] || 'LLM_API_KEY';
    throw new Error(`${keyVar} is required (or set LLM_API_KEY) for LLM_PROVIDER=${config.provider}.`);
  }

  let result;
  let requestedModel;
  let settings = null;
  let prepared = null;

  if (config.provider === 'anthropic') {
    requestedModel = process.env.LLM_MODEL || params.model;
    const body = {
      model: requestedModel,
      max_tokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
    };
    if (params.tools) body.tools = params.tools;
    if (params.tool_choice) body.tool_choice = params.tool_choice;
    if (params.thinking) body.thinking = params.thinking;

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
    result = await res.json();
  } else {
    settings = resolveStageSettings(params.stage);
    requestedModel = settings.model;

    const messages = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    messages.push(...params.messages);

    const body = {
      model: settings.model,
      max_tokens: params.max_tokens || settings.maxTokens,
      messages,
    };
    if (settings.temperature !== null) body.temperature = settings.temperature;
    if (config.provider === 'openrouter' && settings.provider) {
      body.provider = { only: [settings.provider], allow_fallbacks: settings.allowFallbacks };
    }
    if (params.response_schema) {
      prepared = prepareSchema(params.response_schema.schema);
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: params.response_schema.name, strict: true, schema: prepared.send },
      };
    }
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
    result = openAIResponseToAnthropic(await res.json());
    if (prepared && prepared.flattened) {
      for (const part of result.content || []) {
        if (part.type !== 'text') continue;
        try {
          part.text = JSON.stringify(restoreNulls(JSON.parse(part.text), prepared.original));
        } catch {
          // Not JSON: leave it for the caller, which reports the parse error.
        }
      }
    }
  }

  writeAudit({
    timestamp: new Date().toISOString(),
    stage: settings ? settings.stage : (params.stage || null),
    llm_provider: config.provider,
    model_requested: requestedModel || null,
    model_overridden_by_env: settings ? settings.modelOverridden : Boolean(process.env.LLM_MODEL),
    model_served: result.model || null,
    provider_pinned: settings ? settings.provider : null,
    provider_served: result.provider || null,
    prompt_version: settings ? settings.promptVersion : null,
    ...usageCounts(result.usage),
    request_id: result.id || null,
    stop_reason: result.stop_reason || null,
  });

  return result;
}

function isRefusal(response) {
  return Boolean(response) && response.stop_reason === 'refusal';
}

module.exports = { callLLM, jsonFromText, SCHEMA_TOO_BIG, getConfig, resolveStageSettings, isRefusal, toStrictSchema, prepareSchema, restoreNulls, countUnions, UNION_LIMIT };
