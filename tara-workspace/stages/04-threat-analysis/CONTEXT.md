# Stage 04 — Threat Analysis (Layer 2)

**Type:** AI — Extended Thinking ON  
**Clauses:** ISO 21434 §15.6 (threats), §15.8 (attack paths), §15.9 (feasibility sub-factors)  
**Checkpoint:** Required

---

## Purpose

For each damage scenario, identify STRIDE-categorized threats, build realistic attack paths (min 3 steps), write an abuse case, and estimate attack feasibility sub-factors. Extended thinking is used to reason through complex multi-step attack chains.

## Input

- `stages/02-asset-analysis/output/asset-register.json`
- `stages/03-impact-analysis/output/impact-analysis.json`

## Output

`output/threat-analysis.json` — array of threat objects. `feasibility_rating_value` = null (engine fills post-stage).  
See schema in `.meta/specs/00-json-schema-contracts.md`.

## Layer 3 Files Loaded

- `_config/stride-taxonomy.md` — STRIDE definitions and web-automotive examples
- `_config/owasp-stride-mapping.md` — OWASP Top 10 → STRIDE mapping

## Extended Thinking

Budget: Start at 8,000 tokens. Adjust based on real data testing.  
Used for: reasoning through multi-step attack chains, circumvent step identification, OWASP pattern matching.  
Do NOT disable extended thinking for this stage to cut costs — quality degrades significantly.

## Process

For each damage scenario in impact-analysis.json (impact_rating_value >= 1):
  1. Identify all applicable STRIDE categories for this asset + damage combination
  2. For each STRIDE category:
     a. Write 2-3 sentence threat description
     b. Describe the attack vector (how attacker gains initial foothold)
     c. Build attack path (minimum 3 steps, maximum 8 steps)
        - Include at least one circumvent step (how attacker bypasses a security control)
        - Steps must be causally linked (each step enables the next)
     d. Write abuse case: "As an attacker, I want to [goal] so that [motivation/outcome]"
     e. Estimate 5 feasibility sub-factors (1-5 scale each)
     f. Write feasibility justification
  3. Leave `feasibility_rating_value` as null
  4. Submit via tool_use → `submit_threat_analysis`

## Attack Path Requirements

- Minimum 3 steps, maximum 8 steps
- Each step: one specific attacker action (verb + object + method)
- At least one step must be a "circumvent step" (labeled as: "Circumvents: [control name]")
- Final step must be the realization of the damage scenario
- Steps must be realistic for a web-based automotive system

## Abuse Case Format

```
As a [attacker type], I want to [specific malicious action] so that [outcome that damages the target].
```

Examples of attacker types: "nation-state actor", "criminal hacker", "disgruntled insider", "script kiddie with automated tools", "competitive intelligence operative"

## Feasibility Sub-Factor Rules

- All 5 sub-factors must be estimated for every threat
- Justification must explain each sub-factor's rating specifically
- Ratings must be internally consistent (a nation-state attack cannot have expertise_required = 5)
- Do not default all sub-factors to 3 — differentiate based on actual attack vector

## Threat ID Naming

```
THR-{NNN}  — Sequential, zero-padded (THR-001, THR-002, ...)
```

## Validation Rules

- `threat_id` unique within array
- `asset_id` must exist in Stage 02 output
- `damage_id` must exist in Stage 03 output
- `attack_path` array must have >= 3 items
- All feasibility sub-factors must be integers 1-5
- `feasibility_sub_factor_justification` must be non-empty
- `feasibility_rating_value` must be null at this stage (engine fills it)

## Post-Stage Engine Run

After threat-analysis.json is submitted, orchestrator calls `_engines/feasibility-calc.js` for each threat.  
The engine fills `feasibility_rating_value` in place.  
This updated file is then used by Stage 05.

## Checkpoint

After engine fills all feasibility values: orchestrator POSTs to checkpoint API.  
Human reviews: threat realism, attack path plausibility, feasibility ratings.  
This is the most critical checkpoint — humans should spend the most time here.
