# Spec 00 — JSON Schema Contracts (All 8 Stages)

**Status:** ✅ Ready for implementation  
**Owner:** Claude (design) → Codex (implementation)  
**Depends on:** Nothing — foundational  
**Blocks:** All stage agents

---

## Goal & Success Criteria

Define immutable I/O contracts for all 8 web-based TARA stages. Each stage reads from the previous stage's output, validates against schema, and produces output that matches its schema.

**Success criteria:**
- All 8 output schemas defined in JSON Schema (draft 7)
- `asset_id`, `damage_scenario_id`, `threat_id`, `attack_id`, `impact_id`, `risk_id`, `treatment_id`, `residual_id` chains are unambiguously defined
- Each schema has at least one valid and one invalid fixture
- Tool use schemas defined for all AI agents (Stages 01-05, 07)

---

## File Ownership

**Codex WILL create:**
```
src/schemas/stage-01-asset-register.schema.json
src/schemas/stage-02-damage-scenarios.schema.json
src/schemas/stage-03-threats.schema.json
src/schemas/stage-04-attack-paths.schema.json
src/schemas/stage-05-impact-analysis.schema.json
src/schemas/stage-06-risk-register.schema.json
src/schemas/stage-07-risk-treatment.schema.json     ← provisional, BLOCKED
src/schemas/stage-08-residual-risk.schema.json      ← provisional, BLOCKED
src/schemas/tool-use-schemas.json
tests/fixtures/valid/stage-0{1-8}-example.json
tests/fixtures/invalid/stage-0{1-8}-bad-*.json
```

**Codex WILL NOT modify:**
- Any CONTEXT.md or _config/ file
- Any .meta/specs/ file

---

## Stage 01: Asset Register

**Output file:** `stages/01-input-normalization/output/asset-register.json`

```json
[
  {
    "asset_id": "AS_01",
    "asset_title": "string",
    "asset_type": "string (from web-asset-types.md enum)",
    "asset_description": "string",
    "ciaaan": {
      "confidentiality": true,
      "integrity": false,
      "availability": false,
      "authenticity": true,
      "authorization": true,
      "non_repudiation": false
    },
    "input_mode": "csv|diagram",
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `asset_id` unique, pattern `^AS_\d{2,}$`
- At least one `ciaaan` property must be `true`
- All 6 `ciaaan` fields must be present as booleans
- `asset_type` must be a value from `_config/web-asset-types.md`
- `input_mode` must be `"csv"` or `"diagram"`

---

## Stage 02: Damage Scenarios

**Output file:** `stages/02-damage-analysis/output/damage-scenarios.json`

```json
[
  {
    "damage_id": "DS_01",
    "asset_id": "AS_01",
    "asset_title": "string",
    "property": "confidentiality|integrity|availability|authenticity|authorization|non_repudiation",
    "damage_scenario": "string",
    "stakeholder_affected": "tool_user|organization|vehicle_owner|regulator|oem",
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `damage_id` unique, pattern `^DS_\d{2,}$`
- `asset_id` must exist in Stage 01 output
- `property` must be one of 6 CIAAAN values
- `property` must be `true` for this `asset_id` in Stage 01 (cannot have DS_## for a false property)
- One `DS_##` per `asset_id` × `property` combination — no duplicates
- `damage_scenario` must be non-empty string; must not contain attacker language ("attacker", "hacker", "malicious actor")

---

## Stage 03: Threats

**Output file:** `stages/03-threat-identification/output/threats.json`

```json
[
  {
    "threat_id": "TH_01",
    "damage_scenario_id": "DS_01",
    "asset_id": "AS_01",
    "asset_title": "string",
    "property": "confidentiality|integrity|availability|authenticity|authorization|non_repudiation",
    "stride_category": "spoofing|tampering|repudiation|information_disclosure|denial_of_service|elevation_of_privilege",
    "threat_statement": "string",
    "derivation_note": "string",
    "owasp_reference": "A01|A02|A03|A04|A05|A06|A07|A08|A09|A10|API1|API2|API3|API4|API5|API6|API7|API8|API9|API10|null",
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `threat_id` unique, pattern `^TH_\d{2,}$`
- `damage_scenario_id` must exist in Stage 02 output
- `asset_id` must exist in Stage 01 output
- Exactly one `TH_##` per `DS_##` — no DS without a threat, no threat without a DS
- `stride_category` from enum
- `threat_statement` must be non-empty; must reference the specific asset (validated by string presence check on `asset_title`)
- `derivation_note` must be non-empty

---

## Stage 04: Attack Paths

**Output file:** `stages/04-attack-path-modelling/output/attack-paths.json`

```json
[
  {
    "attack_id": "AT_01",
    "threat_id": "TH_01",
    "damage_scenario_id": "DS_01",
    "asset_id": "AS_01",
    "attack_description": "string",
    "attack_path": {
      "step_1_initial_precondition": "string",
      "step_2_abuse_technique": "string",
      "step_3_exploit_effect": "string",
      "step_4_control_gap": "string",
      "step_5_threat_realization": "string"
    },
    "cvss_metrics": {
      "attack_vector": "N|A|L|P",
      "attack_complexity": "L|H",
      "privileges_required": "N|L|H",
      "user_interaction": "N|R"
    },
    "afr_value": null,
    "afr_label": null,
    "justifications": {
      "attack_vector": "string",
      "attack_complexity": "string",
      "privileges_required": "string",
      "user_interaction": "string"
    },
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `attack_id` unique, pattern `^AT_\d{2,}$`
- `threat_id` must exist in Stage 03 output
- Exactly one `AT_##` per `TH_##`
- All 5 attack path steps must be non-empty strings
- `cvss_metrics` values must be from allowed enums (exact single-character values)
- All 4 justification fields must be non-empty
- `afr_value` must be `null` at submission (engine fills it post-stage)
- `afr_label` must be `null` at submission

**Post-stage engine update (by orchestrator):**
After `cvss-afr-calc.js` runs, the same file is updated:
- `afr_value`: integer 1–5
- `afr_label`: `"very low"|"low"|"medium"|"high"|"very high"`

---

## Stage 05: Impact Analysis

**Output file:** `stages/05-impact-analysis/output/impact-analysis.json`

```json
[
  {
    "impact_id": "IM_01",
    "threat_id": "TH_01",
    "damage_scenario_id": "DS_01",
    "asset_id": "AS_01",
    "property": "string",
    "impact_narrative": "string",
    "tool_user": {
      "safety": "Negligible",
      "privacy": "Negligible|Moderate|Major|Severe",
      "financial": "Negligible",
      "operational": "Negligible|Moderate|Major|Severe",
      "rationale_safety": "string",
      "rationale_privacy": "string",
      "rationale_financial": "string",
      "rationale_operational": "string"
    },
    "other_stakeholders": {
      "legal": "Negligible|Moderate|Major|Severe",
      "financial": "Negligible|Moderate|Major|Severe",
      "business": "Negligible|Moderate|Major|Severe",
      "rationale_legal": "string",
      "rationale_financial": "string",
      "rationale_business": "string"
    },
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `impact_id` unique, pattern `^IM_\d{2,}$`
- `threat_id` must exist in Stage 03 output
- `damage_scenario_id` must exist in Stage 02 output
- Exactly one `IM_##` per `TH_##`
- `tool_user.safety` must always equal `"Negligible"` (domain constraint)
- `tool_user.financial` must always equal `"Negligible"` (domain constraint)
- All 7 rating fields from enum: `"Negligible"|"Moderate"|"Major"|"Severe"`
- All 7 rationale fields must be non-empty strings
- `impact_narrative` must be non-empty

---

## Stage 06: Risk Register

**Output file:** `stages/06-risk-scoring/output/risk-register.json`

```json
[
  {
    "risk_id": "RSK_01",
    "threat_id": "TH_01",
    "damage_scenario_id": "DS_01",
    "attack_id": "AT_01",
    "impact_id": "IM_01",
    "asset_id": "AS_01",
    "impact_rating_value": 2,
    "impact_rating_label": "Major",
    "afr_value": 4,
    "afr_label": "high",
    "risk_score": 8,
    "risk_level": "high",
    "risk_rank": 1,
    "created_timestamp": "ISO 8601"
  }
]
```

**Validation rules:**
- `risk_id` unique, pattern `^RSK_\d{2,}$`
- All cross-reference IDs must exist in their respective stage outputs
- `impact_rating_value` from {0, 1, 2, 3} (Negligible=0, Moderate=1, Major=2, Severe=3)
- `afr_value` from {1, 2, 3, 4, 5}
- `risk_score` must exactly equal `impact_rating_value × afr_value`
- `risk_level` must match matrix lookup: 0=informational, 1-3=low, 4-7=medium, 8-11=high, 12-15=critical
- `risk_rank` must be sequential integers 1..N with no duplicates

**Impact Rating Conversion:**
```
Negligible → 0
Moderate   → 1
Major      → 2
Severe     → 3
impact_rating_value = max(privacy_numeric, operational_numeric, legal_numeric, financial_org_numeric, business_numeric)
```

---

## Stage 07: Risk Treatment *(schema provisional — BLOCKED)*

**Output file:** `stages/07-risk-treatment/output/risk-treatment.json`

```json
[
  {
    "treatment_id": "TRT_01",
    "risk_id": "RSK_01",
    "threat_id": "TH_01",
    "treatment_option": "reduce|accept|transfer|avoid",
    "rationale": "string",
    "controls_assigned": ["CTRL_01"],
    "residual_risk_expected": "informational|low|medium|high|critical",
    "created_timestamp": "ISO 8601"
  }
]
```

**Schema is provisional.** Awaiting Controls DB schema from Omkar before finalizing.  
Codex must not implement Stage 07 schema until it is marked unblocked.

---

## Stage 08: Residual Risk *(schema provisional — BLOCKED)*

**Output file:** `stages/08-residual-risk/output/residual-risk.json`

```json
[
  {
    "residual_id": "RR_01",
    "risk_id": "RSK_01",
    "treatment_id": "TRT_01",
    "original_risk_score": 8,
    "original_risk_level": "high",
    "residual_risk_score": 4,
    "residual_risk_level": "medium",
    "risk_reduction": 4,
    "treatment_effective": true,
    "acceptance_status": "accepted|requires_review",
    "created_timestamp": "ISO 8601"
  }
]
```

**Schema is provisional.** Awaiting residual risk calculation logic from Omkar before finalizing.  
Codex must not implement Stage 08 schema until it is marked unblocked.

---

## Tool Use Schemas

Each AI agent submits output via Claude API `tool_use`. Codex creates one entry per agent in `src/schemas/tool-use-schemas.json`.

**Stage 01 example:**
```json
{
  "name": "submit_asset_register",
  "description": "Submit the normalized asset register as structured JSON",
  "input_schema": {
    "type": "object",
    "properties": {
      "assets": {
        "type": "array",
        "items": { "$ref": "stage-01-asset-register.schema.json#/items" }
      }
    },
    "required": ["assets"]
  }
}
```

All agents follow the same pattern: `submit_{stage_output_name}` with an `input_schema` matching the stage output schema. Codex creates tool use schemas for stages 01, 02, 03, 04, 05, and 07.

---

## ID Convention Summary

| Stage | ID Format | Pattern |
|-------|-----------|---------|
| 01 | `AS_##` | `^AS_\d{2,}$` |
| 02 | `DS_##` | `^DS_\d{2,}$` |
| 03 | `TH_##` | `^TH_\d{2,}$` |
| 04 | `AT_##` | `^AT_\d{2,}$` |
| 05 | `IM_##` | `^IM_\d{2,}$` |
| 06 | `RSK_##` | `^RSK_\d{2,}$` |
| 07 | `TRT_##` | `^TRT_\d{2,}$` |
| 08 | `RR_##` | `^RR_\d{2,}$` |

All IDs are zero-padded to at least 2 digits. Sequential within each stage's output array.

---

## Cross-Reference Chain

Every entity in Stages 02-08 must trace back to a valid `AS_##`:

```
AS_## (Stage 01)
  └── DS_## (Stage 02) — one per AS_## × applicable CIAAAN property
        └── TH_## (Stage 03) — one per DS_##
              └── AT_## (Stage 04) — one per TH_##
              └── IM_## (Stage 05) — one per TH_##
                    └── RSK_## (Stage 06) — one per IM_## + AT_##
                          └── TRT_## (Stage 07) — one per RSK_##
                                └── RR_## (Stage 08) — one per TRT_##
```

No orphan IDs allowed at any stage. Validation must check the full chain.

---

## Implementation Order

1. Write Stage 01-06 schemas in JSON Schema draft 7 format
2. Write tool use schemas for Stage 01-05
3. Write valid fixture for each stage (golden path example)
4. Write ≥2 invalid fixtures per stage (missing required field; wrong enum; cross-ref violation)
5. Do NOT implement Stage 07-08 schemas until those specs are unblocked

---

## Validation Library

Use `ajv` (Node.js, v8+) with `strict: true`. No custom validators — schema must be sufficient.

---

## Verification Steps

```bash
# All fixture validation passes
npm test -- --testPathPattern=schemas

# Golden path: each valid fixture validates cleanly
node scripts/validate-all.js tests/fixtures/valid/

# Bad path: each invalid fixture produces at least one schema error
node scripts/validate-all.js tests/fixtures/invalid/ --expect-failure

# Cross-reference chain: no orphan IDs across stages 01-06
node scripts/validate-chain.js tests/fixtures/valid/
```
