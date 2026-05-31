# Stage 03 — Impact Analysis (Layer 2)

**Type:** AI (Claude standard) + Deterministic Engine  
**Clause:** ISO 21434 §15.7  
**Checkpoint:** Required

---

## Purpose

Generate damage scenarios for each asset-CIA combination. Rate impact across SFOP domains. Deterministic engine calculates final impact rating.

## Input

`stages/02-asset-analysis/output/asset-register.json`

## Output

`output/impact-analysis.json` — array of damage scenario objects. See schema in `.meta/specs/00-json-schema-contracts.md`.

## Layer 3 Files Loaded

- `_config/sfop-scale.md` — SFOP domain definitions and rating scale

## Process

For each asset in asset-register.json:
  For each applicable CIA property (C, I, A where rating > negligible):
    1. Generate a damage scenario narrative (what happens when this property is compromised)
    2. Rate each SFOP domain (safety 0-4, financial 0-4, operational 0-4, privacy 0-4)
    3. Leave `impact_rating_value` as `null` — engine fills this
    4. Leave `impact_rating_level` as `null` — engine fills this
5. Submit via tool_use → `submit_impact_analysis`
6. Orchestrator calls `_engines/impact-rating.js` to fill impact values

## Damage Scenario Rules

- Narrative: 2-3 sentences, specific to the asset and CIA property
- Must describe: WHO is affected, WHAT happens, WHY it matters
- Must NOT be generic (e.g., "data could be compromised" is not acceptable)
- At least one SFOP domain must be rated > 0

## Damage ID Naming

```
DMG-{NNN}  — Sequential, zero-padded (DMG-001, DMG-002, ...)
```

One DMG entry per asset × CIA property combination.

## Web-Specific Damage Scenario Examples

**Confidentiality breach on auth token:**
"If an attacker obtains a valid OAuth refresh token for a fleet manager account, they gain persistent access to all vehicles managed by that account, enabling surveillance of vehicle location and status without the owner's knowledge. The fleet operator faces significant privacy liability under GDPR and potential regulatory fines."

**Integrity breach on OTA update package:**
"If an attacker modifies an OTA update package before it reaches vehicles, malicious firmware could be deployed to thousands of vehicles simultaneously. Depending on the ECU targeted, this could cause safety-critical system failures, require costly physical recall, and expose the OEM to significant liability."

**Availability breach on license validation API:**
"If the license validation API becomes unavailable, all diagnostic tools used by dealership technicians are blocked from activating new licenses. Service operations halt across the dealer network, causing direct revenue loss and reputational damage to the OEM's service brand."

## Validation Rules

- `damage_id` unique within array
- `asset_id` must exist in Stage 02 output
- `cyber_property` must be the CIA property being analyzed
- At least one SFOP domain must be > 0
- `impact_rating_value` and `impact_rating_level` filled by engine after submission

## Checkpoint

After engine fills all impact values: orchestrator POSTs to checkpoint API.  
Human reviews: damage scenario realism, SFOP ratings, impact levels.  
On rejection: re-run with feedback (e.g., "Safety rating for OTA scenario seems underrated").
