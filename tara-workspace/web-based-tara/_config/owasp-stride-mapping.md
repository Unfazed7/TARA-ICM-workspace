# OWASP Top 10 → STRIDE Mapping — Layer 3 Reference

Used by: Stage 04 (Threat Analysis)  
Purpose: Ensure web-based automotive threats are identified using OWASP intelligence, categorized in STRIDE for ISO 21434 compliance

---

## Mapping Table

| OWASP 2021 | STRIDE Category | Primary Asset Types | Automotive Web Example |
|------------|-----------------|--------------------|-----------------------|
| A01 Broken Access Control | Elevation of Privilege | API endpoints, admin portals | Technician accessing fleet admin functions |
| A02 Cryptographic Failures | Information Disclosure | Data stores, API connections | License keys transmitted in plain HTTP |
| A03 Injection (SQL/NoSQL/Command) | Tampering | Data stores, backend services | SQL injection modifying vehicle config DB |
| A04 Insecure Design | Elevation of Privilege | Auth flows, session management | Missing auth on OTA approval endpoint |
| A05 Security Misconfiguration | Information Disclosure | Cloud services, API gateways | Azure blob storage with public access |
| A06 Vulnerable Components | Tampering | Backend services | Outdated npm library with known RCE |
| A07 Auth/Session Failures | Spoofing | Auth tokens, session state | Session token not invalidated on logout |
| A08 Data Integrity Failures | Tampering | OTA packages, software supply chain | Unsigned OTA update accepted by backend |
| A09 Logging Failures | Repudiation | Audit logs, diagnostic logs | No logging on diagnostic command execution |
| A10 SSRF | Information Disclosure | Internal services, cloud metadata | SSRF to Azure IMDS endpoint for credentials |

---

## Usage in Stage 04

For each threat identified by STRIDE analysis, the AI agent should:

1. Map the STRIDE category to the primary OWASP category (from table above)
2. Include the OWASP reference in `threat_description`
3. Build the attack path using OWASP-documented attack patterns
4. Rate feasibility sub-factors consistent with OWASP exploitation difficulty

Example:
```
STRIDE: Information Disclosure
OWASP: A02 Cryptographic Failures
Threat: JWT secret stored in Azure App Service environment variable exposed via verbose error
Attack Path:
  Step 1: Attacker identifies error-triggering parameter via API fuzzing
  Step 2: Malformed request causes uncaught exception revealing stack trace
  Step 3: Stack trace includes environment variable dump with JWT_SECRET value
  Step 4: Attacker forges valid JWT tokens for any user ID in the system
Feasibility: elapsed_time=4, expertise=4, knowledge=4, opportunity=5, equipment=5
  → High feasibility (standard tool, publicly documented technique)
```

---

## Additional Web-Automotive Threat Patterns

These are not in OWASP Top 10 but are relevant for automotive web systems:

### API-Specific Threats
- **GraphQL introspection abuse** → Information Disclosure (exposed schema)
- **Mass assignment** → Elevation of Privilege (updating fields like `is_admin`)
- **IDOR on VINs** → Information Disclosure (accessing other vehicles' data)
- **JWT algorithm confusion** → Spoofing (RS256 → HS256 downgrade attack)

### Azure-Specific Threats
- **Managed identity credential abuse** → Elevation of Privilege
- **Azure Key Vault access policy misconfiguration** → Information Disclosure
- **App Service SCM endpoint exposure** → Elevation of Privilege
- **Storage account SAS token leakage** → Information Disclosure

### OTA-Specific Threats
- **Update package signing bypass** → Tampering (A08)
- **Rollback attack** → Tampering (force old vulnerable firmware)
- **Update server impersonation** → Spoofing (man-in-the-middle on update channel)

---

## Integration with Controls (Stage 06)

OWASP categories map directly to controls:

| OWASP | Primary Controls |
|-------|-----------------|
| A01 | NIST AC-2, AC-3, AC-17; OWASP ASVS V4 |
| A02 | NIST SC-8, SC-28; OWASP ASVS V6 |
| A03 | NIST SI-10; OWASP ASVS V5 |
| A04 | NIST SA-8, SA-15; OWASP ASVS V1 |
| A05 | NIST CM-6, CM-7; Azure Security Benchmark |
| A06 | NIST SA-12, SI-2; OWASP Dependency-Check |
| A07 | NIST IA-2, IA-8; OWASP ASVS V3 |
| A08 | NIST SI-7, SA-12; OWASP ASVS V10 |
| A09 | NIST AU-2, AU-12; OWASP ASVS V7 |
| A10 | NIST SC-7; OWASP ASVS V12 |
