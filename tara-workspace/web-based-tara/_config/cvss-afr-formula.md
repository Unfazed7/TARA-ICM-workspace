# CVSS v3.1 Attack Feasibility Rating — Layer 3 Reference

Used by: Stage 04 (Attack Path Modelling), Stage 06 (Risk Scoring engine context)  
Standard: CVSS v3.1 Exploitability Subscore  
Note: AI agents estimate AV/AC/PR/UI. `cvss-afr-calc.js` computes the numeric score.

---

## Why CVSS for Web TARA (Not ISO 21434 AFR)

ISO 21434 AFR uses 5 sub-factors designed for hardware/embedded systems (elapsed time, expertise, equipment cost, etc.). For web applications, CVSS v3.1 Exploitability is more appropriate because:

1. Designed specifically for software vulnerabilities — directly maps to web attack characteristics
2. Industry standard — security engineers, auditors, and developers all use it
3. The 4 metrics (AV, AC, PR, UI) directly describe web attack preconditions
4. Reproducible and auditable formula
5. CVSS scores are widely published for comparable vulnerabilities (CVE database)

---

## The 4 Exploitability Metrics

### Attack Vector (AV)

How the attacker reaches the vulnerable component.

| Value | Code | When to Use |
|-------|------|-------------|
| Network | N | Attacker exploits over the network; no physical/adjacent access needed. Includes internet-accessible APIs, web endpoints, cloud services. Most web vulnerabilities. |
| Adjacent | A | Attacker must be on the same network segment (same VPN, same LAN, same Wi-Fi). |
| Local | L | Attacker needs local OS access (SSH session, console access). Rare for pure web apps. |
| Physical | P | Attacker must physically touch the system. Not typical for web assets. |

**Web default:** Most web-based automotive threats use AV=Network. Use AV=Adjacent only if the attack path explicitly requires shared network access (e.g., an internal admin portal on a private subnet).

### Attack Complexity (AC)

The conditions required beyond the attacker's control.

| Value | Code | When to Use |
|-------|------|-------------|
| Low | L | Attack can be repeated reliably. No special conditions, timing, or positioning required. Standard web attacks (XSS, SQLi, BOLA, broken auth). |
| High | H | Attack requires specific conditions: timing races, knowing session state, being man-in-the-middle, or needing environment setup beyond attacker's control. |

**Web default:** Most OWASP Top 10 vulnerabilities are AC=Low. Use AC=High only if the attack path describes a race condition, MITM requirement, or multi-step timing dependency.

### Privileges Required (PR)

The access level the attacker needs before exploiting.

| Value | Code | When to Use |
|-------|------|-------------|
| None | N | No account or access needed. Unauthenticated attacks (SSRF on public endpoint, pre-auth XSS). |
| Low | L | Basic authenticated user access. The attacker has a standard user account but no elevated privileges. |
| High | H | Admin-level or privileged account required before exploitation. |

**Web default:** Depends on the endpoint. Public APIs → PR=None. Endpoints requiring any login → PR=Low. Admin-only functions → PR=High.

### User Interaction (UI)

Whether a non-attacker user must do something for the exploit to succeed.

| Value | Code | When to Use |
|-------|------|-------------|
| None | N | Attacker exploits without any user action. Server-side attacks, unauthenticated API exploits. |
| Required | R | A legitimate user must perform an action: click a link, open a file, load a page, or authenticate. Required for XSS (victim must visit the page), CSRF (victim must be logged in). |

---

## CVSS AFR Calculation Formula

```javascript
// cvss-afr-calc.js implements this
const weights = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },  // Scope: Unchanged
  UI: { N: 0.85, R: 0.62 }
};

// Raw exploitability score (0 to ~3.89)
exploitability = 8.22 × AV × AC × PR × UI

// Max possible: 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 3.89
// Min possible: 8.22 × 0.20 × 0.44 × 0.27 × 0.62 = 0.121

// Normalize to 1-5 scale (rounded integer)
afr_value = round(1 + ((exploitability - 0.121) / (3.89 - 0.121)) × 4)
afr_value = clamp(afr_value, 1, 5)
```

**AI agents estimate the 4 metrics. The engine computes `afr_value`. AI never outputs a number.**

---

## AFR Value Interpretation

| AFR | Meaning | Typical Scenario |
|-----|---------|-----------------|
| 5 | Very High — trivially exploitable | Unauthenticated public API, no complexity, no user action |
| 4 | High — straightforward attack | Authenticated standard user, low complexity, no user action |
| 3 | Medium — some conditions required | Adjacent network, or user interaction required, or high complexity |
| 2 | Low — expert-level conditions | High complexity, high privileges, and user interaction all required |
| 1 | Very Low — nation-state conditions | Physical access, or very rare multi-factor conditions |

---

## Justification Requirements (Per Attack Path)

For each AT_##, the AI agent must justify each of the 4 metrics independently.

Justification rules:
- Derive from the attack path, not the threat statement
- Be specific to this attack scenario — not a generic metric description
- State why this rating applies to this specific attack mechanism
- Suitable for audit documentation: clear, direct, no hedging language

Format:
```
Attack Vector — [Value]: [1-3 sentences linking attack path to this metric]
Attack Complexity — [Value]: [1-3 sentences]
Privileges Required — [Value]: [1-3 sentences]
User Interaction — [Value]: [1-3 sentences]
```

---

## CVSS to Risk Mapping

AFR score feeds into risk scoring (Stage 06):

| AFR | Risk Contribution |
|-----|-----------------|
| 5 | Easiest to exploit — drives risk higher |
| 1 | Hardest to exploit — drives risk lower |

Risk Score = Impact Level × AFR Value (see `iso-21434-risk-matrix.json`).
