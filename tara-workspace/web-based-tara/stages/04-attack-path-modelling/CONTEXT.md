# Stage 04 — Attack Path Modelling (Layer 2)

**Type:** AI — Extended Thinking ON  
**Clauses:** ISO/SAE 21434 §15.6 (attack paths), §15.8 (attack feasibility sub-factors)  
**Checkpoint:** Required — most critical human review gate

---

## Purpose

For each threat, model the most feasible attack path (exactly 5 steps), assign CVSS v3.1 exploitability metrics, and justify each metric. Extended thinking is used to reason through multi-step attack chains and identify circumvent steps.

## Input

`stages/03-threat-identification/output/threats.json`

## Layer 3 Files Loaded

- `_config/stride-taxonomy.md` — attack pattern guidance per STRIDE
- `_config/owasp-stride-mapping.md` — OWASP attack patterns mapped to STRIDE
- `_config/cvss-afr-formula.md` — CVSS metrics, definitions, and justification requirements

## Output

`output/attack-paths.json`

```json
[{
  "attack_id": "AT_01",
  "threat_id": "TH_01",
  "damage_scenario_id": "DS_01",
  "asset_id": "AS_01",
  "attack_description": "string (short label: 'Refresh token theft from browser storage')",
  "attack_path": {
    "step_1_initial_precondition": "string",
    "step_2_abuse_technique": "string",
    "step_3_exploit_effect": "string",
    "step_4_control_gap": "string",
    "step_5_threat_realization": "string"
  },
  "cvss_metrics": {
    "attack_vector": "N|A|L|P",
    "attack_complexity": "L|H",
    "privileges_required": "N|L|H",
    "user_interaction": "N|R"
  },
  "afr_value": null,
  "afr_label": null,
  "justifications": {
    "attack_vector": "string",
    "attack_complexity": "string",
    "privileges_required": "string",
    "user_interaction": "string"
  },
  "created_timestamp": "ISO 8601"
}]
```

`afr_value` and `afr_label` are null — engine fills them after this stage.

## 5-Step Attack Path Structure

**Derive attack paths by working backward from the impact (what goes wrong), not forward from the attacker.**

| Step | Name | What It Answers |
|------|------|----------------|
| Step 1 | Initial Precondition | What position or capability does the attacker already have? |
| Step 2 | Abuse Technique | What specific technique does the attacker use to advance? |
| Step 3 | Exploit Effect | What does the technique produce or enable? |
| Step 4 | Control / Validation Gap | What security control is absent or circumvented that allows this? |
| Step 5 | Threat Realization | What is the final attacker action that causes the damage scenario? |

Rules:
- All 5 steps must be present for every AT_##
- Steps must be causally linked — each step enables the next
- No gaps or logical jumps between steps
- Step 5 must directly cause the DS_##
- Include at least one specific security control that is bypassed or absent (usually in Step 4)

## CVSS Metric Assignment

Derive AV, AC, PR, UI from the attack path mechanism — not from the threat statement.

The metrics describe HOW the attack in Steps 1-5 works:
- AV: How does the attacker reach the target in Step 1? (Network = internet; Adjacent = same network; Local = console access)
- AC: Does the attack in Steps 2-3 require any special conditions? (Low = repeatable; High = timing/positioning required)
- PR: What access does the attacker need in Step 1? (None = no account; Low = basic account; High = admin account)
- UI: Does any step require a legitimate user to perform an action? (None = attacker-only; Required = user must do something)

## Justification Requirements

For each of the 4 CVSS metrics, write 2-4 sentences:
- Derive from the attack path, not the threat statement
- State specifically which step(s) inform this metric
- Explain why this value and not the adjacent value
- No hedging language ("may", "could") — direct and audit-ready

## Extended Thinking Usage

Budget: Start at 8,000 tokens per batch of threats. Adjust based on real data.

Extended thinking is used for:
- Reasoning through multi-step attack chains where intermediate steps are non-obvious
- Identifying the most realistic (not the most catastrophic) attack path
- Ensuring the circumvent step reflects an actual control weakness, not a hypothetical one

## Post-Stage Engine Run

After attack-paths.json is submitted, orchestrator calls `_engines/cvss-afr-calc.js` for each path.  
Engine fills `afr_value` and `afr_label` using the CVSS formula.  
This updated file feeds Stage 06 (Risk Scoring).

## Validation Rules

- `attack_id` unique, AT_## format
- `threat_id` must exist in Stage 03 output
- All 5 attack path steps must be non-empty strings
- `cvss_metrics` values must be from allowed enums
- All 4 justifications must be non-empty
- `afr_value` = null at submission (engine fills it)

## Checkpoint

Human reviews: Are attack paths realistic for this specific system? Does each CVSS metric match the attack mechanism? Are the circumvent steps plausible?
