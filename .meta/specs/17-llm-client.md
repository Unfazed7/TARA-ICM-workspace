# Spec 17: Model Client (OpenRouter, Pinned Per Stage)

**Status:** approved by the analyst for C1 (2026-10-01, "sure" to the C1 proposal).
**Code:** `tara-workspace/web-based-tara/stages/llm-client.js`, config `tara-workspace/web-based-tara/_config/models.json`
**Decisions:** D-10 (replaced by D-40), D-40

## Goal

One path to any model: every call goes through OpenRouter with the model and provider pinned per stage in `models.json`, returns structured output when asked, surfaces refusals, and leaves an audit record.

## Success Criteria

```bash
node --test tests/unit/llm-client.test.js   # pinning, schema output, refusal, audit, unset config, missing key
npm test                                    # the 5 earlier failures are fixed
```

## File Ownership

WILL touch: `llm-client.js`, `models.json`, `tests/unit/llm-client.test.js`, the agent tests under `tests/agents/` (provider set explicitly), `.gitignore` (audit log). WON'T touch: the logic of stages 04 to 09 (D-36 out of scope list).

## Input/Output

`callLLM(params, fetchImpl)` with `params`: `stage` (key in `models.json`), `system`, `messages`, optional `tools`, `tool_choice`, `response_schema` (`{name, schema}`), `max_tokens`.

Resolution: provider from `LLM_PROVIDER` (default `openrouter`). Model: `models.json` stage entry, else `models.json` `default`, else error. `LLM_MODEL` overrides for local experiments and is recorded. On the legacy `anthropic` provider, `params.model` is still honoured.

OpenRouter request adds `provider: {order: [<pinned provider>], allow_fallbacks: false}` when a provider is pinned, and `response_format: {type: "json_schema", json_schema: {name, strict: true, schema}}` when `response_schema` is given. `temperature` is sent only when `models.json` sets a number (current Claude models reject non-default sampling).

Returns the Anthropic-style `{content, stop_reason, model, provider, usage, id}`; `stop_reason` is `refusal` when the model declined (`content_filter` or `refusal`).

## Process

1. Resolve key, provider, model; fail loudly if missing or `UNSET`.
2. Send the request; on HTTP error, throw with status and body.
3. Write one JSON line to the audit log (`LLM_AUDIT_FILE`, default `tara-workspace/web-based-tara/audit/llm-calls.jsonl`, git-ignored): time, stage, provider, model requested and served, prompt version, token counts, request id, stop reason.

## Validation Rules

1. No key: "OPENROUTER_API_KEY is required" (or "ANTHROPIC_API_KEY is required" on the legacy provider); `LLM_API_KEY` works for both.
2. A stage or default whose model is `UNSET`: "Model for stage <x> is not set in _config/models.json".

## Error Conditions

HTTP errors and unparseable responses throw; a refusal does not throw, callers check `stop_reason` and write a Rationale item.

## Verification Steps

```bash
node --test tests/unit/llm-client.test.js && npm test
```
