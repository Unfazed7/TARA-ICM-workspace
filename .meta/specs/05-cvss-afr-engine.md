# Spec 05 — CVSS AFR Engine

**Module:** `tara-workspace/web-based-tara/_engines/cvss-afr-calc.js`  
**Author:** Claude (spec authority)  
**Status:** Ready for implementation — no blockers

---

## Goal

Given 4 CVSS v3.1 exploitability metrics (AV, AC, PR, UI), compute the numeric `afr_value` (1–5) and the string `afr_label`. This is a pure deterministic function — no AI, no side effects.

---

## Success Criteria

```bash
node -e "
const { calculateCVSSAFR } = require('./tara-workspace/web-based-tara/_engines/cvss-afr-calc.js');
const r = calculateCVSSAFR({ attack_vector:'N', attack_complexity:'L', privileges_required:'N', user_interaction:'N' });
console.assert(r.afr_value === 5, 'Max AV/AC/PR/UI must give afr_value=5');
console.assert(r.afr_label === 'very high', 'Label must be very high');

const r2 = calculateCVSSAFR({ attack_vector:'P', attack_complexity:'H', privileges_required:'H', user_interaction:'R' });
console.assert(r2.afr_value === 1, 'Min AV/AC/PR/UI must give afr_value=1');
console.assert(r2.afr_label === 'very low', 'Label must be very low');
"
```

---

## File Ownership

**Codex WILL modify:**
- `tara-workspace/web-based-tara/_engines/cvss-afr-calc.js`
- `tests/engines/cvss-afr-calc.test.js` (create)

**Codex WILL NOT modify:**
- Any CONTEXT.md or _config/ file
- Any agent.js file
- Any spec in .meta/

---

## Formula

```
exploitability = 8.22 × AV × AC × PR × UI

Weights:
  AV:  N=0.85, A=0.62, L=0.55, P=0.20
  AC:  L=0.77, H=0.44
  PR:  N=0.85, L=0.62, H=0.27
  UI:  N=0.85, R=0.62

afr_value = Math.round(1 + ((exploitability - MIN) / (MAX - MIN)) × 4)

where:
  MIN = 8.22 × 0.20 × 0.44 × 0.27 × 0.62 = 0.121 (rounded to 3dp)
  MAX = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.893 (rounded to 3dp)

Clamp afr_value to [1, 5] — never below 1, never above 5.
```

---

## AFR Labels

```
1 → "very low"
2 → "low"
3 → "medium"
4 → "high"
5 → "very high"
```

---

## Input/Output

**Input:** Object with 4 string fields
```json
{
  "attack_vector": "N|A|L|P",
  "attack_complexity": "L|H",
  "privileges_required": "N|L|H",
  "user_interaction": "N|R"
}
```

**Output:** Object with 2 fields
```json
{
  "afr_value": 1,
  "afr_label": "very low"
}
```

---

## Process

1. Validate all 4 input fields against allowed enum values
2. Look up numeric weight for each metric from WEIGHTS constant
3. Compute `exploitability = 8.22 × AV_weight × AC_weight × PR_weight × UI_weight`
4. Normalize: `normalized = (exploitability - MIN) / (MAX - MIN)`
5. Scale and round: `afr_value = Math.round(1 + normalized × 4)`
6. Clamp: `afr_value = Math.max(1, Math.min(5, afr_value))`
7. Return `{ afr_value, afr_label: AFR_LABELS[afr_value] }`

---

## Validation Rules

- Throw `Error('Invalid attack_vector: X')` if AV not in {N, A, L, P}
- Throw `Error('Invalid attack_complexity: X')` if AC not in {L, H}
- Throw `Error('Invalid privileges_required: X')` if PR not in {N, L, H}
- Throw `Error('Invalid user_interaction: X')` if UI not in {N, R}
- `afr_value` must always be integer in range [1, 5]

---

## Error Conditions

| Condition | Error |
|-----------|-------|
| Unknown metric value | Throw with message naming the bad value |
| Missing field | Throw `Error('Missing required field: X')` |
| NaN in computation | Should not occur if weights are correct — throw if detected |

---

## Module Exports

```javascript
module.exports = {
  calculateCVSSAFR,   // main function
  WEIGHTS,            // weight constants object (for test verification)
  AFR_LABELS,         // label map (for test verification)
  MIN_EXPLOITABILITY, // 0.121 constant
  MAX_EXPLOITABILITY, // 3.893 constant
};
```

---

## Verification Steps

```bash
# 1. Run test suite
npm test tests/engines/cvss-afr-calc.test.js

# 2. Verify all 32 input combinations (4×2×3×2) produce afr_value in [1,5]
# Test file must include assertions for all boundary combinations

# 3. Verify error throwing for invalid inputs
# Test file must cover at least: invalid AV, invalid AC, invalid PR, invalid UI, missing field
```
