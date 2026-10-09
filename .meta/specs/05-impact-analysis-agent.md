# Spec 05 — Impact Analysis Agent (Stage 05)

**Module:** `tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation — no blockers  
**Clause:** ISO/SAE 21434 §15.7

---

## Goal

For each threat (TH_##), produce a 7-dimension impact rating by:
- Step A: Writing a specific impact narrative derived from the threat statement
- Step B: Assigning 7 impact ratings derived from the damage scenario

Two non-negotiable constraints apply before anything else:
- `tool_user.safety` = always `"Negligible"` (web tool cannot cause physical harm)
- `tool_user.financial` = always `"Negligible"` (web tool does not handle user money)

---

## Success Criteria

```bash
# Run agent with sample threats.json + damage-scenarios.json
node tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js \
  --threats tests/fixtures/valid/stage-03-threats.json \
  --damage-scenarios tests/fixtures/valid/stage-02-damage-scenarios.json \
  --out /tmp/test-impact.json

# Verify schema
node scripts/validate-all.js /tmp/test-impact.json src/schemas/stage-05-impact-analysis.schema.json

# Verify domain constraints
node -e "
  const out = require('/tmp/test-impact.json');
  out.forEach(im => {
    console.assert(im.tool_user.safety === 'Negligible', im.impact_id + ': safety must be Negligible');
    console.assert(im.tool_user.financial === 'Negligible', im.impact_id + ': financial must be Negligible');
  });
  console.log('Domain constraints OK');
"

# Verify 1:1 mapping
node -e "
  const threats = require('tests/fixtures/valid/stage-03-threats.json');
  const impacts = require('/tmp/test-impact.json');
  console.assert(threats.length === impacts.length, '1 IM_## per TH_## required');
  console.log('Cardinality OK');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js`
- `tests/agents/impact-analysis.test.js` (create)

**Codex WILL NOT modify:**
- `stages/05-impact-analysis/CONTEXT.md`
- Any `_config/` file
- Any other `agent.js`

---

## Input

```
stages/03-threat-identification/output/threats.json        (TH_## array)
stages/02-damage-analysis/output/damage-scenarios.json     (DS_## array)
_config/impact-dimensions.md                               (loaded as Layer 3 context)
_config/web-tara-constraints.md                            (loaded as Layer 3 context)
```

---

## Output

`stages/05-impact-analysis/output/impact-analysis.json` — see schema in spec 00.

---

## Process

### Setup
1. Load threats.json and damage-scenarios.json
2. Load impact-dimensions.md and web-tara-constraints.md as context strings
3. For each TH_## in threats.json, look up its DS_## from damage-scenarios.json

### Per TH_## — Claude API Call
Send one Claude API call per threat (or batch if feasible) with:

**System prompt includes:**
- Full content of `impact-dimensions.md` (rating criteria for all 7 dimensions)
- Full content of `web-tara-constraints.md` (domain constraints, fixed rationale text)
- Instruction: "Tool User Safety and Financial are always Negligible — do not compute them"

**User message includes:**
- The TH_## threat statement, stride category, derivation note
- The DS_## damage scenario, stakeholder, property

**Tool definition:** `submit_impact_analysis` (from tool-use-schemas.json)

**Claude produces tool_use call with:**
- `impact_narrative` — derived from TH_## (what happens when this attack succeeds)
- 5 computed ratings: tool_user.privacy, tool_user.operational, other_stakeholders.legal, financial, business
- 7 rationales (2 are fixed text from web-tara-constraints.md)

### Post-processing (deterministic)
4. Extract tool_use arguments from Claude's response
5. Inject fixed values: `tool_user.safety = "Negligible"`, `tool_user.financial = "Negligible"`
6. Inject fixed rationale text for safety and financial (from web-tara-constraints.md)
7. Assign `impact_id` = `IM_##` sequentially matching TH_## order
8. Set `created_timestamp` = current UTC ISO 8601
9. Write output array to impact-analysis.json

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| TH_## has no matching DS_## | Throw `Error('No damage scenario found for threat TH_XX')` |
| Claude returns free text instead of tool_use | Retry once; if still no tool_use, throw with TH_## identifier |
| Rating value not in enum | Throw `Error('Invalid rating X for dimension Y in IM_XX')` |
| Empty rationale from Claude | Throw `Error('Empty rationale for dimension Y in IM_XX')` |
| Missing threats.json or damage-scenarios.json | Throw with clear file path error |

---

## Validation Rules (post-generation, before write)

Run these checks before writing the file — throw on any failure:

1. `tool_user.safety === "Negligible"` for every record
2. `tool_user.financial === "Negligible"` for every record
3. All 7 rating fields are from enum `["Negligible","Moderate","Major","Severe"]`
4. All 7 rationale strings are non-empty
5. `impact_narrative` is non-empty
6. `threat_id` exists in threats.json, `damage_scenario_id` exists in damage-scenarios.json
7. Count of IM_## records equals count of TH_## records

---

## Claude API Configuration

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',           // standard — no extended thinking
  max_tokens: 1024,
  system: systemPrompt,               // impact-dimensions.md + web-tara-constraints.md
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitImpactAnalysisTool],
  tool_choice: { type: 'tool', name: 'submit_impact_analysis' },
});
```

`tool_choice: { type: 'tool', name: 'submit_impact_analysis' }` forces tool use — no free text fallback.

---

## Verification Steps

```bash
# 1. Unit test: domain constraints always enforced
npm test -- --testPathPattern=impact-analysis

# 2. Schema validation on output
node scripts/validate-all.js output/impact-analysis.json

# 3. Verify tool_user.safety and financial are Negligible in every record
# (included in test suite — must cover this case explicitly)

# 4. Run with two different threats for same asset — verify narratives differ
# (self-test: same narrative for different threats = copy-paste failure)
```
