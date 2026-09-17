# Codex Brief — Stage 06: Risk Scoring Engine

**Spec:** `.meta/specs/06-risk-scoring-engine.md` — read the full spec before starting.  
**Branch:** Create `codex/stage-06-risk-scoring` from `develop`.  
**PR target:** `develop`

---

## What to Build

Two files:

### 1. `tara-workspace/web-based-tara/_engines/risk-score.js`

Pure, deterministic module — no Claude API, no I/O, no side effects.

```javascript
const RATING_TO_NUM = { Negligible: 0, Moderate: 1, Major: 2, Severe: 3 };

function computeImpactRatingValue(impactRecord) {
  // Max of 5 meaningful dimensions — tool_user.safety and tool_user.financial
  // are always Negligible (0) and are excluded from the max.
  const dims = [
    RATING_TO_NUM[impactRecord.tool_user.privacy],
    RATING_TO_NUM[impactRecord.tool_user.operational],
    RATING_TO_NUM[impactRecord.other_stakeholders.legal],
    RATING_TO_NUM[impactRecord.other_stakeholders.financial],
    RATING_TO_NUM[impactRecord.other_stakeholders.business],
  ];
  return Math.max(...dims);
}

function getRiskLevel(score) {
  if (score === 0)  return 'informational';
  if (score <= 3)   return 'low';
  if (score <= 7)   return 'medium';
  if (score <= 11)  return 'high';
  return 'critical';   // 12–15
}

function computeRiskScore(impactRecord, attackRecord) {
  const impact_rating_value = computeImpactRatingValue(impactRecord);
  const impact_rating_label = Object.keys(RATING_TO_NUM).find(
    k => RATING_TO_NUM[k] === impact_rating_value
  );
  const { afr_value, afr_label } = attackRecord;
  const risk_score = impact_rating_value * afr_value;
  const risk_level = getRiskLevel(risk_score);
  return { impact_rating_value, impact_rating_label, afr_value, afr_label, risk_score, risk_level };
}

module.exports = { computeRiskScore, computeImpactRatingValue, getRiskLevel, RATING_TO_NUM };
```

### 2. `tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js`

CLI: `--impact <path> --attacks <path> --out <path>`

Process:
1. Load impact-analysis.json and attack-paths.json
2. Load `_config/iso-21434-risk-matrix.json` (exists — do not modify it)
3. Throw if any `afr_value` in attack-paths.json is `null`
4. For each IM_## record: find matching AT_## by `threat_id`, call `computeRiskScore`
5. Sort results by `risk_score` descending; **tiebreak: higher `afr_value` ranks higher (lower rank number)**
6. Assign `risk_rank` 1..N sequentially
7. Assign `risk_id` = `RSK_##` sequentially
8. Set `created_timestamp` = current UTC ISO 8601
9. Write to `--out` path

Output schema (one record):
```json
{
  "risk_id": "RSK_01",
  "threat_id": "TH_01",
  "damage_scenario_id": "DS_01",
  "attack_id": "AT_01",
  "impact_id": "IM_01",
  "asset_id": "AS_01",
  "impact_rating_value": 2,
  "impact_rating_label": "Major",
  "afr_value": 4,
  "afr_label": "high",
  "risk_score": 8,
  "risk_level": "high",
  "risk_rank": 1,
  "created_timestamp": "ISO 8601"
}
```

---

## Test File

`tests/engines/risk-score.test.js` — use Jest.

**Must cover:**

| Test | Input | Expected |
|------|-------|----------|
| Score 0 | impact=0, afr=1 | informational |
| Score 3 | impact=1, afr=3 | low |
| Score 4 | impact=1, afr=4 | medium |
| Score 7 | impact=1, afr=5 (capped — wait, max is 5×1=5... use impact=1, afr=7? No — afr max is 5 and impact max is 3, so max score is 15. Let me recalculate: score 7 = impact 1 × afr 5? No that's 5. Try impact 2 × afr 3 = 6... or impact 1 × afr... actually just test the boundary). Test risk_score=7 → medium; risk_score=8 → high |
| Score 8 | impact=2, afr=4 | high |
| Score 11 | impact=3, afr=3 (=9... actually impact=2×afr=5=10, impact=3×afr=3=9...) — just verify score=11 → high and score=12 → critical |
| Score 12 | impact=3, afr=4 | critical |
| Score 15 | impact=3, afr=5 | critical |
| Tiebreak | two records same score, different afr | higher afr → lower rank number |
| afr_value null | any AT_## with afr_value null | throws |
| impact_rating_value | safety=Negligible, financial=Negligible excluded from max | max of 5 dims only |

---

## Schema File

Update `src/schemas/stage-06-risk-register.schema.json` to match the output schema above. If it doesn't exist, create it.

---

## Do Not Touch

- Any `_config/` file
- `_config/iso-21434-risk-matrix.json`
- Any other `agent.js`
- `stages/06-risk-scoring/CONTEXT.md`

---

## Verification

```bash
node tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js \
  --impact tests/fixtures/valid/stage-05-impact-analysis.json \
  --attacks tests/fixtures/valid/stage-04-attack-paths-post-engine.json \
  --out /tmp/test-risk-register.json

node scripts/validate-all.js /tmp/test-risk-register.json src/schemas/stage-06-risk-register.schema.json

node -e "
  const reg = require('/tmp/test-risk-register.json');
  reg.forEach(r => {
    console.assert(r.risk_score === r.impact_rating_value * r.afr_value, r.risk_id + ': math wrong');
  });
  const ranks = reg.map(r => r.risk_rank).sort((a,b) => a-b);
  ranks.forEach((rank, i) => console.assert(rank === i+1, 'Rank gap at ' + rank));
  console.log('Verification OK');
"

npm test -- --testPathPattern=risk-score
```

All tests must pass. Validation must pass. Commit with a clear message.
