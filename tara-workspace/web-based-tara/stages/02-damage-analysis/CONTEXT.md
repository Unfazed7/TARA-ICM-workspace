# Stage 02 — Damage Analysis (Layer 2)

**Type:** AI (Claude standard)  
**Checkpoint:** Required — human reviews damage scenario realism and stakeholder identification  
**Clause:** ISO/SAE 21434 §15.4 (damage scenario derivation)

---

## Purpose

For each asset × applicable CIAAAN property combination, derive one specific damage scenario. Damage scenarios are the analytical foundation — all threats, attack paths, and impact ratings are derived FROM these.

## Input

`stages/01-input-normalization/output/asset-register.json`

## Layer 3 Files Loaded

- `_config/ciaaan-properties.md` — property definitions and guidance
- `_config/web-tara-constraints.md` — domain constraints (NR framing, language rules)

## Output

`output/damage-scenarios.json`

```json
[{
  "damage_id": "DS_01",
  "asset_id": "AS_01",
  "asset_title": "string",
  "property": "confidentiality|integrity|availability|authenticity|authorization|non_repudiation",
  "damage_scenario": "string (see format below)",
  "stakeholder_affected": "tool_user|organization|vehicle_owner|regulator|oem",
  "created_timestamp": "ISO 8601"
}]
```

## Cardinality

One DS_## per (asset × applicable CIAAAN property).  
Example: AS_01 with C=Y, Au=Y, Az=Y → DS_01 (C), DS_02 (Au), DS_03 (Az)

## Damage Scenario Format (Mandatory)

`"If the [CIAAAN property] of [Asset Title] is compromised, [specific adverse consequence] affecting [specific stakeholder] in the context of [specific function or feature]."`

Rules:
- No attacker language (no "an attacker", "hacker", "malicious actor")
- Specific consequence, not generic ("unauthorized access to vehicle diagnostics" not "data loss")
- Correct stakeholder named (tool user = dealer technician; organization = OEM; vehicle owner = end user)
- Grounded in what the asset actually does in this system

## Non-Repudiation Scenarios — Special Rule

NR scenarios describe the ABSENCE OF ACCOUNTABILITY, not data exposure.

Correct: "If Non-repudiation of the Diagnostic Command Log is compromised, the platform cannot prove that a specific technician executed remote commands, enabling action denial during vehicle incident investigations."

Incorrect: "If NR of the Diagnostic Command Log is compromised, log data is exposed." ← This is an Integrity or Confidentiality scenario.

## Self-Test (Apply Before Every DS_##)

Ask: "Is this scenario specific to this asset's role in this system?"  
If the scenario could be copied unchanged to a different asset with the same property → rederive.  
Each asset has a different role, location, and functional context — the damage must reflect that.

## Validation Rules

- `damage_id` unique within array, DS_## format
- `asset_id` must exist in Stage 01 output
- `property` must be one of the 6 CIAAAN properties
- No attacker language in `damage_scenario`
- `stakeholder_affected` must be specific and correct
- At least one DS_## per asset per applicable property

## Checkpoint

Human reviews: Are damage scenarios specific to each asset? Do they correctly identify the stakeholder harmed? Are NR scenarios framed as accountability absence?
