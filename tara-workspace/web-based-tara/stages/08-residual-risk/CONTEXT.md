# Stage 08 — Residual Risk (Layer 2)

**Type:** Deterministic ONLY  
**Clause:** ISO/SAE 21434 §15.9 (post-treatment risk)  
**Checkpoint:** Required — final human sign-off before TARA report generation  
**Status:** 🔲 BLOCKED — awaiting residual risk calculation logic from Omkar

---

## Purpose

After treatment controls are assigned, recalculate the risk score reflecting the expected reduction from applied controls. Produce the final residual risk register used for TARA report generation and compliance evidence.

## Blocking Input Required

This stage cannot be specified until the following is received:

1. **Residual risk calculation logic** — how should controls reduce the risk score?
   - Does control application reduce `afr_value` (attack feasibility decreases)?
   - Does control application reduce `impact_rating_value` (impact decreases)?
   - Or is there a separate residual score formula?
   - Is there a per-control "effectiveness weight"?

2. **Accepted risk threshold** — what constitutes an acceptable residual risk level?
   - Is there a company-specific maximum acceptable risk level?
   - How should accepted risks (treatment_option = "accept") be recorded in residual risk?

3. **Report generation format** — what does the final TARA output require?
   - Excel format? PDF? JSON only?
   - What fields must appear in the compliance evidence artifact?

## Expected Input (once unblocked)

- `stages/06-risk-scoring/output/risk-register.json`
- `stages/07-risk-treatment/output/risk-treatment.json`
- `_controls-db/controls-library.json` (same as Stage 07)

## Expected Output (schema TBD)

`output/residual-risk.json`

```json
[{
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
}]
```

## Provisional Calculation Logic (placeholder — do not implement until Omkar confirms)

```
residual_risk_score = f(original_risk_score, controls_assigned, treatment_option)
```

- Controls that target AV/AC/PR/UI reduce `afr_value`
- Controls that target impact dimensions reduce `impact_rating_value`
- Recalculate: `residual_risk_score = new_impact_rating_value × new_afr_value`
- For `accept` treatment: `residual_risk_score = original_risk_score` (no reduction)

## Validation Rules (provisional)

- `residual_id` unique, RR_## format
- `risk_id` must exist in Stage 06 output
- `treatment_id` must exist in Stage 07 output
- `residual_risk_score ≤ original_risk_score` (controls never increase risk)
- `residual_risk_level` must match risk level thresholds from `iso-21434-risk-matrix.json`
- For `accept` treatments: `residual_risk_score = original_risk_score`

## No Free-Text Generation

This stage is fully deterministic. All values are computed from inputs. AI is not involved.

## Checkpoint

Final human sign-off: Are residual risks acceptable? Are any unacceptable risks escalated for additional treatment? This checkpoint gates TARA report generation.
