# Spec 06 — Risk Scoring Engine (Stage 06)

**Module:** `tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js`  
**Engine:** `tara-workspace/web-based-tara/_engines/risk-score.js`  
**Author:** Claude  
**Status:** Ready for implementation — no blockers  
**Type:** Deterministic ONLY — no AI, no Claude API calls  
**Clause:** ISO/SAE 21434 §15.8

---

## Goal

Read `impact-analysis.json` (Stage 05) and `attack-paths.json` (Stage 04, post-engine), compute `risk_score = impact_rating_value × afr_value` for every threat, assign risk level from the matrix, rank all risks, and write `risk-register.json`.

---

## Success Criteria

```bash
# Run the engine
node tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js \
  --impact tests/fixtures/valid/stage-05-impact-analysis.json \
  --attacks tests/fixtures/valid/stage-04-attack-paths-post-engine.json \
  --out /tmp/test-risk-register.json

# Validate schema
node scripts/validate-all.js /tmp/test-risk-register.json src/schemas/stage-06-risk-register.schema.json

# Verify math
node -e "
  const reg = require('/tmp/test-risk-register.json');
  reg.forEach(r => {
    console.assert(r.risk_score === r.impact_rating_value * r.afr_value,
      r.risk_id + ': risk_score must = impact * afr');
  });
  console.log('Math OK');
"

# Verify ranking: no duplicate ranks, covers 1..N
node -e "
  const reg = require('/tmp/test-risk-register.json');
  const ranks = reg.map(r => r.risk_rank).sort((a,b) => a-b);
  ranks.forEach((rank, i) => console.assert(rank === i+1, 'Rank gap at ' + rank));
  console.log('Ranking OK');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js`
- `tara-workspace/web-based-tara/_engines/risk-score.js`
- `tests/engines/risk-score.test.js` (create)

**Codex WILL NOT modify:**
- `stages/06-risk-scoring/CONTEXT.md`
- `_config/iso-21434-risk-matrix.json`
- Any `agent.js` for other stages

---

## Input

```
stages/05-impact-analysis/output/impact-analysis.json    (IM_## array)
stages/04-attack-path-modelling/output/attack-paths.json (AT_## array, afr_value filled)
_config/iso-21434-risk-matrix.json                       (risk level thresholds)
```

---

## Output

`stages/06-risk-scoring/output/risk-register.json` — see schema in spec 00.

---

## Process (agent.js — orchestrates engines)

1. Load impact-analysis.json and attack-paths.json
2. Load iso-21434-risk-matrix.json
3. Validate all `afr_value` fields are non-null (engine must have run after Stage 04)
4. For each IM_## record:
   a. Find matching AT_## by `threat_id`
   b. Call `risk-score.js` `computeRiskScore(impactRecord, attackRecord, matrix)`
5. Sort results by `risk_score` descending
6. Apply tiebreak: if `risk_score` equal, higher `afr_value` ranks higher
7. Assign `risk_rank` 1..N
8. Set `created_timestamp` = current UTC ISO 8601
9. Write risk-register.json

---

## Engine: risk-score.js

### `computeRiskScore(impactRecord, attackRecord, matrix)`

**Input:** one IM_## record + one AT_## record + matrix config  
**Output:** `{ impact_rating_value, impact_rating_label, afr_value, afr_label, risk_score, risk_level }`

**Impact conversion (deterministic):**
```javascript
const RATING_TO_NUM = { Negligible: 0, Moderate: 1, Major: 2, Severe: 3 };

function toNumeric(rating) { return RATING_TO_NUM[rating]; }

function computeImpactRatingValue(impactRecord) {
  const dims = [
    toNumeric(impactRecord.tool_user.privacy),
    toNumeric(impactRecord.tool_user.operational),
    toNumeric(impactRecord.other_stakeholders.legal),
    toNumeric(impactRecord.other_stakeholders.financial),
    toNumeric(impactRecord.other_stakeholders.business),
    // tool_user.safety and tool_user.financial are always 0 (Negligible) — excluded from max
  ];
  return Math.max(...dims);
}
```

**Risk level lookup:**
```javascript
function getRiskLevel(score, matrix) {
  if (score === 0)       return 'informational';
  if (score <= 3)        return 'low';
  if (score <= 7)        return 'medium';
  if (score <= 11)       return 'high';
  return 'critical';                             // 12-15
}
```

**Module exports:**
```javascript
module.exports = { computeRiskScore, computeImpactRatingValue, getRiskLevel, RATING_TO_NUM };
```

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| `afr_value` is null for AT_## | Throw `Error('afr_value not computed for AT_XX — run cvss-afr-calc first')` |
| No matching AT_## for IM_## | Throw `Error('No attack path found for threat TH_XX')` |
| No matching IM_## for AT_## | Throw `Error('No impact record found for threat TH_XX')` |
| `risk_score` < 0 | Should not occur — throw if detected |

---

## Validation Rules (post-generation, before write)

1. `risk_score === impact_rating_value × afr_value` for every record
2. `risk_level` matches matrix thresholds
3. `risk_rank` is sequential 1..N, no duplicates, no gaps
4. All cross-reference IDs exist in their source arrays
5. `impact_rating_value` ∈ {0, 1, 2, 3}
6. `afr_value` ∈ {1, 2, 3, 4, 5}

---

## Risk Level Thresholds

From `_config/iso-21434-risk-matrix.json`:

| Score | Level |
|-------|-------|
| 0 | informational |
| 1–3 | low |
| 4–7 | medium |
| 8–11 | high |
| 12–15 | critical |

---

## Verification Steps

```bash
# 1. Unit tests for risk-score.js
npm test -- --testPathPattern=risk-score

# 2. Test all score boundaries
# Score 0 → informational
# Score 3 → low
# Score 4 → medium
# Score 7 → medium
# Score 8 → high
# Score 11 → high
# Score 12 → critical
# Score 15 → critical
# All boundary cases must be in the test suite

# 3. Tiebreak test: two records with same risk_score but different afr_value
# Higher afr_value must get lower rank number (ranked higher)

# 4. Integration: run agent.js end to end with golden fixtures
```
