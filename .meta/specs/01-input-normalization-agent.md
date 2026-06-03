# Spec 01 — Input Normalization Agent (Stage 01)

**Module:** `tara-workspace/web-based-tara/stages/01-input-normalization/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation  
**Type:** Deterministic (Mode A: CSV) or AI Vision (Mode B: PNG)  
**Clause:** ISO/SAE 21434 §15.3 (item definition)

---

## Goal

Accept either an Asset List CSV or an Architecture Diagram PNG. Produce a normalized `asset-register.json` with CIAAAN boolean flags per asset. Downstream stages are completely agnostic to which input mode was used.

---

## Success Criteria

```bash
# Mode A — CSV input
node tara-workspace/web-based-tara/stages/01-input-normalization/agent.js \
  --input tests/fixtures/inputs/asset-list.csv \
  --mode csv \
  --assessment-id ASS_01 \
  --out /tmp/test-asset-register.json
node scripts/validate-all.js /tmp/test-asset-register.json src/schemas/stage-01-asset-register.schema.json

# Mode B — PNG input
node tara-workspace/web-based-tara/stages/01-input-normalization/agent.js \
  --input tests/fixtures/inputs/architecture.png \
  --mode diagram \
  --assessment-id ASS_01 \
  --out /tmp/test-asset-register.json
node scripts/validate-all.js /tmp/test-asset-register.json src/schemas/stage-01-asset-register.schema.json

# Both modes produce schema-valid output with at least one asset
# Both modes produce at least one asset with at least one ciaaan flag = true
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/01-input-normalization/agent.js`
- `tests/agents/input-normalization.test.js` (create)
- `tests/fixtures/inputs/asset-list.csv` (create sample)
- `tests/fixtures/inputs/architecture.png` (create or use existing sample)

**Codex WILL NOT modify:**
- `stages/01-input-normalization/CONTEXT.md`
- Any `_config/` file

---

## Input

```
--input    Path to CSV file OR PNG file
--mode     "csv" | "diagram"
--assessment-id   Assessment ID string (e.g. "ASS_01")
--out      Output path for asset-register.json
```

---

## Output

`stages/01-input-normalization/output/asset-register.json` — see schema in spec 00.

---

## Process — Mode A (CSV)

CSV expected columns (case-insensitive headers):
```
asset_title, asset_type, asset_description,
confidentiality, integrity, availability,
authenticity, authorization, non_repudiation
```

CIAAAN columns accept: `yes|no|true|false|1|0` (case-insensitive).

1. Parse CSV with a standard library (e.g. `csv-parse`)
2. Validate required columns are present — throw if missing
3. For each row:
   a. Assign `asset_id` = `AS_##` sequentially
   b. Map CIAAAN columns to booleans
   c. Validate `asset_type` against `_config/web-asset-types.md` enum
   d. Set `input_mode = "csv"`
4. Write asset-register.json
5. Submit checkpoint (see Checkpoint section below)

---

## Process — Mode B (Architecture Diagram PNG)

1. Load PNG as base64
2. Send to Claude API with vision:

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 2048,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64png } },
      { type: 'text', text: systemPrompt }
    ]
  }],
  tools: [submitAssetRegisterTool],
  tool_choice: { type: 'tool', name: 'submit_asset_register' },
});
```

System prompt includes:
- Full content of `_config/web-asset-types.md`
- Full content of `_config/ciaaan-properties.md`
- Instruction: "Extract all identifiable web assets from this architecture diagram. For each asset, assign the applicable CIAAAN properties as booleans."

3. Extract tool_use result
4. Assign `asset_id` = `AS_##` sequentially
5. Set `input_mode = "diagram"`
6. Write asset-register.json
7. Submit checkpoint

---

## Checkpoint Submission

After writing asset-register.json, submit to Checkpoint API:

```javascript
await fetch(`${CHECKPOINT_API_URL}/api/v1/assessments/${assessmentId}/checkpoints`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CHECKPOINT_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    stage_num: 1,
    stage_name: 'input-normalization',
    output_summary: {
      total_assets: assets.length,
      input_mode: mode,
      assets: assets.map(a => ({ asset_id: a.asset_id, asset_title: a.asset_title }))
    }
  })
});
```

Then poll until approved (orchestrator handles polling — agent just submits and exits).

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| Unknown `--mode` value | Throw `Error('--mode must be csv or diagram')` |
| CSV missing required column | Throw with column name |
| CSV row with no CIAAAN flags = true | Log warning, include asset, flag in summary |
| Claude returns free text instead of tool_use (Mode B) | Retry once; throw on second failure |
| Checkpoint API unreachable | Throw `Error('Checkpoint API unreachable: ...')` |
| PNG file not readable | Throw with file path |

---

## Validation Rules (before write)

1. `asset_id` unique, pattern `^AS_\d{2,}$`
2. At least one asset in output
3. All 6 CIAAAN fields present as booleans on every record
4. At least one CIAAAN flag = true per asset
5. `asset_type` from allowed enum in `_config/web-asset-types.md`
6. `input_mode` = `"csv"` or `"diagram"`

---

## Verification Steps

```bash
npm test -- --testPathPattern=input-normalization
# Must cover: CSV golden path, PNG golden path, missing column error,
# invalid asset_type, all-false CIAAAN warning
```
