# Stage 06 — Risk Scoring (Layer 2)

**Type:** Deterministic ONLY  
**Clause:** ISO/SAE 21434 §15.8  
**Checkpoint:** None — purely mathematical, reproducible

---

## Purpose

Calculate final risk scores for all threats by combining the Impact Rating (from Stage 05) with the AFR (computed from Stage 04 CVSS metrics). Rank all risks. No AI involved — fully auditable and reproducible.

## Input

- `stages/04-attack-path-modelling/output/attack-paths.json` (for `afr_value` per threat)
- `stages/05-impact-analysis/output/impact-analysis.json` (for impact rating per threat)

## Layer 3 Files Loaded

- `_config/iso-21434-risk-matrix.json` — impact × feasibility → risk level lookup

## Output

`output/risk-register.json`

```json
[{
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
  "risk_level": "medium",
  "risk_rank": 1,
  "created_timestamp": "ISO 8601"
}]
```

## Impact Rating Conversion

Convert 7-dimension ratings to a single numeric value for risk calculation:

```
impact_rating_value = max(privacy_numeric, operational_numeric, legal_numeric, financial_org_numeric, business_numeric)

where:
  Negligible → 0
  Moderate   → 1
  Major      → 2
  Severe     → 3
```

Note: Tool User Safety and Tool User Financial are always Negligible (0) for web TARA — they contribute 0 to the max.

## Risk Score Formula

```
risk_score = impact_rating_value × afr_value
```

| impact_rating_value | 0 | 1 | 2 | 3 |
|---------------------|---|---|---|---|
| afr_value 1 | 0 | 1 | 2 | 3 |
| afr_value 2 | 0 | 2 | 4 | 6 |
| afr_value 3 | 0 | 3 | 6 | 9 |
| afr_value 4 | 0 | 4 | 8 | 12 |
| afr_value 5 | 0 | 5 | 10 | 15 |

Risk level thresholds (from iso-21434-risk-matrix.json):
- critical: 12-15
- high: 8-11
- medium: 4-7
- low: 1-3
- informational: 0

## Ranking

After all risks calculated:
1. Sort by `risk_score` descending
2. Assign `risk_rank` (1 = highest risk, N = lowest)
3. Tie-break: higher `afr_value` ranks higher (more feasible = higher priority)

## Validation Rules

- `risk_id` unique, RSK_## format
- All cross-reference IDs must exist in their respective stage outputs
- `risk_score` must exactly equal `impact_rating_value × afr_value`
- `risk_rank` must be sequential integers 1..N with no duplicates
- `risk_level` must match the matrix lookup exactly

## No Checkpoint

Purely deterministic. If inputs are validated, outputs are correct. No human review required.
