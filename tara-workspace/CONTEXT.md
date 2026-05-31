# TARA Lima — Stage Routing & Assessment State (Layer 1)

Loaded by orchestrator at start of each assessment run.

---

## Stage Routing Table

| Stage | Dir | Type | Input Files | Output File | Checkpoint |
|-------|-----|------|-------------|-------------|-----------|
| 01 Item Definition | `stages/01-item-definition/` | AI | `references/architecture.png` + `references/features.xlsx` | `item-definition.json` | Required |
| 02 Asset Analysis | `stages/02-asset-analysis/` | AI | `01/.../item-definition.json` | `asset-register.json` | Required |
| 03 Impact Analysis | `stages/03-impact-analysis/` | AI + Engine | `02/.../asset-register.json` | `impact-analysis.json` | Required |
| 04 Threat Analysis | `stages/04-threat-analysis/` | AI (ext. thinking) | `02+03 outputs` | `threat-analysis.json` | Required |
| 05 Risk Determination | `stages/05-risk-determination/` | Deterministic | `03+04 outputs` | `risk-register.json` | None |
| 06 Risk Treatment | `stages/06-risk-treatment/` | AI | `05/.../risk-register.json` | `risk-treatment.json` | Optional |
| 07 Residual Risk | `stages/07-residual-risk/` | Deterministic | `05+06 outputs` | `residual-risk-register.json` + `tara-final-package.json` | None |

---

## Layer 3 Loading Map

Each stage loads ONLY what it needs. Nothing more.

| Stage | Load from _config/ |
|-------|-------------------|
| 01 | (none) |
| 02 | `web-asset-types.md` |
| 03 | `sfop-scale.md` |
| 04 | `stride-taxonomy.md`, `owasp-stride-mapping.md` |
| 05 | `iso-21434-risk-matrix.json`, `feasibility-formula.md` |
| 06 | `nist-800-53-controls.md` (or external DB), `iso27001-controls.md` |
| 07 | `iso-21434-risk-matrix.json` |

---

## Assessment State File

Written by orchestrator to: `outputs/json/assessment-state.json`

```json
{
  "assessment_id": "TARA-2026-001",
  "item_name": "string",
  "status": "in_progress | completed | failed | awaiting_checkpoint",
  "current_stage": "02-asset-analysis",
  "stages_completed": ["01-item-definition"],
  "checkpoints_approved": ["01-item-definition"],
  "started_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

---

## Error Recovery

If a stage agent fails:
1. Log error to `outputs/audit-trail/audit-trail.json`
2. Write `{ error, stage, timestamp }` to `stages/0X/output/error.json`
3. Halt pipeline — do not proceed to next stage
4. User restarts from the failed stage

If a checkpoint is rejected (`approved: false`):
1. Append feedback to stage context
2. Re-run stage agent
3. Re-submit to checkpoint
4. Maximum 3 retries — halt on 3rd failure

---

## Output Files Reference

| Output | Location | When Written |
|--------|----------|-------------|
| Stage JSONs | `stages/0X/output/` | After each stage |
| Assessment state | `outputs/json/assessment-state.json` | After each stage transition |
| TARA final package | `outputs/json/tara-final-package.json` | After stage 07 |
| Excel report | `outputs/excel/TARA_Report_YYYY-MM-DD.xlsm` | After stage 07 |
| Audit trail | `outputs/audit-trail/audit-trail.json` | After every AI API call |
