# Stage 03 — Threat Identification (Layer 2)

**Type:** AI (Claude standard)  
**Checkpoint:** Required — human reviews threat specificity and causal accuracy  
**Clause:** ISO/SAE 21434 §15.5

---

## Purpose

Derive exactly one threat per damage scenario. Threats are the direct cause of their damage scenario — derived by working backward from DS_## to find the specific attack action that would cause that exact damage.

## Input

`stages/02-damage-analysis/output/damage-scenarios.json`

## Layer 3 Files Loaded

- `_config/stride-taxonomy.md` — STRIDE category definitions
- `_config/owasp-stride-mapping.md` — OWASP → STRIDE mapping

## Output

`output/threats.json`

```json
[{
  "threat_id": "TH_01",
  "damage_scenario_id": "DS_01",
  "asset_id": "AS_01",
  "asset_title": "string",
  "property": "confidentiality|integrity|availability|authenticity|authorization|non_repudiation",
  "stride_category": "spoofing|tampering|repudiation|information_disclosure|denial_of_service|elevation_of_privilege",
  "threat_statement": "string (see format below)",
  "derivation_note": "string (why this threat causes DS_01)",
  "owasp_reference": "A01|A02|...|API1|...|null",
  "created_timestamp": "ISO 8601"
}]
```

## Threat Derivation Rules (Mandatory)

**Rule 1 — Derive from the damage scenario, not the property label.**  
Start from DS_## and ask: "What specific attack action against this asset would cause this exact damage?"  
Do NOT start from the CIAAAN label and work forward — this produces generic threats.

**Rule 2 — Threat must name the specific asset.**  
Threat statements must reference the asset by name or function. A threat that could apply unchanged to any other asset with the same CIAAAN property must be rejected and rederived.

**Rule 3 — Direct causation only.**  
The threat directly compromises the asset + property in one causal step. No "which could then lead to…" or "potentially enabling…" language. The threat answers: "Does executing this attack directly compromise [Asset] + [Property]?" — Yes without qualification.

**Rule 4 — One threat per damage scenario.**  
Do not split one DS_## into multiple threats. Do not merge multiple DS_## into one threat.

## Self-Test (Apply Before Every TH_##)

Test 1: Replace the asset name with a different asset that has the same CIAAAN property. Does the threat statement still make sense verbatim? If YES → too generic, rederive.

Test 2: Does this threat appear more than once across all derived threats? If YES → at least one instance is copy-pasted, rederive from its own DS_##.

## STRIDE Assignment

Assign STRIDE category based on the nature of the compromise:
- Spoofing (Au) → identity forgery, impersonation, token replay
- Tampering (I) → unauthorized modification of data or code
- Repudiation (NR) → denial of actions, log manipulation
- Information Disclosure (C) → unauthorized data access or exposure
- Denial of Service (A) → service disruption or resource exhaustion
- Elevation of Privilege (Az) → bypassing authorization boundaries

Note: The CIAAAN property often (but not always) maps to a single STRIDE category. Use the property as a guide, but let the damage scenario determine the correct STRIDE.

## Validation Rules

- `threat_id` unique within array, TH_## format
- `damage_scenario_id` must exist in Stage 02 output
- `asset_id` must exist in Stage 01 output
- `threat_statement` must name or reference the specific asset
- `stride_category` from allowed enum
- `derivation_note` must explain specifically how this threat causes the DS_##
- One TH_## per DS_##

## Checkpoint

Human reviews: Does each threat specifically name the asset? Is each threat distinct (no copy-pastes)? Is the STRIDE category correct?
