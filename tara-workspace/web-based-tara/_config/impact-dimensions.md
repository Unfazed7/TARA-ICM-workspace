# Impact Dimensions — Web-Based TARA — Layer 3 Reference

Used by: Stage 05 (Impact Analysis)  
Standard: ISO/SAE 21434 §15.7 (adapted for web application context)

---

## 7-Dimension Impact Framework

Web-based TARA uses 7 impact dimensions across two stakeholder groups.

### Tool User Dimensions (4)

| Dimension | Symbol | What It Measures |
|-----------|--------|-----------------|
| Safety | S | Physical harm to the tool user | 
| Privacy | P | Exposure of the tool user's personal or work-related data |
| Financial | F | Direct financial loss to the tool user |
| Operational | O | Disruption to the tool user's ability to perform their work |

### Other Stakeholders Dimensions (3)

| Dimension | Symbol | What It Measures |
|-----------|--------|-----------------|
| Legal | L | Regulatory violations, fines, or legal liability to the organization |
| Financial | F | Financial loss to the organization |
| Business | B | Reputational damage, customer trust loss, market position impact |

---

## DOMAIN CONSTRAINT — Web TARA Rule

**Tool User Safety (S): ALWAYS Negligible for web-based TARAs.**  
Rationale: Web application tools cannot directly cause physical harm to the tool user. There is no pathway from web application compromise to vehicle control interference in this scope.

**Tool User Financial (F): ALWAYS Negligible for web-based TARAs.**  
Rationale: Web diagnostic tools do not handle the tool user's personal financial transactions. Any financial harm flows to the organization (Other Stakeholders — Financial), not directly to the tool user.

These constraints are enforced in `_config/web-tara-constraints.md` and must not be overridden.

---

## Rating Scale

All 7 dimensions use the same 4-level scale:

| Level | Name | Numeric |
|-------|------|---------|
| Negligible | No meaningful impact | 0 |
| Moderate | Limited, manageable impact | 1 |
| Major | Significant, material impact | 2 |
| Severe | Catastrophic, potentially irreversible | 3 |

---

## Rating Criteria per Dimension

### Tool User — Safety (S)
**Always Negligible for web-based TARA.** See domain constraint above.

### Tool User — Privacy (P)

| Rating | Criterion |
|--------|----------|
| Severe (P3) | Highly sensitive personal data directly linkable to the user (identity, auth context, personal identifiers, activity records) is exposed |
| Major (P2) | Sensitive work-related or personal data exposed, but direct linkage requires additional context or effort |
| Moderate (P1) | Limited metadata, non-sensitive identifiers, logs, or usage context may be exposed; not easily linkable |
| Negligible (P0) | Exposed data is minimal, non-sensitive, not linkable to the user or their work |

### Tool User — Financial (F)
**Always Negligible for web-based TARA.** See domain constraint above.

### Tool User — Operational (O)

| Rating | Criterion |
|--------|----------|
| Severe (O3) | Critical tool functions unavailable; complete interruption of workflow with no practical workaround |
| Major (O2) | Important tool function lost; major task cannot be completed without significant rework, support, or delay |
| Moderate (O1) | Partial degradation; user can continue but with reduced performance, retries, or limited functionality |
| Negligible (O0) | No practical effect; workflow continues without meaningful interruption |

### Other Stakeholders — Legal (L)

| Rating | Criterion |
|--------|----------|
| Severe (L3) | Criminal liability, loss of operating license, long-term injunctions, or massive multi-jurisdictional penalties |
| Major (L2) | Regulatory investigations, significant fines, civil lawsuits, or costly contractual breaches |
| Moderate (L1) | Warnings, minor fines, audit findings, or localized non-compliance issues |
| Negligible (L0) | No legal or regulatory impact; fully compliant or resolved informally |

### Other Stakeholders — Financial (F)

| Rating | Criterion |
|--------|----------|
| Severe (F3) | Catastrophic loss threatening organizational survival (insolvency, forced divestment) |
| Major (F2) | Substantial loss requiring major budget reallocation, executive intervention, long-term recovery |
| Moderate (F1) | Manageable loss absorbed through operational budget adjustments |
| Negligible (F0) | No meaningful impact; trivial cost absorbed by normal operations |

### Other Stakeholders — Business (B)

| Rating | Criterion |
|--------|----------|
| Severe (B3) | Irreversible brand damage; loss of customer trust at scale; severe market share erosion or shutdown |
| Major (B2) | Major reputational damage and customer churn; competitive disadvantage; recovery is feasible |
| Moderate (B1) | Noticeable but temporary impact on reputation, satisfaction, or internal productivity |
| Negligible (B0) | No observable impact on reputation, operations, or customer trust |

---

## Derivation Rules

**Impact Narrative** is derived from the THREAT (TH_##):
- Describes exactly what happens when this specific threat succeeds
- Names the specific asset and specific stakeholder affected
- States it as fact, not possibility (no "may", "could", "potentially")

**Impact Ratings** are derived from the DAMAGE SCENARIO (DS_##):
- Ratings measure the severity of the damage scenario, not the threat mechanism
- Each dimension independently rated — do not copy ratings across assets
- Self-test: If two different damage scenarios produce identical 7-dimension ratings, at least one is wrong

---

## Rating Guard Rules (apply before scoring any dimension)

These rules prevent known mis-rating patterns. Apply each check before assigning a rating.

**Guard 1 — Safety cap:**
Maximum safety rating for any stakeholder in web-based TARA is Major. Severe is only applicable if confirmed, actual physical harm has already occurred. A credible failure mechanism that could cause harm rates Major; a theoretical or indirect pathway rates Moderate or lower.

**Guard 2 — Privacy gate:**
Before evaluating privacy severity, confirm that explicit data exposure language is present in the damage scenario — words such as "is disclosed", "is exposed", "is extracted", "is accessed without authorization", or "is revealed". If no exposure language is present, privacy must be Negligible regardless of what data the asset holds.

**Guard 3 — Financial inference guard:**
Rate Other Stakeholders Financial only if the damage scenario explicitly describes financial loss, revenue impact, or direct monetary cost. Do not infer financial impact from data disclosure alone. A scenario describing data exposure without stating financial harm rates Financial as Negligible or Moderate at most.

**Guard 4 — Party attribution:**
When a consequence in the damage scenario is explicitly attributed to a specific party ("affecting the organization", "affecting the tool user"), apply the rating only to that party's dimension. Do not cross-apply a consequence described for one party to another party's dimension.

---

## Output Format

```json
{
  "impact_id": "IM_01",
  "threat_id": "TH_01",
  "damage_scenario_id": "DS_01",
  "asset_id": "AS_01",
  "property": "confidentiality",
  "impact_narrative": "string (derived from TH_01)",
  "tool_user": {
    "safety": "Negligible",
    "privacy": "Major",
    "financial": "Negligible",
    "operational": "Moderate",
    "rationale_safety": "Not applicable — web tool cannot cause physical harm",
    "rationale_privacy": "string",
    "rationale_financial": "Not applicable — web tool does not handle user financial transactions",
    "rationale_operational": "string"
  },
  "other_stakeholders": {
    "legal": "Moderate",
    "financial": "Moderate",
    "business": "Moderate",
    "rationale_legal": "string",
    "rationale_financial": "string",
    "rationale_business": "string"
  }
}
```
