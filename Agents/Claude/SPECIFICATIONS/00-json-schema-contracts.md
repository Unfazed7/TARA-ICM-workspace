# SPECIFICATION: JSON Schema Contracts (All 7 Stages)

**Status:** 📋 DRAFT (Claude)  
**Owner:** Claude (design) → Qwen (validation only, no code)  
**Depends on:** Nothing (foundational)  
**Blocks:** All stage agents until frozen

---

## Goal & Success Criteria

**Goal:** Define immutable I/O contracts (JSON schemas) for all 7 TARA stages. Each stage reads its input from the previous stage's output, validates against schema, and produces output that matches its schema.

**Success criteria (verifiable):**
- ✅ All 7 schemas defined in valid JSON Schema format (draft 7)
- ✅ Each schema has concrete examples showing valid input/output
- ✅ Schema enforces: required fields, field types, value ranges, nested structures
- ✅ No ambiguity about what "high" vs "severe" means (concrete enum values)
- ✅ Tool use schemas defined for each Claude agent (input_schema for tool calls)

---

## File Ownership

| File | Owner | Purpose |
|------|-------|---------|
| `/Agents/Claude/SPECIFICATIONS/00-json-schema-contracts.md` | Claude | This spec |
| `/src/schemas/stage-01-item-definition.schema.json` | Qwen | Stage 1 output schema |
| `/src/schemas/stage-02-asset-analysis.schema.json` | Qwen | Stage 2 output schema |
| `/src/schemas/stage-03-impact-analysis.schema.json` | Qwen | Stage 3 output schema |
| `/src/schemas/stage-04-threat-analysis.schema.json` | Qwen | Stage 4 output schema |
| `/src/schemas/stage-05-risk-determination.schema.json` | Qwen | Stage 5 output schema |
| `/src/schemas/stage-06-risk-treatment.schema.json` | Qwen | Stage 6 output schema |
| `/src/schemas/stage-07-residual-risk.schema.json` | Qwen | Stage 7 output schema |
| `/src/schemas/tool-use-schemas.json` | Qwen | Claude API tool definitions (one per agent) |
| `/tests/fixtures/valid-outputs/` | Qwen | Example valid outputs per stage |
| `/tests/fixtures/invalid-outputs/` | Qwen | Example invalid outputs (should fail validation) |

---

## Key Interfaces (Stage-by-Stage Contracts)

### Stage 01: Item Definition Output
**Input:** None (first stage; reads architecture.png + feature-list.xlsx as files, not JSON)  
**Output:** JSON file (item-definition.json)

```json
{
  "item_id": "string (UUID or ITEM-001 format)",
  "item_name": "string (concise name)",
  "item_boundary": [
    "string (ECU_1, ECU_2, ...)"
  ],
  "operational_environment": {
    "domains": ["enum: vehicle | cloud | user_device"],
    "communication_protocols": ["enum: CAN | Ethernet | USB | UART | LIN"]
  },
  "item_description": "string (2-3 sentences describing the item's purpose)",
  "network_topology": {
    "type": "enum: star | ring | mesh | tree | point-to-point",
    "nodes": [
      {
        "node_id": "string",
        "node_type": "enum: ecu | gateway | sensor | actuator | backend_service",
        "domain": "enum: vehicle | cloud | user"
      }
    ],
    "edges": [
      {
        "from": "string (node_id)",
        "to": "string (node_id)",
        "protocol": "enum: CAN | Ethernet | USB | UART | LIN | MQTT | gRPC",
        "authenticated": "boolean"
      }
    ]
  },
  "created_timestamp": "ISO 8601 datetime"
}
```

**Validation rules:**
- `item_boundary` must not be empty
- `item_boundary` must match node IDs in `network_topology.nodes`
- `network_topology.edges` must not have self-loops (from == to)
- All enum values must be from the defined list (exact case match)

---

### Stage 02: Asset Analysis Output
**Input:** Stage 01 output (item-definition.json)  
**Output:** JSON file (asset-register.json)

```json
[
  {
    "asset_id": "string (AST-001 format)",
    "asset_name": "string",
    "asset_type": "enum: communication_path | data_store | ecu | function | sensor | actuator",
    "asset_description": "string (1–2 sentences)",
    "source_node": "string (node_id from Stage 01)",
    "source_feature": "string or null (if mapped to a feature from input)",
    "cia_confidentiality": "enum: negligible | low | medium | high | critical",
    "cia_integrity": "enum: negligible | low | medium | high | critical",
    "cia_availability": "enum: negligible | low | medium | high | critical",
    "cia_justification": "string (why these ratings)",
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- Asset array must not be empty
- `asset_id` must be unique within the array
- `source_node` must reference a valid node from Stage 01
- At least one CIA rating must not be "negligible"
- `cia_justification` must be non-empty

---

### Stage 03: Impact Analysis Output
**Input:** Stage 02 output (asset-register.json) + Layer 3 SFOP scale  
**Output:** JSON file (impact-analysis.json)

```json
[
  {
    "damage_id": "string (DMG-001 format)",
    "asset_id": "string (must match Stage 02 asset)",
    "cyber_property": "enum: confidentiality | integrity | availability",
    "damage_scenario": "string (2–3 sentence narrative)",
    "sfop_domains_affected": {
      "safety": "enum: 0 | 1 | 2 | 3 | 4 (negligible to severe)",
      "financial": "enum: 0 | 1 | 2 | 3 | 4",
      "operational": "enum: 0 | 1 | 2 | 3 | 4",
      "privacy": "enum: 0 | 1 | 2 | 3 | 4"
    },
    "impact_rating_value": "number (1–4, calculated: max of SFOP scores)",
    "impact_rating_level": "enum: negligible | minor | major | severe",
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- `damage_id` must be unique
- `asset_id` must exist in Stage 02 output
- At least one SFOP domain must be > 0
- `impact_rating_value` must equal `max(safety, financial, operational, privacy)` (deterministic engine validates)
- `impact_rating_level` must map correctly to value (1=negligible, 2=minor, 3=major, 4=severe)

---

### Stage 04: Threat Analysis Output
**Input:** Stage 03 output (impact-analysis.json) + Layer 3 STRIDE taxonomy + Layer 3 RISE/AutoISAC reference  
**Output:** JSON file (threat-analysis.json)

```json
[
  {
    "threat_id": "string (THR-001 format)",
    "asset_id": "string (must match Stage 02)",
    "damage_id": "string (must match Stage 03)",
    "stride_category": "enum: spoofing | tampering | repudiation | information_disclosure | denial_of_service | elevation_of_privilege",
    "threat_description": "string (2–3 sentences, what attacker does)",
    "attack_vector": "string (how attacker gains initial access)",
    "attack_path": [
      "string (step 1)",
      "string (step 2)",
      "string (step N, final outcome)"
    ],
    "abuse_case": "string (user story format: 'As an attacker, I want to ... so that ...')",
    "feasibility_sub_factors": {
      "elapsed_time": "number (1–5 scale: 5=seconds, 1=years)",
      "expertise_required": "number (1–5 scale: 5=novice, 1=expert)",
      "knowledge_of_target": "number (1–5 scale: 5=public, 1=zero)",
      "opportunity_window": "number (1–5 scale: 5=always open, 1=rare)",
      "equipment_cost": "number (1–5 scale: 5=free/readily available, 1=millions)"
    },
    "feasibility_sub_factor_justification": "string (why these scores)",
    "feasibility_rating_value": "number (calculated by deterministic engine, 1–5 or 1–625 raw)",
    "cvss_base_score_estimate": "string or number (optional; Claude estimate before deterministic calc)",
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- `threat_id` must be unique
- `asset_id` and `damage_id` must exist in previous stages
- `attack_path` must have at least 3 steps
- All feasibility sub-factors must be numbers between 1 and 5 (inclusive)
- `feasibility_sub_factor_justification` must be non-empty
- STRIDE category must match one of the 6 categories exactly
- `feasibility_rating_value` will be calculated by deterministic engine, but Claude's JSON can include null or a placeholder

---

### Stage 05: Risk Determination Output
**Input:** Stage 03 output (impact) + Stage 04 output (feasibility)  
**Output:** JSON file (risk-register.json)

```json
[
  {
    "risk_id": "string (RSK-001 format)",
    "threat_id": "string (from Stage 04)",
    "damage_id": "string (from Stage 03)",
    "impact_rating_value": "number (1–4, from Stage 03)",
    "feasibility_rating_value": "number (1–5, calculated from Stage 04 sub-factors)",
    "risk_score": "number (calculated: impact_value × feasibility_value)",
    "risk_level": "enum: low | medium | high | critical",
    "risk_rank": "number (1 = highest risk, N = lowest risk)",
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- `risk_id` must be unique
- `threat_id` and `damage_id` must exist in previous stages
- `impact_rating_value` and `feasibility_rating_value` must be numbers
- `risk_score` must equal `impact_rating_value × feasibility_rating_value`
- `risk_rank` must be consistent across all risks (no duplicates, 1 to N)
- Risk level must map to score (deterministic engine validates matrix lookup)

---

### Stage 06: Risk Treatment Output
**Input:** Stage 05 output (risk-register.json) + Layer 3 ISO 27001 controls catalog  
**Output:** JSON file (risk-treatment.json)

```json
[
  {
    "treatment_id": "string (TRT-001 format)",
    "risk_id": "string (from Stage 05)",
    "threat_id": "string (from Stage 04)",
    "treatment_type": "enum: avoid | reduce | transfer | accept",
    "controls": [
      "string (control name, e.g., 'CAN message authentication')"
    ],
    "control_ids": [
      "string (ISO 27001 Annex A mapping, e.g., 'A.13.1.1')"
    ],
    "treatment_justification": "string (why this treatment type, why these controls)",
    "residual_feasibility_estimate": "number (Claude's estimate of post-control feasibility, 1–5)",
    "residual_risk_score_estimate": "number (impact × residual_feasibility, for preview only)",
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- `treatment_id` must be unique
- `risk_id` and `threat_id` must exist in previous stages
- `treatment_type` must be one of the 4 enum values
- `controls` array must not be empty for reduce/transfer treatments (can be empty for accept)
- `control_ids` array must match number of controls (≥1 ID per control)
- `residual_feasibility_estimate` must be 1–5

---

### Stage 07: Residual Risk Output
**Input:** Stage 05 output (risk-register.json) + Stage 06 output (risk-treatment.json)  
**Output:** JSON file (residual-risk-register.json) + final TARA package (tara-package.json)

```json
[
  {
    "risk_id": "string (from Stage 05)",
    "threat_id": "string (from Stage 04)",
    "pre_treatment_risk_level": "enum: low | medium | high | critical",
    "post_treatment_feasibility_value": "number (1–5, based on treatment)",
    "residual_risk_score": "number (impact × post_treatment_feasibility)",
    "residual_risk_level": "enum: low | medium | high | critical",
    "acceptable": "boolean (true if residual risk is acceptable per ISO 21434 threshold)",
    "treatment_id": "string (reference to Stage 06 treatment applied)",
    "controls_applied": [
      "string (control name)"
    ],
    "created_timestamp": "ISO 8601 datetime"
  }
]
```

**Validation rules:**
- `risk_id` must exist in Stage 05
- `threat_id` must exist in Stage 04
- `post_treatment_feasibility_value` must be 1–5
- `residual_risk_score` must equal `impact_value × post_treatment_feasibility`
- `acceptable` must align with risk threshold (deterministic engine checks)

**Final TARA Package Contract:**
```json
{
  "assessment_metadata": {
    "assessment_id": "string (UUID)",
    "item_id": "string (from Stage 01)",
    "item_name": "string",
    "created_timestamp": "ISO 8601",
    "created_by": "string (engineer name/ID)"
  },
  "item_definition": { /* Stage 01 output */ },
  "asset_register": [ /* Stage 02 output */ ],
  "impact_analysis": [ /* Stage 03 output */ ],
  "threat_analysis": [ /* Stage 04 output */ ],
  "risk_register": [ /* Stage 05 output */ ],
  "risk_treatments": [ /* Stage 06 output */ ],
  "residual_risks": [ /* Stage 07 output */ ],
  "summary": {
    "total_assets": "number",
    "total_threats": "number",
    "total_risks": "number",
    "critical_risks_count": "number",
    "high_risks_count": "number",
    "accepted_risks_count": "number"
  }
}
```

---

## Tool Use Schemas (Claude API)

Each agent uses tool_use to submit structured output. Example (Stage 01):

```json
{
  "name": "submit_item_definition",
  "description": "Submit the parsed item definition as JSON",
  "input_schema": {
    "type": "object",
    "properties": {
      "item_id": { "type": "string" },
      "item_name": { "type": "string" },
      "item_boundary": { "type": "array", "items": { "type": "string" } },
      /* ... rest of Stage 01 schema ... */
    },
    "required": ["item_id", "item_name", "item_boundary", "operational_environment", "network_topology"]
  }
}
```

---

## Dependencies & Configuration

**No external dependencies** — schemas are pure JSON Schema (draft 7).

**Validation library** (Qwen will use during implementation):
- Option 1: `ajv` (Node.js) — compact, fast
- Option 2: Python `jsonschema` if tests use Python
- Option 3: Hand-written validators (if no external deps allowed)

**Configuration file:** `/src/schemas/config.json`
```json
{
  "schemaVersion": "1.0.0",
  "validationMode": "strict",
  "riskThreshold": {
    "acceptableLow": 0,
    "acceptableMedium": 4,
    "acceptableHigh": 0,
    "acceptableCritical": 0
  },
  "enumMappings": {
    "impactLevel": { "1": "negligible", "2": "minor", "3": "major", "4": "severe" },
    "riskLevel": { "1-4": "low", "5-8": "medium", "9-15": "high", "16-20": "critical" }
  }
}
```

---

## Assumptions

- **Enum values are case-insensitive in validation** (but stored lowercase in JSON)
- **UUIDs are optional; stage IDs (AST-001, DMG-001, etc.) are sufficient** for this tool
- **Timestamps are ISO 8601 (UTC)** — no timezone variations
- **No null fields in required arrays** (arrays can be empty for some stages, but if present, no nulls)
- **Deterministic engines will validate that calculated values match formula** (e.g., risk_score = impact × feasibility)
- **Schema evolution:** If schemas need to change mid-implementation, Claude updates both the schema AND all existing test fixtures

---

## Implementation Order

1. **Write all 7 stage output schemas** in JSON Schema format (not code)
2. **Write tool_use input schemas** for 4 agents (Stages 01, 02, 03, 04, 06)
3. **Create test fixtures** in `/tests/fixtures/`:
   - Valid outputs for each stage (golden path)
   - Invalid outputs (missing required fields, wrong enums, type mismatches)
4. **Freeze schemas** (mark as read-only in repo)
5. **Hand off to Qwen** for implementation

---

## Verification Steps

**How Qwen validates this spec is implemented:**

1. ✅ Run `npm test -- --testPathPattern=schemas` → all fixture validation passes
2. ✅ Run `node scripts/validate-schema.js < /path/to/stage-01-output.json` → returns valid or lists violations
3. ✅ Confirm no stage-to-stage contract violations (Stage 02 input must match Stage 01 output schema)
4. ✅ Tool use schemas can be passed to Claude API without parse errors
5. ✅ All enum values in sample outputs match the schema enums exactly

**Claude reviews:** Do the schemas unambiguously define what valid and invalid look like?

---

**DESIGN PHASE COMPLETE.** Review before implementing.

**Next step:** Claude writes individual stage agent specs (01–06), then Qwen implements all schemas in JSON files.

**Blockers:** None. This spec is foundational; all other specs depend on it.
