# Stage 07 — Risk Treatment (Layer 2)

**Type:** AI (Claude standard)  
**Clause:** ISO/SAE 21434 §15.9  
**Checkpoint:** Required — human approves treatment decisions and control assignments  
**Status:** 🔲 BLOCKED — awaiting Controls DB schema from Omkar

---

## Purpose

For each risk in the risk register (RSK_##), propose a treatment option and assign one or more controls from the approved controls library. Treatment decisions must be justified against the risk level and asset context.

## Blocking Input Required

This stage cannot be specified until the following is received:

1. **Controls DB schema** — structure of the approved controls database
   - What fields does each control record have? (control_id, title, category, applicable_to, implementation_effort?)
   - Are controls pre-categorized by STRIDE? by CIAAAN property? by asset type?
   - Is the controls DB queried at runtime or loaded as a static file?

2. **Treatment option vocabulary** — what options are available?
   - Reduce (implement control to lower AFR or impact)
   - Accept (document residual risk acceptance)
   - Transfer (cyber insurance, third-party)
   - Avoid (remove feature)
   - Or a different vocabulary the organization uses?

3. **Checkpoint API contract** — how does the approval checkpoint work?
   - Is it an API call? A human-reviewed JSON file?
   - What fields does the checkpoint record need?

## Expected Input (once unblocked)

- `stages/06-risk-scoring/output/risk-register.json`
- `_controls-db/controls-library.json` (schema TBD)

## Expected Output (schema TBD)

`output/risk-treatment.json`

```json
[{
  "treatment_id": "TRT_01",
  "risk_id": "RSK_01",
  "threat_id": "TH_01",
  "treatment_option": "reduce|accept|transfer|avoid",
  "rationale": "string",
  "controls_assigned": ["CTRL_01", "CTRL_02"],
  "residual_risk_expected": "low|medium",
  "created_timestamp": "ISO 8601"
}]
```

## Provisional Derivation Rules (subject to revision)

1. `critical` and `high` risks → must propose `reduce` or `avoid`; `accept` requires explicit override
2. `medium` risks → any treatment option is valid with justification
3. `low` and `informational` risks → `accept` is the default unless controls are trivially available
4. Control selection: match controls by STRIDE category and CIAAAN property affected
5. At least one control per `reduce` treatment; zero controls for `accept`, `transfer`, `avoid`

## Validation Rules (provisional)

- `treatment_id` unique, TRT_## format
- `risk_id` must exist in Stage 06 output
- `treatment_option` from allowed enum
- `controls_assigned` must reference valid control IDs from controls library
- `rationale` must be non-empty

## Checkpoint

Human reviews: Is the treatment decision appropriate for the risk level? Are the assigned controls realistic for this system?
