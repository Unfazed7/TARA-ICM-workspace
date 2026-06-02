# Review Issues — Stage 02 Damage Analysis

**Decision: REJECTED**  
**Commit reviewed:** 3a63b6e (Stage 02 portion)  
**Date:** 2026-06-03

---

## Issue 1 — BLOCKER: No Claude API call (spec type is AI, implementation is deterministic)

**File:** `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js`  
**Lines:** entire `buildDamageScenarios` + `createScenarioText` functions

**What's wrong:**  
The spec states Type: **AI (Claude standard)** and requires:
```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 2048,
  system: systemPrompt,           // ciaaan-properties.md + web-tara-constraints.md
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitDamageScenariosForAssetTool],
  tool_choice: { type: 'tool', name: 'submit_damage_scenarios_for_asset' },
});
```

The implementation has NO Claude API call anywhere. Instead it uses a fixed template:
```javascript
return `If the ${label} of ${asset.asset_title} is compromised, ${consequence}...`;
```

Where `consequence` is a hardcoded string per CIAAAN property — identical regardless of asset context, type, or description.

**Why this matters:**  
Generic templated damage scenarios propagate through the entire pipeline. Stage 03 threats, Stage 04 attack paths, and Stage 05 impact ratings all derive FROM Stage 02. If Stage 02 produces identical boilerplate for every asset, the entire TARA output is meaningless. A diagnostic API endpoint and a firmware repository should NOT produce identical "confidentiality" damage scenarios.

**Required fix:**
1. Call Claude API once per asset (group all applicable properties in one call)
2. System prompt = `_config/ciaaan-properties.md` + `_config/web-tara-constraints.md`  
3. User message = asset title, type, description + list of applicable CIAAAN properties
4. `tool_choice: { type: 'tool', name: 'submit_damage_scenarios_for_asset' }`
5. Retry once if response is not tool_use; throw on second failure
6. Keep existing `validateDamageScenarios` — it's correct
7. Keep checkpoint submission — it's correct

---

## Issue 2 — BLOCKER: `stakeholder_affected` hardcoded per property, not per asset context

**File:** `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js`  
**Lines:** 19-26 (`STAKEHOLDER_BY_PROPERTY`)

```javascript
const STAKEHOLDER_BY_PROPERTY = {
  confidentiality: 'tool_user',
  integrity: 'organization',
  ...
  non_repudiation: 'regulator'
};
```

The stakeholder affected depends on the ASSET, not just the property. Integrity of an OTA update system affects `vehicle_owner`. Integrity of an audit log affects `regulator`. Integrity of a license DB affects `organization`. Claude AI must determine this from context — not a lookup table.

**Required fix:** Let Claude determine `stakeholder_affected` as part of the tool_use output per damage scenario.

---

## Issue 3 — Tests test template output, not AI path

**File:** `tests/agents/damage-analysis.test.js`

Tests call `buildDamageScenarios` directly (synchronous). Since the implementation has no async AI call, the tests work — but they are testing a template function, not the AI agent.

**Required fix:** After implementing the real AI call, mock `fetch` (or the Anthropic client) in tests the same way Stage 01 does for diagram mode. Test that `tool_choice` is correct, that retry fires on free-text response, and that the AI output goes through `validateDamageScenarios`.

---

## What to keep (do not rewrite)

- `validateDamageScenarios` function — correct, keep as-is
- `checkpoint submission` — correct, keep as-is  
- `hasAttackerLanguage` check — correct, keep as-is
- `formatId('DS', ...)` sequential ID assignment — correct, keep as-is
- Argument parsing and file I/O — correct, keep as-is
