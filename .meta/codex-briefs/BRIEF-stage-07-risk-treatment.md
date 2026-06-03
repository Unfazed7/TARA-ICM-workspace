# Codex Brief — Stage 07: Risk Treatment Agent

**Spec:** `.meta/specs/07-risk-treatment-agent.md` — read the full spec before starting.  
**Branch:** Create `codex/stage-07-risk-treatment` from `develop`.  
**PR target:** `develop`  
**Depends on:** Stage 06 fixtures must exist before running end-to-end

---

## What to Build

### `tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js`

CLI: `--risk-register <path> --threats <path> --damage-scenarios <path> --attacks <path> --impacts <path> --assets <path> --assessment-id <id> --out <path>`

Uses Claude API — `claude-opus-4-8`, `max_tokens: 2048`, tool_choice forced to `submit_treatment`.  
**No extended thinking** — do not add a `thinking` field.

---

## Input Loading

Load all 6 JSON inputs and build lookup maps by their ID fields (e.g. `threat_id`, `risk_id`, etc.). Build one combined "risk chain" object per RSK_## that assembles all related records.

Load these two config files as strings (read full file text):
- `tara-workspace/web-based-tara/_config/controls-catalogue.md`
- `tara-workspace/web-based-tara/_config/web-tara-constraints.md`

Pre-check: throw if any `afr_value` in attack-paths is null before starting the loop.

---

## System Prompt

Include verbatim in the system prompt:
1. Full text of `controls-catalogue.md`
2. Full text of `web-tara-constraints.md`
3. Goal writing rules (6 rules) — copy from spec
4. Claim writing rules (6 rules) — copy from spec
5. CAL table (copy from spec)
6. Acceptance threshold: "Only `informational` or `low` risk levels may be accepted. Medium, high, and critical MUST be reduced, shared, or avoided."
7. Control selection rules — copy from spec

---

## User Message (per RSK_##)

Include the full risk chain in a structured text block:
- RSK_##: risk_id, risk_score, risk_level, risk_rank
- IM_##: impact_id, impact_narrative, all 7 ratings with rationales
- AT_##: attack_id, attack_description, all 5 attack path steps, cvss_metrics, afr_value, afr_label, all 4 justifications
- TH_##: threat_id, threat_statement, stride_category, derivation_note
- DS_##: damage_id, damage_scenario, stakeholder_affected, property
- AS_##: asset_id, asset_title, asset_type, ciaaan flags

---

## Tool Definition

Add to `src/schemas/tool-use-schemas.json` under key `"submit_treatment"`:

```json
{
  "name": "submit_treatment",
  "description": "Submit the risk treatment decision for one RSK_## record",
  "input_schema": {
    "type": "object",
    "required": ["treatment_option", "treatment_rationale", "residual_risk_expected"],
    "properties": {
      "treatment_option": { "type": "string", "enum": ["reduce", "accept", "share", "avoid"] },
      "treatment_rationale": { "type": "string" },
      "goal_statement": { "type": ["string", "null"] },
      "goal_self_test_note": { "type": ["string", "null"] },
      "claim_statement": { "type": ["string", "null"] },
      "acceptance_basis": { "type": ["string", "null"] },
      "control_ids": {
        "type": "array",
        "items": { "type": "string", "pattern": "^CTR_\\d{2,}$" },
        "maxItems": 3
      },
      "control_assignment_rationales": {
        "type": "array",
        "items": { "type": "string" },
        "maxItems": 3
      },
      "avoidance_action": { "type": ["string", "null"] },
      "residual_risk_expected": {
        "type": "string",
        "enum": ["informational", "low", "medium", "high", "critical"]
      }
    }
  }
}
```

---

## Post-processing (deterministic, after Claude's tool_use call)

Run these steps in order before writing to output:

```javascript
// 1. Acceptance threshold guard — throw before touching anything else
if (tool_args.treatment_option === 'accept' &&
    !['informational', 'low'].includes(riskRecord.risk_level)) {
  throw new Error(`Cannot accept ${riskRecord.risk_level} risk for ${riskRecord.risk_id}`);
}

// 2. CAL derivation
const CAL_TABLE = { informational: 1, low: 1, medium: 2, high: 3, critical: 4 };
const cal = CAL_TABLE[riskRecord.risk_level];

// 3. ID assignment (maintain running counters)
treatment_id = `TRT_${String(trtCounter++).padStart(2, '0')}`;
if (['reduce', 'share'].includes(option)) goal_id = `CG_${String(cgCounter++).padStart(2, '0')}`;
if (option === 'accept') claim_id = `CC_${String(ccCounter++).padStart(2, '0')}`;

// 4. Control hydration — read control_title and control_type from catalogue
//    Parse controls-catalogue.md to build a Map: CTR_## → { title, type }
//    Throw if any control_id is not found in the catalogue

// 5. Build the full output record per the schema in the spec

// 6. Validate before push (all 15 validation rules from spec)
```

---

## Controls Catalogue Parser

Parse `controls-catalogue.md` to build a lookup map. The format of each entry header is:

```
## CTR_XX — [Title]
**Type:** preventive|detective|corrective | ...
```

Extract `CTR_##`, title (after ` — `), and type (after `**Type:** `, before ` |`). Build:
```javascript
const catalogueMap = new Map(); // CTR_XX → { title, type }
```

Throw `Error('CTR_XX not found in controls catalogue')` if any tool-returned `control_id` isn't in the map.

---

## Output Schema

Create `src/schemas/stage-07-risk-treatment.schema.json` using the schema defined in the spec. Key nullable constraints:
- `cybersecurity_goal`: nullable — required for reduce/share, must be null for accept/avoid
- `cybersecurity_claim`: nullable — required for accept, must be null for all others
- `controls_assigned`: array (empty for accept/avoid)
- `avoidance_action`: nullable — required for avoid, null for all others

---

## Checkpoint Submission

Call `submitCheckpoint` from `agent-utils.js` after all records are written:

```javascript
await submitCheckpoint(assessmentId, {
  stage_num: 7,
  stage_name: 'risk-treatment',
  output_summary: {
    total_treatments: results.length,
    treatment_distribution: { reduce: N, accept: N, share: N, avoid: N },
    total_goals: N,
    total_claims: N,
    total_controls_assigned: N,
    cal_distribution: { 1: N, 2: N, 3: N, 4: N }
  }
});
```

---

## Test File

`tests/agents/risk-treatment.test.js` — use Jest + mock `anthropic.messages.create`.

**Must cover:**

| Test | Scenario | Assertion |
|------|----------|-----------|
| reduce treatment | option=reduce | goal non-null, claim null, controls 1–3 |
| accept treatment (low risk) | option=accept, risk_level=low | claim non-null, goal null, controls empty |
| share treatment | option=share | goal non-null, claim null, ≥1 control |
| avoid treatment | option=avoid | avoidance_action non-null, goal null, claim null |
| acceptance threshold rejection | option=accept, risk_level=medium | throws |
| acceptance threshold rejection | option=accept, risk_level=high | throws |
| unknown control ID | control_ids=["CTR_999"] | throws "not found in controls catalogue" |
| CAL: informational/low | risk_level=low | cal===1 |
| CAL: medium | risk_level=medium | cal===2 |
| CAL: high | risk_level=high | cal===3 |
| CAL: critical | risk_level=critical | cal===4 |
| goal_self_test_note required | reduce treatment missing self_test | throws |
| no extended thinking | check API call | body.thinking === undefined |
| 1:1 mapping | 5 risks in → 5 treatments out | lengths equal |
| claim cites numbers | claim_statement checked | contains afr_value and risk_score as substrings |

---

## Do Not Touch

- `_config/controls-catalogue.md`
- `_config/web-tara-constraints.md`
- `stages/07-risk-treatment/CONTEXT.md`
- Any other `agent.js`
- `agent-utils.js` (use it, don't modify it)

---

## Verification

```bash
node tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js \
  --risk-register tests/fixtures/valid/stage-06-risk-register.json \
  --threats tests/fixtures/valid/stage-03-threats.json \
  --damage-scenarios tests/fixtures/valid/stage-02-damage-scenarios.json \
  --attacks tests/fixtures/valid/stage-04-attack-paths-post-engine.json \
  --impacts tests/fixtures/valid/stage-05-impact-analysis.json \
  --assets tests/fixtures/valid/stage-01-asset-register.json \
  --assessment-id ASS_01 \
  --out /tmp/test-treatment.json

node scripts/validate-all.js /tmp/test-treatment.json src/schemas/stage-07-risk-treatment.schema.json

npm test -- --testPathPattern=risk-treatment
```

All tests must pass. Schema validation must pass.
