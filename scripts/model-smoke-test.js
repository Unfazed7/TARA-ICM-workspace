#!/usr/bin/env node
/**
 * Quick capability check for one model on one OpenAI-compatible endpoint.
 *
 *   LLM_BASE_URL=https://<provider>/v1 LLM_API_KEY=... node scripts/model-smoke-test.js <model-id> [--no-image]
 *   OpenRouter: OPENROUTER_API_KEY=... node scripts/model-smoke-test.js <model-id>
 *
 * Checks (what the TARA stages actually need):
 *   1. strict JSON schema output   (response_format json_schema, strict)
 *   2. tool call                    (stages 04-10 submit through a tool call)
 *   3. image input                  (stage 01 reads diagrams / PDF pages)
 * Also warns when reasoning text leaks into the reply or the reply is cut off.
 * Costs a few cents at most. Does not touch the TARA code or data.
 */
// OpenRouter shortcut: with only OPENROUTER_API_KEY set, the endpoint defaults to OpenRouter.
const base = (process.env.LLM_BASE_URL || (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : '')).replace(/\/$/, '');
const key = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
const model = process.argv[2];
const skipImage = process.argv.includes('--no-image');
if (!base || !key || !model) {
  console.error('usage: LLM_BASE_URL=... LLM_API_KEY=... node scripts/model-smoke-test.js <model-id> [--no-image]');
  process.exit(2);
}
// 1x1 red PNG; the model should say the image is (mostly) red.
const RED_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function chat(body) {
  const started = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: 2000, ...body }),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, json, text, ms: Date.now() - started };
}

const notes = [];
function common(r) {
  const c = r.json && r.json.choices && r.json.choices[0];
  const msg = (c && c.message) || {};
  if (c && c.finish_reason === 'length') notes.push('reply cut off by max_tokens (thinking may be using the budget)');
  if (typeof msg.content === 'string' && /<think>/i.test(msg.content)) notes.push('reasoning text <think> appears inside content: JSON parsing may break');
  if (msg.reasoning_content || msg.reasoning) notes.push('model returns separate reasoning (it uses output tokens)');
  const u = r.json && r.json.usage;
  return { msg, finish: c && c.finish_reason, usage: u };
}

async function checkSchema() {
  const r = await chat({
    messages: [{ role: 'user', content: 'Return one asset: name "login API", type "api", confidentiality_rating "high".' }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'asset', strict: true,
        schema: { type: 'object', additionalProperties: false, required: ['name', 'type', 'confidentiality_rating'],
          properties: { name: { type: 'string' }, type: { type: 'string' }, confidentiality_rating: { type: 'string', enum: ['low', 'medium', 'high'] } } },
      },
    },
  });
  if (!r.ok) return { pass: false, why: `HTTP ${r.status}: ${r.text.slice(0, 200)}` };
  const { msg, usage } = common(r);
  try {
    const o = JSON.parse(msg.content);
    const good = o.name && o.type && ['low', 'medium', 'high'].includes(o.confidentiality_rating);
    return { pass: Boolean(good), why: good ? `${r.ms} ms, tokens ${JSON.stringify(usage)}` : `parsed but wrong shape: ${msg.content.slice(0, 120)}` };
  } catch { return { pass: false, why: `reply is not valid JSON: ${String(msg.content).slice(0, 120)}` }; }
}

async function checkTool() {
  const r = await chat({
    messages: [{ role: 'user', content: 'Submit one damage scenario for asset A1 using the tool.' }],
    tools: [{ type: 'function', function: { name: 'submit_damage_scenario', description: 'Submit a damage scenario',
      parameters: { type: 'object', required: ['asset_id', 'description'], properties: { asset_id: { type: 'string' }, description: { type: 'string' } } } } }],
    tool_choice: 'auto',
  });
  if (!r.ok) return { pass: false, why: `HTTP ${r.status}: ${r.text.slice(0, 200)}` };
  const { msg, usage } = common(r);
  const call = msg.tool_calls && msg.tool_calls[0];
  if (!call) return { pass: false, why: `no tool call; reply: ${String(msg.content).slice(0, 120)}` };
  try {
    const args = JSON.parse(call.function.arguments);
    return { pass: Boolean(args.asset_id && args.description), why: `${r.ms} ms, tokens ${JSON.stringify(usage)}` };
  } catch { return { pass: false, why: `tool arguments are not valid JSON: ${call.function.arguments}` }; }
}

async function checkImage() {
  const r = await chat({
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'What colour is this image? Answer with one word.' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${RED_PNG}` } } ] }],
  });
  if (!r.ok) return { pass: false, why: `HTTP ${r.status}: ${r.text.slice(0, 200)}` };
  const { msg } = common(r);
  const ok = /red/i.test(String(msg.content));
  return { pass: ok, why: ok ? `${r.ms} ms` : `answer was: ${String(msg.content).slice(0, 120)}` };
}

(async () => {
  console.log(`model: ${model}\nendpoint: ${base}\n`);
  const checks = [['strict JSON schema', checkSchema], ['tool call', checkTool]];
  if (!skipImage) checks.push(['image input', checkImage]);
  let failed = 0;
  for (const [name, fn] of checks) {
    let out;
    try { out = await fn(); } catch (e) { out = { pass: false, why: `request failed: ${e.message}` }; }
    if (!out.pass) failed += 1;
    console.log(`${out.pass ? 'PASS' : 'FAIL'}  ${name}  - ${out.why}`);
  }
  [...new Set(notes)].forEach((n) => console.log(`NOTE  ${n}`));
  process.exit(failed ? 1 : 0);
})();
