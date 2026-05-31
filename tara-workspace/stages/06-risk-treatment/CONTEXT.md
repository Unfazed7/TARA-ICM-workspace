# Stage 06 — Risk Treatment (Layer 2)

**Type:** AI (Claude standard)  
**Clause:** ISO 21434 §15.11  
**Checkpoint:** Optional (org policy)

---

## Purpose

For each risk, determine treatment type and recommend specific controls. Map controls to NIST 800-53 and ISO 27001 Annex A. Estimate residual feasibility after controls are applied.

## Input

`stages/05-risk-determination/output/risk-register.json`

## Output

`output/risk-treatment.json` — array of treatment objects.  
See schema in `.meta/specs/00-json-schema-contracts.md`.

## Layer 3 Files Loaded

- `_config/iso27001-controls.md` — ISO 27001:2022 Annex A catalog
- Controls DB (external — schema TBD, provided by Omkar) — for org-specific controls

## STATUS: BLOCKED

This stage spec cannot be finalized until:
1. Controls DB schema and access method defined by Omkar
2. Checkpoint API contract defined by Omkar

## Process (Draft — Subject to Change)

For each risk in risk-register.json:
1. Determine treatment type based on risk_level:
   - critical/high: always `reduce` (rarely `transfer`)
   - medium: `reduce` or `accept` with documented rationale
   - low: `accept` is permissible
2. Query controls database for applicable controls (match by STRIDE category)
3. Recommend 1-3 specific controls
4. Map each control to ISO 27001 Annex A control ID
5. Estimate residual feasibility after controls applied (still AI estimate — engine in Stage 07 calculates final)
6. Write justification explaining why this treatment and these controls

## Treatment Types

| Type | When to Use |
|------|------------|
| avoid | Eliminate the asset/function that creates the risk |
| reduce | Implement controls to lower feasibility or impact |
| transfer | Shift risk to third party (cyber insurance, SLA) |
| accept | Document risk acceptance with business justification |

## Control Recommendation Rules

- `reduce` treatment: must have at least 1 control
- `transfer` treatment: specify the transfer mechanism (insurance policy, SLA clause)
- `accept` treatment: controls array can be empty; justification must be thorough
- Each control must have an ISO 27001 Annex A control_id mapping

## Treatment ID Naming

```
TRT-{NNN}  — Sequential, zero-padded (TRT-001, TRT-002, ...)
```

## Residual Feasibility Estimate

AI provides an estimate of post-control feasibility (1-5).  
This is an ESTIMATE — Stage 07 calculates the deterministic final value.  
Must be lower than the original feasibility_rating_value (controls must reduce something).
