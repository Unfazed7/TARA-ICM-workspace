# Web-Based TARA — Stage Routing (Layer 1)

Loaded by `run-web-tara.js` at start of each assessment.

---

## Stage Routing Table

| Stage | Dir | Type | Input | Output | Checkpoint |
|-------|-----|------|-------|--------|-----------|
| 01 Input Normalization | `stages/01-input-normalization/` | AI or Deterministic | Asset List CSV **or** Architecture PNG | `asset-register.json` | None |
| 02 Damage Analysis | `stages/02-damage-analysis/` | AI | `asset-register.json` | `damage-scenarios.json` | Required |
| 03 Threat Identification | `stages/03-threat-identification/` | AI | `damage-scenarios.json` | `threats.json` | Required |
| 04 Attack Path Modelling | `stages/04-attack-path-modelling/` | AI (ext. thinking) | `threats.json` | `attack-paths.json` | Required |
| 05 Impact Analysis | `stages/05-impact-analysis/` | AI | `threats.json` + `damage-scenarios.json` | `impact-analysis.json` | Required |
| 06 Risk Scoring | `stages/06-risk-scoring/` | Deterministic | `attack-paths.json` + `impact-analysis.json` | `risk-register.json` | None |
| 07 Risk Treatment | `stages/07-risk-treatment/` | AI | `risk-register.json` | `risk-treatment.json` | Optional |
| 08 Residual Risk | `stages/08-residual-risk/` | Deterministic | `risk-register.json` + `risk-treatment.json` | `residual-risk.json` | None |

---

## Layer 3 Loading Map

Each stage loads ONLY what it needs:

| Stage | Load from _config/ |
|-------|-------------------|
| 01 | `web-asset-types.md`, `ciaaan-properties.md` |
| 02 | `ciaaan-properties.md`, `web-tara-constraints.md` |
| 03 | `stride-taxonomy.md`, `owasp-stride-mapping.md` |
| 04 | `stride-taxonomy.md`, `owasp-stride-mapping.md`, `cvss-afr-formula.md` |
| 05 | `impact-dimensions.md`, `web-tara-constraints.md` |
| 06 | `iso-21434-risk-matrix.json` |
| 07 | (external controls DB — schema TBD) |
| 08 | `iso-21434-risk-matrix.json` |

---

## ID Conventions (Cross-Resolved Across ALL Outputs)

| Entity | Format | Example |
|--------|--------|---------|
| Assets | AS_## | AS_01, AS_02 |
| Damage Scenarios | DS_## | DS_01, DS_02 |
| Threats | TH_## | TH_01, TH_02 |
| Attack Paths | AT_## | AT_01, AT_02 |
| Impact Records | IM_## | IM_01, IM_02 |
| Risks | RSK_## | RSK_01, RSK_02 |
| Treatments | TRT_## | TRT_01, TRT_02 |

**No orphan IDs permitted.** Every DS_## must have a TH_##. Every TH_## must have an AT_## and an IM_##. Every AT_## must have a RSK_##.

---

## Assessment State File

Written to: `outputs/json/assessment-state.json`

```json
{
  "assessment_id": "WEB-TARA-2026-001",
  "tara_type": "web-based",
  "item_name": "string",
  "input_mode": "asset-list | architecture-diagram",
  "status": "in_progress | awaiting_checkpoint | completed | failed",
  "current_stage": "02-damage-analysis",
  "stages_completed": ["01-input-normalization"],
  "checkpoints_approved": [],
  "started_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

---

## Output Files Reference

| File | Stage | Produced By |
|------|-------|------------|
| `asset-register.json` | 01 | Input normalizer |
| `damage-scenarios.json` | 02 | AI agent |
| `threats.json` | 03 | AI agent |
| `attack-paths.json` | 04 | AI agent + engine (CVSS AFR) |
| `impact-analysis.json` | 05 | AI agent |
| `risk-register.json` | 06 | Deterministic engine |
| `risk-treatment.json` | 07 | AI agent (BLOCKED) |
| `residual-risk.json` | 08 | Deterministic engine (BLOCKED) |
| `tara-final-package.json` | Post-08 | Orchestrator merge |
| `TARA_Report_YYYY-MM-DD.xlsm` | Post-08 | Excel formatter |
| `audit-trail.json` | Ongoing | Audit logger |
