# Spec 07 — Risk Treatment Agent (Stage 07)

**Module:** `tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js`  
**Author:** Claude  
**Status:** Ready for implementation — controls catalogue authored  
**Type:** AI — Standard (no extended thinking)  
**Clauses:** ISO/SAE 21434 §15.9, §15.10

---

## Goal

For each RSK_## in the risk register, determine a treatment option (reduce / accept / share / avoid) and produce either a Cybersecurity Goal + controls (reduce/share), or a Cybersecurity Claim (accept), or an Avoidance Action (avoid). Goals and Claims are mutually exclusive and determined solely by the treatment option — they never coexist on the same treatment record.

---

## Success Criteria

```bash
node tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js \
  --risk-register tests/fixtures/valid/stage-06-risk-register.json \
  --threats tests/fixtures/valid/stage-03-threats.json \
  --damage-scenarios tests/fixtures/valid/stage-02-damage-scenarios.json \
  --attacks tests/fixtures/valid/stage-04-attack-paths-post-engine.json \
  --impacts tests/fixtures/valid/stage-05-impact-analysis.json \
  --assets tests/fixtures/valid/stage-01-asset-register.json \
  --assessment-id ASS_01 \
  --out /tmp/test-treatment.json

# Schema valid
node scripts/validate-all.js /tmp/test-treatment.json src/schemas/stage-07-risk-treatment.schema.json

# Verify mutual exclusivity
node -e "
  const t = require('/tmp/test-treatment.json');
  t.forEach(r => {
    if (['reduce','share'].includes(r.treatment_option)) {
      console.assert(r.cybersecurity_goal !== null, r.treatment_id + ': goal required for ' + r.treatment_option);
      console.assert(r.cybersecurity_claim === null, r.treatment_id + ': claim must be null for ' + r.treatment_option);
      console.assert(r.controls_assigned.length > 0, r.treatment_id + ': controls required for ' + r.treatment_option);
    } else if (r.treatment_option === 'accept') {
      console.assert(r.cybersecurity_goal === null, r.treatment_id + ': goal must be null for accept');
      console.assert(r.cybersecurity_claim !== null, r.treatment_id + ': claim required for accept');
      console.assert(r.controls_assigned.length === 0, r.treatment_id + ': controls must be empty for accept');
    } else if (r.treatment_option === 'avoid') {
      console.assert(r.cybersecurity_goal === null, r.treatment_id + ': goal must be null for avoid');
      console.assert(r.cybersecurity_claim === null, r.treatment_id + ': claim must be null for avoid');
      console.assert(r.avoidance_action !== null && r.avoidance_action.length > 0, r.treatment_id + ': avoidance_action required');
    }
  });
  console.log('Mutual exclusivity OK');
"

# Verify acceptance threshold: no medium/high/critical accepted
node -e "
  const t = require('/tmp/test-treatment.json');
  const rsk = require('tests/fixtures/valid/stage-06-risk-register.json');
  const rskMap = Object.fromEntries(rsk.map(r => [r.risk_id, r]));
  t.forEach(tr => {
    if (tr.treatment_option === 'accept') {
      const level = rskMap[tr.risk_id].risk_level;
      console.assert(['informational','low'].includes(level),
        tr.treatment_id + ': cannot accept ' + level + ' risk');
    }
  });
  console.log('Acceptance threshold OK');
"

# Verify 1:1 mapping
node -e "
  const risks = require('tests/fixtures/valid/stage-06-risk-register.json');
  const treatments = require('/tmp/test-treatment.json');
  console.assert(risks.length === treatments.length, '1 TRT_## per RSK_## required');
  console.log('Cardinality OK');
"
```

---

## File Ownership

**Codex WILL create/modify:**
- `tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js`
- `tests/agents/risk-treatment.test.js` (create)

**Codex WILL NOT modify:**
- `stages/07-risk-treatment/CONTEXT.md`
- `_config/controls-catalogue.md`
- `_config/web-tara-constraints.md`
- Any other `agent.js`

---

## Input

```
stages/06-risk-scoring/output/risk-register.json        (RSK_## array)
stages/03-threat-identification/output/threats.json     (for full chain)
stages/02-damage-analysis/output/damage-scenarios.json  (for full chain)
stages/04-attack-path-modelling/output/attack-paths.json (for AT_## mechanism)
stages/05-impact-analysis/output/impact-analysis.json   (for IM_## narrative)
stages/01-input-normalization/output/asset-register.json (for asset context)
_config/controls-catalogue.md                           (Layer 3 — treatment controls)
_config/web-tara-constraints.md                         (Layer 3 — domain rules)
```

---

## Output Schema

**Supersedes the provisional schema in spec 00.**

`stages/07-risk-treatment/output/risk-treatment.json`

```json
[
  {
    "treatment_id": "TRT_01",
    "risk_id": "RSK_01",
    "threat_id": "TH_01",
    "damage_scenario_id": "DS_01",
    "attack_id": "AT_01",
    "impact_id": "IM_01",
    "asset_id": "AS_01",
    "treatment_option": "reduce|accept|share|avoid",
    "treatment_rationale": "string",
    "cybersecurity_goal": {
      "goal_id": "CG_01",
      "goal_statement": "string",
      "cal": 1,
      "cal_rationale": "string",
      "self_test_note": "string"
    },
    "cybersecurity_claim": {
      "claim_id": "CC_01",
      "claim_statement": "string",
      "acceptance_basis": "string"
    },
    "controls_assigned": [
      {
        "control_id": "CTR_##",
        "control_title": "string",
        "control_type": "preventive|detective|corrective",
        "assignment_rationale": "string"
      }
    ],
    "avoidance_action": "string|null",
    "cal": 1,
    "residual_risk_expected": "informational|low|medium|high|critical",
    "created_timestamp": "ISO 8601"
  }
]
```

**Nullable field rules:**
- `cybersecurity_goal`: populated for `reduce`/`share`; `null` for `accept`/`avoid`
- `cybersecurity_claim`: populated for `accept`; `null` for `reduce`/`share`/`avoid`
- `controls_assigned`: 1–3 entries for `reduce`/`share`; empty array `[]` for `accept`/`avoid`
- `avoidance_action`: non-null string for `avoid`; `null` for all others

---

## Process

### Setup
1. Load all 6 input JSON files and build lookup maps by ID
2. Load `controls-catalogue.md` and `web-tara-constraints.md` as context strings
3. Validate all `afr_value` fields in attack-paths.json are non-null (pre-check before loop)

### Per RSK_## — Claude API Call

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 2048,
  system: systemPrompt,      // controls-catalogue.md + web-tara-constraints.md + goal/claim rules below
  messages: [{ role: 'user', content: userMessage }],
  tools: [submitTreatmentTool],
  tool_choice: { type: 'tool', name: 'submit_treatment' },
});
```

**System prompt must include:**
- Full text of `controls-catalogue.md`
- Full text of `web-tara-constraints.md`
- Goal writing rules (6 rules, see below)
- Claim writing rules (6 rules, see below)
- CAL derivation table (see below)
- Acceptance threshold: "Only `informational` or `low` risk levels may be accepted. Medium, high, and critical MUST be reduced, shared, or avoided."
- Control selection instruction: "Select 1–3 controls from the catalogue that most directly address the specific attack mechanism in the AT_## attack path. Do not select controls by asset type or CIAAAN property alone."

**User message includes (full risk chain):**
- RSK_## risk_id, risk_score, risk_level, risk_rank
- IM_## impact_narrative, all 7 ratings
- AT_## attack_description, all 5 attack path steps, CVSS metrics, afr_value, afr_label
- TH_## threat_statement, stride_category, derivation_note
- DS_## damage_scenario, stakeholder_affected, property
- AS_## asset_title, asset_type, ciaaan flags

**Tool definition `submit_treatment`:**
```json
{
  "name": "submit_treatment",
  "description": "Submit the risk treatment decision for a single risk record",
  "input_schema": {
    "type": "object",
    "required": ["treatment_option", "treatment_rationale", "residual_risk_expected"],
    "properties": {
      "treatment_option": { "type": "string", "enum": ["reduce", "accept", "share", "avoid"] },
      "treatment_rationale": { "type": "string" },
      "goal_statement": { "type": ["string", "null"] },
      "goal_self_test_note": { "type": ["string", "null"] },
      "claim_statement": { "type": ["string", "null"] },
      "acceptance_basis": { "type": ["string", "null"] },
      "control_ids": {
        "type": "array",
        "items": { "type": "string", "pattern": "^CTR_\\d{2,}$" },
        "maxItems": 3
      },
      "control_assignment_rationales": {
        "type": "array",
        "items": { "type": "string" },
        "maxItems": 3
      },
      "avoidance_action": { "type": ["string", "null"] },
      "residual_risk_expected": {
        "type": "string",
        "enum": ["informational", "low", "medium", "high", "critical"]
      }
    }
  }
}
```

### Post-processing (deterministic, after Claude call)
4. Extract tool_use arguments
5. Validate treatment_option against risk_level (see acceptance threshold — throw on violation)
6. Derive CAL from risk_level using CAL table (see below)
7. Assign `treatment_id` = `TRT_##` sequentially matching RSK_## order
8. Assign `goal_id` = `CG_##` sequentially across all reduce/share records (only)
9. Assign `claim_id` = `CC_##` sequentially across all accept records (only)
10. Hydrate `controls_assigned` array: look up each CTR_## in catalogue to fill `control_title` and `control_type`
11. Validate all control_ids exist in controls catalogue — throw if unknown CTR_##
12. Validate control_ids.length matches control_assignment_rationales.length
13. Set `created_timestamp` = current UTC ISO 8601
14. Write risk-treatment.json

### Checkpoint submission
```javascript
await submitCheckpoint(assessmentId, {
  stage_num: 7,
  stage_name: 'risk-treatment',
  output_summary: {
    total_treatments: treatments.length,
    treatment_distribution: countByOption(treatments),
    total_goals: treatments.filter(t => t.cybersecurity_goal).length,
    total_claims: treatments.filter(t => t.cybersecurity_claim).length,
    total_controls_assigned: sumControls(treatments),
    cal_distribution: countByCAL(treatments)
  }
});
```

---

## CAL Derivation (Deterministic — ISO 21434)

```javascript
const CAL_TABLE = {
  informational: 1,
  low:           1,
  medium:        2,
  high:          3,
  critical:      4,
};
function deriveCAL(risk_level) { return CAL_TABLE[risk_level]; }
```

CAL is assigned to the treatment record regardless of option. For accept treatments, CAL 1 always applies (risk_level is always informational or low).

---

## Acceptance Threshold

```javascript
const ACCEPTABLE_RISK_LEVELS = new Set(['informational', 'low']);

function validateAcceptance(riskRecord, treatmentOption) {
  if (treatmentOption === 'accept' && !ACCEPTABLE_RISK_LEVELS.has(riskRecord.risk_level)) {
    throw new Error(
      `Cannot accept ${riskRecord.risk_level} risk for ${riskRecord.risk_id} — ` +
      `only informational/low risks may be accepted`
    );
  }
}
```

---

## Goal Writing Rules (6 Rules — include verbatim in system prompt)

These rules are enforced by Claude at generation time and verified post-generation:

1. **Structure**: `"The [Asset Title] SHALL [specific security behavior] to protect [CIAAAN property] against [specific attack mechanism from AT_##]."`
2. **SHALL, not SHALL NOT**: State what the system must do, not what it must prevent. Wrong: "SHALL NOT allow token theft." Right: "SHALL expire within 15 minutes and bind tokens to the requesting client."
3. **Asset-specific**: Must reference the exact `asset_title`. Cannot apply unchanged to a different asset with the same CIAAAN property.
4. **Mechanism-specific**: Must reference the attack mechanism from AT_## `attack_description` or `step_2_abuse_technique`. A goal that only references CIAAAN property without the mechanism is too generic.
5. **Verifiable**: The goal must describe behavior that can be tested (e.g., "expire within 15 minutes", "return HTTP 403", "enforce TLS 1.3+"). "Be secure" or "be protected" are not verifiable.
6. **No attacker language**: Describe the mechanism, not the actor. Wrong: "to prevent an attacker from stealing tokens." Right: "to prevent session credential theft via XSS-based cookie extraction."

**Self-test**: Apply the goal statement with a different asset_title from the same TARA. If it still makes sense without modification → goal is too generic. Fix by adding the specific mechanism or measurement.

---

## Claim Writing Rules (6 Rules — include verbatim in system prompt)

1. **Structure**: `"The risk of [threat from TH_## statement] affecting [Asset Title] [CIAAAN property] is accepted because [specific numerical justification]."`
2. **Cite all four numbers**: Must include `afr_label` (AFR=`afr_value`), `impact_rating_label` (score=`impact_rating_value`), `risk_score`, and `risk_level`. No exceptions.
3. **State threshold conformance explicitly**: Must confirm risk_level is within the acceptance threshold: "classified as [level], within the project acceptance threshold of ≤ low."
4. **Threat-specific**: Must reference the specific TH_## threat mechanism, not just the asset or property.
5. **No future controls**: A claim does NOT promise future controls or mitigations. If any control is planned, it is a reduce treatment, not an accept. "Accepted pending MFA rollout" → invalid.
6. **Unique**: Each CC_## must be distinct. If two risks produce identical claim text → one or both claims are too generic. Add the specific threat mechanism to differentiate.

---

## Control Selection Rules (include in system prompt)

- Select 1–3 controls per reduce/share treatment. Never 0 (→ reject), never more than 3 (→ over-engineering).
- Controls must address the specific `step_2_abuse_technique` and `step_4_control_gap` from the AT_## attack path, not the CIAAAN property alone.
- Prefer combining preventive + detective controls (one of each) over 2 preventive controls for the same mechanism.
- Controls sourced from the catalogue only (CTR_01 to CTR_89). Do not invent new control IDs.
- For `share` treatments: at least one assigned control must be a third-party or cloud provider control (Family F or G in the catalogue).

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| treatment_option `accept` for medium/high/critical risk | Throw `Error('Cannot accept [level] risk for RSK_XX — only informational/low permitted')` |
| goal_statement null for reduce/share | Throw `Error('Goal required for [option] treatment in TRT_XX')` |
| claim_statement null for accept | Throw `Error('Claim required for accept treatment in TRT_XX')` |
| avoidance_action null for avoid | Throw `Error('Avoidance action required for avoid treatment in TRT_XX')` |
| Unknown CTR_## in control_ids | Throw `Error('CTR_XX not found in controls catalogue')` |
| control_ids.length ≠ control_assignment_rationales.length | Throw with TRT_## |
| Empty goal_statement or claim_statement | Throw `Error('Empty [goal/claim] statement in TRT_XX')` |
| goal_self_test_note empty for reduce/share | Throw `Error('Self-test note required in TRT_XX')` |
| afr_value null in attack-paths.json | Throw `Error('afr_value not computed for AT_XX — run cvss-afr-calc first')` |
| Claude returns free text instead of tool_use | Retry once; throw with RSK_## on second failure |

---

## Validation Rules (post-generation, before write)

1. Exactly one TRT_## per RSK_## — count must match
2. `treatment_id` unique, pattern `^TRT_\d{2,}$`
3. `treatment_option` ∈ {reduce, accept, share, avoid}
4. Acceptance threshold enforced (see above)
5. For reduce/share: `cybersecurity_goal` non-null, `cybersecurity_claim` null, `controls_assigned.length` ∈ {1,2,3}
6. For accept: `cybersecurity_goal` null, `cybersecurity_claim` non-null, `controls_assigned.length === 0`
7. For avoid: `cybersecurity_goal` null, `cybersecurity_claim` null, `avoidance_action` non-empty
8. All `control_id` values exist in controls catalogue
9. `cal` ∈ {1,2,3,4} and matches CAL_TABLE[risk_level]
10. `residual_risk_expected` ∈ {informational, low, medium, high, critical}
11. All goal_statements, claim_statements, and avoidance_actions are non-empty strings
12. All `assignment_rationale` strings are non-empty
13. All `treatment_rationale` strings are non-empty
14. goal_id unique pattern `^CG_\d{2,}$`; claim_id unique pattern `^CC_\d{2,}$`
15. All cross-reference IDs (risk_id, threat_id, etc.) exist in their source files

---

## Verification Steps

```bash
# 1. Unit tests
npm test -- --testPathPattern=risk-treatment

# Must cover:
# - reduce treatment: goal present, claim null, controls 1-3
# - accept treatment: claim present, goal null, controls empty
# - avoid treatment: avoidance_action present, goal null, claim null
# - share treatment: goal present with third-party control
# - acceptance threshold rejection (medium/high/critical → accept throws)
# - unknown CTR_## rejection
# - CAL table: informational→1, low→1, medium→2, high→3, critical→4
# - goal self-test note required for reduce/share
# - claim must cite all 4 numbers (validated by checking claim_statement contains afr_value and risk_score as substrings)
# - extended thinking NOT enabled (body.thinking === undefined)
# - 1:1 mapping enforced

# 2. Schema validation
node scripts/validate-all.js output/risk-treatment.json src/schemas/stage-07-risk-treatment.schema.json

# 3. CAL deterministic test
node -e "
  const t = require('/tmp/test-treatment.json');
  const r = require('tests/fixtures/valid/stage-06-risk-register.json');
  const rskMap = Object.fromEntries(r.map(x => [x.risk_id, x]));
  const expected = { informational:1, low:1, medium:2, high:3, critical:4 };
  t.forEach(tr => {
    const level = rskMap[tr.risk_id].risk_level;
    console.assert(tr.cal === expected[level], tr.treatment_id + ': cal mismatch');
  });
  console.log('CAL OK');
"
```
