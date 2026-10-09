# STRIDE Taxonomy — Layer 3 Reference

Used by: Stage 04 (Threat Analysis)  
Standard: ISO/SAE 21434 + OWASP adapted for web-based automotive systems

---

## STRIDE Categories

### S — Spoofing (Identity Forgery)

**Definition:** Attacker impersonates a legitimate entity to gain unauthorized access or trust.

**Web-automotive examples:**
- Forging JWT tokens to impersonate a dealership technician
- DNS spoofing to redirect OTA update requests to a malicious server
- OAuth token theft to impersonate a vehicle owner in a licensing portal
- API key leakage allowing impersonation of a trusted backend service
- Session hijacking via stolen cookies in a telematics dashboard

**Key question for assets:** Can an attacker claim to be this asset or claim credentials for it?

---

### T — Tampering (Data Modification)

**Definition:** Attacker modifies data in transit or at rest without authorization.

**Web-automotive examples:**
- Man-in-the-middle attack modifying OTA update packages in transit
- SQL injection to alter vehicle configuration records in a backend database
- API parameter manipulation to change license entitlements
- Log tampering to erase evidence of unauthorized diagnostic access
- Modification of signed certificates/tokens (if signing is weak)

**Key question:** Can an attacker write to, modify, or corrupt this asset?

---

### R — Repudiation (Deniability of Actions)

**Definition:** Attacker performs malicious actions that cannot be traced or attributed.

**Web-automotive examples:**
- Absence of audit logging on diagnostic command portal
- Attacker initiates remote vehicle commands and deletes server-side logs
- No timestamping on license activation events — dispute resolution impossible
- Disabling audit trail on OTA update approvals
- Anonymous API access with no request logging

**Key question:** If an attacker performed malicious actions on this asset, could they be identified?

---

### I — Information Disclosure (Confidentiality Breach)

**Definition:** Attacker gains access to information they are not authorized to see.

**Web-automotive examples:**
- Exposed API returning VIN + owner PII without authentication
- Verbose error messages revealing internal server paths or DB schema
- Azure storage blob accessible without SAS token (public container)
- Insecure direct object reference exposing other users' vehicle data
- Unencrypted transmission of diagnostic session data over HTTP

**Key question:** Can an attacker read this asset without authorization?

---

### D — Denial of Service (Availability Disruption)

**Definition:** Attacker prevents legitimate users from accessing or using the system.

**Web-automotive examples:**
- API endpoint floods that exhaust backend licensing service capacity
- Resource exhaustion attacks on diagnostic session manager
- OTA update server DDoS preventing critical firmware updates
- Database connection pool exhaustion via unauthenticated endpoint
- Telematics gateway overload causing vehicle connectivity loss

**Key question:** Can an attacker prevent legitimate use of this asset?

---

### E — Elevation of Privilege (Authorization Bypass)

**Definition:** Attacker gains capabilities or access rights beyond what they are authorized for.

**Web-automotive examples:**
- Broken access control allowing technician to access fleet admin functions
- JWT claims manipulation to escalate from read-only to read-write role
- Insecure direct object reference accessing another organization's vehicles
- Missing authorization on admin-only OTA approval endpoint
- Path traversal to access configuration files outside the app's root

**Key question:** Can an attacker gain more permissions than they should have for this asset?

---

## STRIDE → ISO 21434 Clause Mapping

| STRIDE | ISO 21434 Clause | Description |
|--------|-----------------|-------------|
| Spoofing | 15.6 (Threat scenarios) | Threat scenario identification |
| Tampering | 15.6 | Threat scenario identification |
| Repudiation | 15.6 | Threat scenario identification |
| Information Disclosure | 15.6 | Threat scenario identification |
| Denial of Service | 15.6 | Threat scenario identification |
| Elevation of Privilege | 15.6 | Threat scenario identification |

All STRIDE categories → Attack feasibility rating via Clause 15.9.

---

## Naming Convention for Threat IDs

```
THR-{NNN}  — Sequential, zero-padded (THR-001, THR-002, ...)
```

Threat IDs must be globally unique within an assessment.  
Do not reuse IDs across stages or assessments.

---

## Multiple STRIDE Categories Per Asset

An asset can have multiple threats across different STRIDE categories.  
Each threat = separate `THR-NNN` entry in `threat-analysis.json`.

Example: A JWT token asset could have:
- THR-001: Spoofing (token theft for identity forgery)
- THR-002: Tampering (claims modification)
- THR-003: Information Disclosure (token exposes sensitive claims)

---

## Minimum Attack Path Requirement

Every threat must include an attack path of AT LEAST 3 steps.  
Steps must be realistic and sequential. Include at least one "circumvent step" — how the attacker bypasses a security control.

Example:
```
Step 1: Attacker intercepts network traffic on unsecured WiFi hotspot
Step 2: Attacker captures session cookie from unencrypted HTTP response (circumvents: expected HTTPS)
Step 3: Attacker replays cookie to authenticate as victim user
Step 4: Attacker accesses vehicle diagnostic history and owner PII
```
