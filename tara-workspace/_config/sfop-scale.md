# SFOP Impact Scale — Layer 3 Reference

Used by: Stage 03 (Impact Analysis)  
Standard: ISO/SAE 21434 Clause 15.7

---

## SFOP Domains

Impact is assessed across 4 domains. Each domain is rated 0-4.

### Safety (S) — Physical harm to persons

| Value | Level | Description |
|-------|-------|-------------|
| 0 | Not applicable | No safety impact possible for this asset/scenario |
| 1 | Negligible | Minor injuries; no lasting harm |
| 2 | Minor | Serious injuries to one or few persons; no fatalities |
| 3 | Major | Life-threatening injuries; possible fatalities |
| 4 | Severe | Multiple fatalities likely |

**Web-app context:** Safety impact is typically low for diagnostic portals unless the system can send commands that affect vehicle behavior (e.g., OTA update that bricks safety ECUs, remote diagnostic that enables unsafe vehicle operation).

### Financial (F) — Economic loss to stakeholders

| Value | Level | Description |
|-------|-------|-------------|
| 0 | Not applicable | No financial impact possible |
| 1 | Negligible | Minor loss (<€10K); easily recoverable |
| 2 | Minor | Significant loss (€10K–€1M); impacts a department |
| 3 | Major | Large loss (€1M–€100M); impacts the company |
| 4 | Severe | Catastrophic loss (>€100M); existential to company |

**Web-app context:** Financial impact includes: regulatory fines (GDPR, R155), breach remediation costs, business disruption costs, IP theft, license revenue loss.

### Operational (O) — Disruption to services

| Value | Level | Description |
|-------|-------|-------------|
| 0 | Not applicable | No operational impact possible |
| 1 | Negligible | Minor disruption; self-healing within hours |
| 2 | Minor | Noticeable disruption; recovery within days |
| 3 | Major | Significant disruption; recovery takes weeks; SLA breach |
| 4 | Severe | Complete service outage; recovery takes months |

**Web-app context:** Operational impact includes: vehicle diagnostic unavailability, license provisioning failure, telematics data loss, OTA update service disruption.

### Privacy (P) — Data protection violations

| Value | Level | Description |
|-------|-------|-------------|
| 0 | Not applicable | No personal data involved |
| 1 | Negligible | Minor privacy violation; limited scope; low sensitivity |
| 2 | Minor | Privacy violation affecting identifiable individuals; GDPR notifiable |
| 3 | Major | Large-scale data breach; significant harm to data subjects |
| 4 | Severe | Massive PII breach; life-altering consequences for data subjects |

**Web-app context:** Privacy impact includes: VIN + owner PII correlation, vehicle location history, diagnostic/health data, biometric data from connected devices.

---

## Impact Rating Calculation

```
impact_rating_value = max(S, F, O, P)

Mapping:
  1 = negligible
  2 = minor
  3 = major
  4 = severe
```

This is calculated by `_engines/impact-rating.js`. AI agents do NOT calculate this.

---

## Important Rules

1. At least one SFOP domain must be non-zero for a valid damage scenario.
2. Use 0 only when the domain is genuinely not applicable — not as a "low" rating.
3. Justify every rating in `damage_scenario` field — auditors will check.
4. Web-app scenarios should not default safety to 0 without explicit justification.
