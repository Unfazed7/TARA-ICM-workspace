# TARA Lima — Runtime Identity (Layer 0)

**Tool:** Automated TARA (Threat Analysis & Risk Assessment)  
**Model:** claude-sonnet-4-20250514  
**Standards:** ISO/SAE 21434 + UNECE WP.29/R155 + NIST 800-53 + ISO 27001:2022  
**Scope (MVP):** Web-based automotive applications

---

## What This Tool Does

Runs a 7-stage automated TARA on a target web-based automotive system:

| Stage | Type | Purpose |
|-------|------|---------|
| 01 Item Definition | AI (Vision) | Extract system boundary, components, protocols |
| 02 Asset Analysis | AI | Identify assets, assign CIA ratings |
| 03 Impact Analysis | AI + Engine | Generate damage scenarios, rate SFOP impact |
| 04 Threat Analysis | AI (extended thinking) | STRIDE threats, attack paths, feasibility sub-factors |
| 05 Risk Determination | Deterministic | impact × feasibility → risk level |
| 06 Risk Treatment | AI | Recommend controls, map to standards |
| 07 Residual Risk | Deterministic | Post-treatment risk calculation |

**AI stages:** 1, 2, 3, 4, 6  
**Deterministic stages:** 5, 7  
**Extended thinking:** Stage 4 ONLY

---

## ICM Architecture (5 Layers)

```
Layer 0: tara-workspace/CLAUDE.md          ← THIS FILE. Always loaded.
Layer 1: tara-workspace/CONTEXT.md         ← Stage routing, assessment state.
Layer 2: stages/*/CONTEXT.md               ← Per-stage instructions. Load per stage.
Layer 3: _config/                          ← Static domain knowledge. Load selectively.
Layer 4: stages/*/output/                  ← Runtime artifacts. Written/read per stage.
```

---

## Rules for AI Agents (Non-Negotiable)

1. **NEVER generate risk numbers.** Feasibility values, impact ratings, risk scores = deterministic engines only.
2. **ALWAYS use tool_use** to submit structured output. Never return free-text JSON.
3. **Load ONLY the Layer 3 files** specified for your stage. See CONTEXT.md routing table.
4. **Log every API call** to the audit trail before returning to orchestrator.
5. **Output MUST match** the JSON schema in `.meta/specs/00-json-schema-contracts.md` exactly.

---

## Checkpoint Protocol

Stages 1, 2, 3, 4 require human approval before pipeline continues.

```
POST {CHECKPOINT_URL}
Body: { stage_id, output_json, assessment_id }
Response: { approved: boolean, feedback?: string }
```

On rejection (`approved: false`): re-run stage with feedback appended to context. Max 3 retries.  
On approval: write stage output to `stages/0X/output/`, proceed to next stage.

Fallback (no API): presence of `.APPROVED` file in `stages/0X/output/` = approved.

---

## File Ownership at Runtime

| Path | Read | Write |
|------|------|-------|
| `_engines/` | Orchestrator, stage runners | Never at runtime |
| `_config/` | AI agents (selectively) | Never at runtime |
| `stages/*/output/` | Next stage agent | Current stage agent |
| `outputs/` | Output formatters | Output formatters |

---

**This file is read-only. Do not modify during an assessment run.**
