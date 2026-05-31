# Stage 05 — Impact Analysis (Layer 2)

**Type:** AI (Claude standard)  
**Clause:** ISO/SAE 21434 §15.7  
**Checkpoint:** Required — human reviews rating calibration across assets

---

## Purpose

For each threat, derive a 7-dimension impact rating. Impact narrative comes from the threat (TH_##). Impact ratings come from the damage scenario (DS_##). These are two different sources with two different derivation rules.

## Input

- `stages/03-threat-identification/output/threats.json`
- `stages/02-damage-analysis/output/damage-scenarios.json`

## Layer 3 Files Loaded

- `_config/impact-dimensions.md` — 7-dimension impact scale and rating criteria
- `_config/web-tara-constraints.md` — domain constraints (Safety + Financial for Tool User = always NA)

## Output

`output/impact-analysis.json`

```json
[{
  "impact_id": "IM_01",
  "threat_id": "TH_01",
  "damage_scenario_id": "DS_01",
  "asset_id": "AS_01",
  "property": "string",
  "impact_narrative": "string (derived from TH_01 — see Step A rules)",
  "tool_user": {
    "safety": "Negligible",
    "privacy": "Major|Moderate|Negligible|Severe",
    "financial": "Negligible",
    "operational": "Major|Moderate|Negligible|Severe",
    "rationale_safety": "Not applicable — web-based tool cannot cause physical harm to tool user.",
    "rationale_privacy": "string",
    "rationale_financial": "Not applicable — web-based tool does not handle tool user's personal financial transactions.",
    "rationale_operational": "string"
  },
  "other_stakeholders": {
    "legal": "Major|Moderate|Negligible|Severe",
    "financial": "Major|Moderate|Negligible|Severe",
    "business": "Major|Moderate|Negligible|Severe",
    "rationale_legal": "string",
    "rationale_financial": "string",
    "rationale_business": "string"
  },
  "created_timestamp": "ISO 8601"
}]
```

## Step A — Impact Narrative (derived from TH_##)

Source: The threat statement (TH_##).  
What it describes: The direct, immediate consequence of this specific attack succeeding against this specific asset.

Rules:
- Must be directly caused by THIS threat — cannot be written from the CIAAAN property label alone
- Must name the specific asset and the specific affected party (tool user, OEM, vehicle owner)
- Written as fact — no speculative language ("may", "could", "potentially")
- Does NOT include the impact rating words (no "Major privacy impact" inside the narrative)
- Self-test: If the same narrative could apply to a different threat on the same asset → too generic, rederive

## Step B — Impact Ratings (derived from DS_##)

Source: The damage scenario (DS_##).  
What they measure: How severe is the damage scenario for each stakeholder and dimension?

**DOMAIN CONSTRAINTS (non-negotiable for web TARA):**
- Tool User — Safety: ALWAYS Negligible. Fixed rationale. Do not compute.
- Tool User — Financial: ALWAYS Negligible. Fixed rationale. Do not compute.

**For the remaining 5 dimensions:** Ask "If DS_## is realized, what is the consequence for [stakeholder] in [dimension]?" — then match to the rating criteria in `_config/impact-dimensions.md`.

Rating source discipline:
- Privacy and Operational ratings: derived from what DS_## describes happening to the tool user
- Legal, Financial (org), Business: derived from what DS_## describes happening to the organization

## Justification Requirements

For each of the 5 computed dimensions:
- Be straight to the point — 2-4 sentences
- Link the specific damage consequence to the assigned rating level
- No references to standards or frameworks — describe the impact directly
- Suitable for audit: clear, direct, specific to this asset's damage scenario

## Self-Test for Ratings

If two different damage scenarios produce identical ratings across all 7 dimensions with identical justifications → at least one set is copy-pasted. Each DS_## is unique; ratings must reflect those differences.

## Validation Rules

- `impact_id` unique, IM_## format
- `threat_id` must exist in Stage 03 output
- `damage_scenario_id` must exist in Stage 02 output
- `tool_user.safety` = "Negligible" (always)
- `tool_user.financial` = "Negligible" (always)
- All 5 computed dimension rationales must be non-empty
- Rating values from enum: Negligible|Moderate|Major|Severe

## Checkpoint

Human reviews: Are impact narratives specific to each threat? Are ratings calibrated (not all "Moderate")?
