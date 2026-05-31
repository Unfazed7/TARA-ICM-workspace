# Stage 05 — Risk Determination (Layer 2)

**Type:** Deterministic ONLY (no AI)  
**Clause:** ISO 21434 §15.10  
**Checkpoint:** None

---

## Purpose

Calculate final risk scores for all threats. This is a pure mathematical function — no AI involved. Results are reproducible, auditable, and compliant with ISO 21434 §15.10.

## Input

- `stages/03-impact-analysis/output/impact-analysis.json` (for impact_rating_value per damage)
- `stages/04-threat-analysis/output/threat-analysis.json` (for feasibility_rating_value per threat)

## Output

`output/risk-register.json` — array of risk objects, sorted by risk_score descending.  
See schema in `.meta/specs/00-json-schema-contracts.md`.

## Layer 3 Files Loaded

- `_config/iso-21434-risk-matrix.json` — lookup table for risk_level from score
- `_config/feasibility-formula.md` — AFR formula reference (for audit trail)

## Process

For each threat in threat-analysis.json:
1. Look up `impact_rating_value` from impact-analysis.json (match via damage_id)
2. Get `feasibility_rating_value` from threat-analysis.json (already filled by engine in Stage 04)
3. Calculate: `risk_score = impact_rating_value × feasibility_rating_value`
4. Look up `risk_level` from iso-21434-risk-matrix.json
5. Assign `risk_id` (RSK-001 format)
6. Write to risk-register.json

After all risks calculated:
7. Sort by `risk_score` descending
8. Assign `risk_rank` (1 = highest risk, N = lowest)

## Risk Level Thresholds

From iso-21434-risk-matrix.json:
- critical: score 16-20
- high: score 10-15
- medium: score 5-9
- low: score 1-4

## Validation Rules

- `risk_id` unique within array
- `threat_id` must exist in Stage 04 output
- `damage_id` must exist in Stage 03 output
- `risk_score` must exactly equal `impact_rating_value × feasibility_rating_value`
- `risk_rank` must be sequential integers 1..N with no duplicates
- Ties in risk_score: break by impact_rating_value (higher impact ranks higher)

## No Checkpoint

This stage is purely deterministic. No human review required.  
The math is auditable — if inputs are correct, outputs are correct.

## Risk ID Naming

```
RSK-{NNN}  — Sequential, zero-padded (RSK-001, RSK-002, ...)
```
