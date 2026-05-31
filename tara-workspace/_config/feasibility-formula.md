# Feasibility Formula (AFR) — Layer 3 Reference

Used by: Stage 05 (Risk Determination), Stage 04 context  
Standard: ISO/SAE 21434 Clause 15.9 — Attack Feasibility Rating

---

## The 5 Sub-Factors

Each sub-factor is rated 1–5 by the Stage 04 AI agent. Ratings are justified in `feasibility_sub_factor_justification`.

### 1. Elapsed Time

How long does a successful attack take from start to finish?

| Rating | Meaning |
|--------|---------|
| 5 | Seconds to minutes |
| 4 | Hours |
| 3 | Days |
| 2 | Weeks |
| 1 | Months or years |

**Web-app context:** Script kiddie attacks (e.g., exposed admin endpoint with default credentials) = 5. Nation-state campaigns with custom zero-days = 1.

---

### 2. Expertise Required

What level of technical skill does the attacker need?

| Rating | Meaning |
|--------|---------|
| 5 | Layperson / no technical skill |
| 4 | Informed user (runs existing tools, no custom code) |
| 3 | Competent professional (security engineer with standard tools) |
| 2 | Expert (deep protocol knowledge, custom exploit development) |
| 1 | Nation-state / world-class specialist |

**Web-app context:** OWASP A01 broken access control (just change an ID in the URL) = 4-5. Cryptographic timing attack = 1-2.

---

### 3. Knowledge of Target

How much information does the attacker need about the specific target?

| Rating | Meaning |
|--------|---------|
| 5 | Fully public (open-source code, public API docs, no insider info needed) |
| 4 | Restricted (documentation available to registered users/partners) |
| 3 | Sensitive (requires internal system knowledge) |
| 2 | Critical (requires insider access or privileged knowledge) |
| 1 | Unknown (zero knowledge — attack is entirely blind) |

Note: Counter-intuitively, zero knowledge (1) means the attack is HARDER, not easier, because the attacker must operate blind.

**Web-app context:** Public Azure storage blob = 5 (anyone with URL can access). Undocumented internal API = 2-3.

---

### 4. Opportunity Window

How often does a viable opportunity to attack present itself?

| Rating | Meaning |
|--------|---------|
| 5 | Always open — vulnerability is continuously exploitable |
| 4 | Easy — opportunity arises frequently (daily) |
| 3 | Moderate — opportunity requires some timing (weekly) |
| 2 | Difficult — opportunity requires specific conditions (monthly) |
| 1 | Rare — opportunity window is brief or requires unusual circumstances |

**Web-app context:** An always-accessible unauthenticated endpoint = 5. A vulnerability only exploitable during a 30-second firmware update window = 1.

---

### 5. Equipment Cost

What does the attacker need to acquire to execute the attack?

| Rating | Meaning |
|--------|---------|
| 5 | Free / standard tools (Burp Suite, Metasploit, browser DevTools) |
| 4 | Low cost (<$500 — Raspberry Pi, commercial pentest tools) |
| 3 | Moderate cost ($500–$10K — specialized hardware, licenses) |
| 2 | Expensive ($10K–$1M — custom hardware, zero-day purchase) |
| 1 | Very expensive (>$1M — nation-state resources) |

**Web-app context:** Most web application attacks = 5 (free tools). Physical CAN bus attack = 3-4.

---

## AFR Calculation Formula

```javascript
// Per ISO/SAE 21434 Clause 15.9
// Input: sub-factors object (each value 1-5)
// Output: feasibility_rating_value (integer 1-5)

function calculateAFR(subFactors) {
  const { elapsed_time, expertise_required, knowledge_of_target, 
          opportunity_window, equipment_cost } = subFactors;
  
  // Validate: all values must be integers 1-5
  // Sum of sub-factors
  const rawSum = elapsed_time + expertise_required + knowledge_of_target + 
                 opportunity_window + equipment_cost;
  
  // Normalize to 1-5 scale
  // Min possible sum: 5 (all 1s) → AFR 1
  // Max possible sum: 25 (all 5s) → AFR 5
  const normalized = Math.round(1 + ((rawSum - 5) / 20) * 4);
  
  return Math.min(5, Math.max(1, normalized));
}
```

This formula is implemented in `_engines/feasibility-calc.js`. AI agents do NOT compute this value.

---

## AFR → Risk Matrix

| AFR Value | Meaning |
|-----------|---------|
| 1 | Very Low feasibility — nation-state level attack |
| 2 | Low feasibility — expert-level attack |
| 3 | Medium feasibility — professional attacker |
| 4 | High feasibility — semi-skilled attacker |
| 5 | Very High feasibility — script kiddie / automated scan |

Higher AFR + higher Impact = higher Risk (see iso-21434-risk-matrix.json).

---

## Important Rules

1. AI agents (Stage 04) estimate sub-factors only — never the final AFR value.
2. Final AFR is always calculated by `feasibility-calc.js` engine.
3. Each sub-factor must be justified in `feasibility_sub_factor_justification`.
4. Sub-factor ratings must be consistent with the STRIDE attack vector described.
5. Do not inflate sub-factors — auditors check consistency against attack path.
