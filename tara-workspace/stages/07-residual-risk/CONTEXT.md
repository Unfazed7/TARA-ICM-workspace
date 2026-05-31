# Stage 07 — Residual Risk (Layer 2)

**Type:** Deterministic ONLY (custom logic — TBD)  
**Clause:** ISO 21434 §15.11  
**Checkpoint:** None

---

## Purpose

Calculate post-treatment residual risk for all risks that were treated. Determine acceptability. Produce final TARA package.

## Input

- `stages/05-risk-determination/output/risk-register.json`
- `stages/06-risk-treatment/output/risk-treatment.json`

## Output

- `output/residual-risk-register.json` — per-risk residual assessment
- `outputs/json/tara-final-package.json` — all 7 stages merged into one deliverable

## Layer 3 Files Loaded

- `_config/iso-21434-risk-matrix.json` — for residual risk level lookup

## STATUS: BLOCKED

Custom residual risk calculation logic not yet defined by Omkar.

Key questions to answer:
1. How do applied controls affect each feasibility sub-factor specifically?
   - Does MFA reduce `knowledge_of_target`? By how much?
   - Does rate limiting reduce `elapsed_time`?
2. Is the effect deterministic (formula) or qualitative (lookup table)?
3. What is the risk acceptability threshold?
   - Is residual_risk_level <= "medium" always acceptable?
   - Or does it depend on safety domain rating?
4. Does this stage re-evaluate the full threat model, or calculate from Stage 06 estimates?

## Provisional Process (Placeholder)

Until Omkar provides custom logic:

For each risk in risk-register.json:
1. Get treatment from risk-treatment.json (match by risk_id)
2. Use `residual_feasibility_estimate` from Stage 06 as `post_treatment_feasibility_value`
3. Calculate: `residual_risk_score = impact_rating_value × post_treatment_feasibility_value`
4. Look up `residual_risk_level` from iso-21434-risk-matrix.json
5. Set `acceptable = (residual_risk_level in ["low", "medium"])`

**NOTE: This provisional logic will be replaced by Omkar's custom logic.**

## Final Package Assembly

After residual-risk-register.json is written, orchestrator assembles tara-final-package.json:
```json
{
  "assessment_metadata": { ... },
  "item_definition": { /* Stage 01 output */ },
  "asset_register": [ /* Stage 02 output */ ],
  "impact_analysis": [ /* Stage 03 output */ ],
  "threat_analysis": [ /* Stage 04 output */ ],
  "risk_register": [ /* Stage 05 output */ ],
  "risk_treatments": [ /* Stage 06 output */ ],
  "residual_risks": [ /* Stage 07 output */ ],
  "summary": {
    "total_assets": N,
    "total_threats": N,
    "total_risks": N,
    "critical_risks_count": N,
    "high_risks_count": N,
    "accepted_risks_count": N
  }
}
```

## Risk ID Tracking

`residual-risk-register.json` uses same `risk_id` values from Stage 05.  
No new IDs introduced at Stage 07.
