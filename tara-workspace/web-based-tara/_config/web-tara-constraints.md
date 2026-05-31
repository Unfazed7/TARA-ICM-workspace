# Web TARA Domain Constraints — Layer 3 Reference

Used by: Stage 02 (Damage Analysis), Stage 05 (Impact Analysis)  
Purpose: Encode domain-specific rules that are ALWAYS true for web-based TARAs  
Authority: These constraints are architectural decisions — do not override without updating this file.

---

## Constraint 1: Tool User Safety = Always Negligible

**Rule:** `impact.tool_user.safety = "Negligible"` for all damage scenarios in web-based TARAs.

**Rationale:** Web application tools operate entirely in software. There is no pathway from web application compromise to physical harm of the tool user. The scope of web-based TARA explicitly excludes vehicle control interfaces and safety-critical hardware systems. Any safety impact from a web system breach (e.g., OTA update compromise that then affects an ECU) falls under the vehicle/ECU TARA scope — not this web TARA.

**Enforcement:** Do not compute this value. Set it to "Negligible" before any AI agent sees it. The rationale text is fixed:
> "Not applicable — web-based tools operate in software only and cannot directly cause physical harm to the tool user. Safety impacts from downstream vehicle effects are out of scope for web-based TARA."

---

## Constraint 2: Tool User Financial = Always Negligible

**Rule:** `impact.tool_user.financial = "Negligible"` for all damage scenarios in web-based TARAs.

**Rationale:** Web diagnostic and automotive SaaS tools do not process the tool user's personal financial transactions. Any financial harm from a breach flows to the organization (captured in Other Stakeholders — Financial), not directly to the individual tool user. Tool users may face operational disruption but not direct monetary loss.

**Enforcement:** Do not compute this value. Set it to "Negligible" before any AI agent sees it. The rationale text is fixed:
> "Not applicable — web-based automotive tools do not handle the tool user's personal financial transactions. Direct financial loss to the tool user is not a credible damage scenario for this system type."

---

## Constraint 3: Non-repudiation as a Standalone Property

**Rule:** Non-repudiation (NR) damage scenarios must describe the ABSENCE of accountability, not a data loss.

**Rationale:** NR damage scenarios are frequently misdescribed as information disclosure scenarios. The correct framing is: "If NR is compromised, the organization or tool user cannot prove that [specific action] occurred or was performed by [specific actor], enabling [specific consequence]."

**Example (correct):** "If Non-repudiation of the Diagnostic Command Log is compromised, the platform cannot demonstrate that a specific technician executed unauthorized remote commands, enabling the technician to deny responsibility for actions taken during a vehicle incident investigation."

**Example (incorrect):** "If NR is compromised, diagnostic command data may be exposed." ← This is an Information Disclosure scenario, not NR.

---

## Constraint 4: Authorization vs Authenticity Distinction

**Rule:** Authorization (Az) scenarios concern what an authenticated user can do. Authenticity (Au) scenarios concern whether the user is who they claim to be.

**Az example:** "An authenticated technician with standard access exploits a BOLA vulnerability to access another dealership's vehicle data." (authenticated but accessing beyond permitted scope)

**Au example:** "An attacker replays a stolen session token to impersonate a technician." (not authenticated — false identity)

Do not conflate these. Each requires a distinct damage scenario and threat.

---

## Constraint 5: Damage Scenario Language

**Rule:** Damage scenarios describe CONSEQUENCES, not ATTACKS. No attacker language in DS_##.

**Format:** `"If the [CIAAAN property] of [Asset Title] is compromised, [specific adverse consequence] affecting [specific stakeholder] in the context of [specific function/feature]."`

**Correct:** "If the Confidentiality of the Refresh Token is compromised, dealer technicians' session credentials are exposed, enabling unauthorized access to the diagnostic platform and vehicle owner data."

**Incorrect:** "An attacker steals the Refresh Token, gaining unauthorized access." ← This is a threat statement (TH_##), not a damage scenario.

---

## Summary Table

| Constraint | Value | Override Allowed |
|-----------|-------|-----------------|
| Tool User — Safety | Always Negligible | No |
| Tool User — Financial | Always Negligible | No |
| NR damage scenario format | Absence of accountability | No |
| Az vs Au distinction | Must be separate DS_## | No |
| DS_## language | No attacker language | No |
