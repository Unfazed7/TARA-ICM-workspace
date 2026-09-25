# Web-Based TARA: Stage Routing (Layer 1)

Loaded by `run-web-tara.js` at the start of each assessment. The flow and its rules are in `CLAUDE.md` (Layer 0) and `.meta/DECISIONS.md` (D-01, D-02).

---

## Stage Routing Table

| Stage | Dir | Type | Input | Output | Checkpoint |
|-------|-----|------|-------|--------|-----------|
| 01 Input Normalization | `stages/01-input-normalization/` | AI plus deterministic reconciliation | Client documents plus boundary statement | `document-register.json`, `facts.json` | CP0 Reading review |
| 02 Item Definition | `stages/02-item-definition/` | AI plus deterministic grouping | CP0-confirmed facts and answers (from API) | `item-definition.json`, `questions.json` | CP1 Item Definition review |
| 03 Asset Identification | `stages/03-asset-identification/` | AI | Finalized Item Definition (from API) | `asset-register.json` | Light review (full review of the CIAAAN column) |
| 04 Damage Analysis | `stages/04-damage-analysis/` | AI | `asset-register.json` | `damage-scenarios.json` | Required |
| 05 Threat Identification | `stages/05-threat-identification/` | AI | `damage-scenarios.json` | `threats.json` | Required |
| 06 Attack Path Modelling | `stages/06-attack-path-modelling/` | AI (deeper reasoning) plus CVSS engine | `threats.json` | `attack-paths.json` | Required |
| 07 Impact Analysis | `stages/07-impact-analysis/` | AI | `threats.json` plus `damage-scenarios.json` | `impact-analysis.json` | Required |
| 08 Risk Scoring | `stages/08-risk-scoring/` | Deterministic | `attack-paths.json` plus `impact-analysis.json` | `risk-register.json` | None |
| 09 Risk Treatment | `stages/09-risk-treatment/` | AI | `risk-register.json` | `risk-treatment.json` | Optional |
| 10 Residual Risk | `stages/10-residual-risk/` | Deterministic | `risk-register.json` plus `risk-treatment.json` | `residual-risk.json` | None |

No stage after CP0 re-reads client documents. No stage after CP1 reads anything except the finalized Item Definition and later stage outputs.

---

## Layer 3 Loading Map

Each stage loads only what it needs from `_config/`:

| Stage | Load from _config/ |
|-------|-------------------|
| 01 | `source-precedence.md`, `analyst-language.md` (both created in B2) |
| 02 | `element-kinds.md`, `scoping-facts.md`, `analyst-language.md` (all created in B2) |
| 03 | `web-asset-types.md`, `ciaaan-properties.md` |
| 04 | `ciaaan-properties.md`, `web-tara-constraints.md` |
| 05 | `stride-taxonomy.md`, `owasp-stride-mapping.md` |
| 06 | `stride-taxonomy.md`, `owasp-stride-mapping.md`, `cvss-afr-formula.md` |
| 07 | `impact-dimensions.md`, `web-tara-constraints.md` |
| 08 | `iso-21434-risk-matrix.json` |
| 09 | `controls-catalogue.md`, `web-tara-constraints.md` |
| 10 | `iso-21434-risk-matrix.json` |

Model settings for every stage come from `_config/models.json` (created in B2, filled in C1).

---

## ID Conventions (Cross-Resolved Across ALL Outputs)

Stages 01 and 02 (from spec 12a to 12c):

| Entity | Format | Example |
|--------|--------|---------|
| Documents | DOC-## | DOC-01 |
| Facts | FCT-### | FCT-001 |
| Conflicts | CNF-### | CNF-001 |
| Containers | CTR-## | CTR-01 |
| Zones | ZN-## | ZN-01 |
| Elements | EL-### | EL-001 |
| Links (data flows and exposures) | IF-## | IF-01 |
| Functions | FN-### | FN-001 |
| Questions | Q-### | Q-001 |
| Scope decisions | SD-### | SD-001 |
| Analyst decisions | AD-### | AD-001 |
| Assumptions | ASM-## | ASM-01 |

Stages 03 onwards:

| Entity | Format | Example |
|--------|--------|---------|
| Assets | AS_## | AS_01, AS_02 |
| Damage Scenarios | DS_## | DS_01, DS_02 |
| Threats | TH_## | TH_01, TH_02 |
| Attack Paths | AT_## | AT_01, AT_02 |
| Impact Records | IM_## | IM_01, IM_02 |
| Risks | RSK_## | RSK_01, RSK_02 |
| Treatments | TRT_## | TRT_01, TRT_02 |

**No orphan IDs permitted.** Every fact points to a registered document. Every element, link, container, zone and function points to confirmed facts. Every DS_## must have a TH_##. Every TH_## must have an AT_## and an IM_##. Every AT_## must have a RSK_##.

---

## Assessment State File

Written to: `outputs/json/assessment-state.json`

```json
{
  "assessment_id": "WEB-TARA-2026-001",
  "tara_type": "web-based",
  "item_name": "string",
  "status": "in_progress | awaiting_checkpoint | completed | failed",
  "current_stage": "02-item-definition",
  "stages_completed": ["01-input-normalization"],
  "checkpoints_confirmed": ["CP0"],
  "started_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

---

## Output Files Reference

| File | Stage | Produced By |
|------|-------|------------|
| `document-register.json` | 01 | Stage 01 agent (deterministic parts: hash, type, read status) |
| `facts.json` | 01 | Stage 01 agent plus reconciliation engine |
| `item-definition.json` | 02 | Stage 02 agent plus deterministic grouping |
| `questions.json` | 02 | Stage 02 agent, filtered by the server |
| `asset-register.json` | 03 | Stage 03 agent |
| `damage-scenarios.json` | 04 | AI agent |
| `threats.json` | 05 | AI agent |
| `attack-paths.json` | 06 | AI agent plus engine (CVSS AFR) |
| `impact-analysis.json` | 07 | AI agent |
| `risk-register.json` | 08 | Deterministic engine |
| `risk-treatment.json` | 09 | AI agent |
| `residual-risk.json` | 10 | Deterministic engine |
| `tara-final-package.json` | After 10 | Orchestrator merge |
| `TARA_Report_YYYY-MM-DD.xlsm` | After 10 | Excel formatter |
| `audit-trail.json` | Ongoing | Audit logger (model, provider and prompt version per call) |

Outputs of stages 01 to 03 are raw machine output for debugging and audit. The confirmed state lives in `checkpoint-api`.
