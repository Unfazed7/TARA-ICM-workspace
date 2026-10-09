# Controls Catalogue — Web-Based TARA
# Layer 3 context — loaded by Stage 07 (Risk Treatment) agent

## Purpose
This catalogue lists all treatment controls available for web-based automotive TARA risk
treatment decisions. Each control maps to a cybersecurity goal (reduce/share path) or
supports a claim justification (accept path). Controls are selected based on the specific
threat mechanism in the AT_## attack path, NOT by asset type or CIAAAN property alone.

## How Stage 07 uses this catalogue
1. Read the full risk chain: asset → CIAAAN property → DS_## → TH_## → AT_## → IM_## → RSK_##
2. Derive the treatment option (reduce / accept / share / avoid)
3. If reduce/share: derive a Cybersecurity GOAL, then select the best-fit control(s) from this
   catalogue that directly address the specific attack mechanism in AT_##
4. If accept: derive a Cybersecurity CLAIM — this catalogue is NOT used for accept decisions
5. Self-test before finalising: could this control apply unchanged to a different asset with the
   same CIAAAN property? If yes — it is too generic; select a more specific control or combine
   controls to address the specific AT_## mechanism

## Control Entry Format
Each entry: Type (preventive/detective/corrective) | CIAAAN properties protected |
STRIDE categories mitigated | ISO 27001 ref | NIST CSF ref | Source skill or custom

---

# FAMILY A — Authentication & Session Management

## CTR_01 — Enforce Multi-Factor Authentication
**Type:** preventive | **CIAAAN:** authenticity, authorization, confidentiality | **STRIDE:** spoofing, elevation_of_privilege
**ISO 27001:** A.8.5 | **NIST CSF:** PR.AA-01, PR.AA-03 | **Source:** configuring-multi-factor-authentication
Require a second authentication factor (TOTP, hardware key, push) for all platform access. Prevents account takeover where attacker has stolen primary credentials.

## CTR_02 — Secure OAuth 2.0 Authorization Flow with PKCE
**Type:** preventive | **CIAAAN:** authenticity, authorization, confidentiality | **STRIDE:** spoofing, elevation_of_privilege, information_disclosure
**ISO 27001:** A.8.5, A.8.3 | **NIST CSF:** PR.AA-02, PR.AA-05 | **Source:** configuring-oauth2-authorization-flow
Enforce PKCE on all OAuth 2.0 authorization code flows. Validate redirect URIs strictly. Bind tokens to client identity. Prevents authorization code interception and token replay.

## CTR_03 — Passwordless Authentication (FIDO2/WebAuthn)
**Type:** preventive | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing
**ISO 27001:** A.8.5 | **NIST CSF:** PR.AA-01, PR.AA-03 | **Source:** implementing-passwordless-authentication-with-fido2
Replace password-based login with FIDO2 hardware-bound credentials. Eliminates phishing, credential stuffing, and replay attacks against the authentication endpoint.

## CTR_04 — Microsoft Entra Passwordless Authentication
**Type:** preventive | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing
**ISO 27001:** A.8.5 | **NIST CSF:** PR.AA-01, PR.AA-03 | **Source:** implementing-passwordless-auth-with-microsoft-entra
Deploy Microsoft Entra (Azure AD) passwordless sign-in using Authenticator app or FIDO2 keys. Directly applicable where Azure AD is the SSO provider for the diagnostic platform.

## CTR_05 — Hardware Security Key Authentication
**Type:** preventive | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing
**ISO 27001:** A.8.5 | **NIST CSF:** PR.AA-01 | **Source:** implementing-hardware-security-key-authentication
Require physical hardware keys (YubiKey, Titan) for privileged accounts and admin access. Provides phishing-resistant authentication; cannot be intercepted remotely.

## CTR_06 — Azure AD Conditional Access Policies
**Type:** preventive | **CIAAAN:** authenticity, authorization, confidentiality | **STRIDE:** spoofing, elevation_of_privilege
**ISO 27001:** A.8.5, A.5.15, A.5.18 | **NIST CSF:** PR.AA-05, PR.AA-02 | **Source:** implementing-conditional-access-policies-azure-ad
Enforce access policies based on user identity, device compliance, location, and risk score using Azure AD Conditional Access. Blocks access from non-compliant devices and risky sign-in contexts.

## CTR_07 — Identity-Aware Proxy (Zero Trust Access)
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.3, A.8.5 | **NIST CSF:** PR.AA-05 | **Source:** configuring-identity-aware-proxy-with-google-iap
Route all application access through an identity-aware proxy that validates user identity and device posture on every request. Removes implicit trust from network location.

## CTR_08 — SAML SSO Identity Federation
**Type:** preventive | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing
**ISO 27001:** A.8.5, A.5.16 | **NIST CSF:** PR.AA-01, PR.AA-02 | **Source:** building-identity-federation-with-saml-azure-ad
Federate authentication to a trusted IdP via SAML 2.0. Centralises identity management and ensures authentication decisions are made by the authoritative identity provider.

## CTR_09 — Secure Session Cookie Enforcement
**Type:** preventive | **CIAAAN:** confidentiality, authenticity | **STRIDE:** spoofing, information_disclosure
**ISO 27001:** A.8.5, A.8.24 | **NIST CSF:** PR.DS-02, PR.AA-02 | **Source:** custom
Enforce HttpOnly, Secure, and SameSite=Strict attributes on all session and auth cookies. Prohibit localStorage or sessionStorage for token storage. Directly prevents XSS-based token theft and cross-site request forgery.

## CTR_10 — OAuth Token Rotation and Short-Lived Access Tokens
**Type:** preventive | **CIAAAN:** confidentiality, authenticity | **STRIDE:** spoofing, information_disclosure
**ISO 27001:** A.8.5 | **NIST CSF:** PR.AA-02, PR.DS-02 | **Source:** custom
Enforce access token expiry ≤15 minutes. Require refresh token rotation (issue new refresh token, invalidate old) on each use. Invalidate all tokens on logout and on suspicious activity detection. Limits blast radius of token theft to the token's remaining lifetime.

## CTR_11 — Anomalous Authentication Pattern Detection
**Type:** detective | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing, elevation_of_privilege
**ISO 27001:** A.8.16, A.8.15 | **NIST CSF:** DE.CM-01, DE.AE-02 | **Source:** detecting-anomalous-authentication-patterns
Monitor authentication events for impossible travel, credential stuffing patterns, off-hours access, and unusual geolocation. Alert and step-up authenticate on anomaly detection.

## CTR_12 — OAuth Token Theft Detection
**Type:** detective | **CIAAAN:** confidentiality, authenticity | **STRIDE:** spoofing, information_disclosure
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01, DE.AE-06 | **Source:** detecting-oauth-token-theft
Detect token reuse from unexpected IP addresses, parallel sessions with same token, and refresh token replay attempts. Revoke token family on detection of theft indicators.

## CTR_13 — Suspicious OAuth Application Consent Detection
**Type:** detective | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01 | **Source:** detecting-suspicious-oauth-application-consent
Detect and alert on OAuth application consent grants to unregistered or high-permission applications. Require admin approval for applications requesting sensitive scopes.

## CTR_14 — Zero Trust Identity Verification
**Type:** preventive | **CIAAAN:** authenticity, authorization | **STRIDE:** spoofing, elevation_of_privilege
**ISO 27001:** A.8.5, A.5.15 | **NIST CSF:** PR.AA-01, PR.AA-05 | **Source:** implementing-identity-verification-for-zero-trust
Continuously verify user identity, device health, and access context on every transaction — not only at session start. Applies to all API calls and diagnostic workflow transitions.

## CTR_15 — Zero-Knowledge Proof for Authentication
**Type:** preventive | **CIAAAN:** authenticity, confidentiality | **STRIDE:** spoofing, information_disclosure
**ISO 27001:** A.8.5, A.8.24 | **NIST CSF:** PR.AA-01 | **Source:** implementing-zero-knowledge-proof-for-authentication
Prove user identity without transmitting credentials. Applicable for authentication flows where credential interception is a primary threat (high-sensitivity diagnostic operations).

---

# FAMILY B — Authorization & Access Control

## CTR_16 — Role-Based Access Control (RBAC) Design and Enforcement
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.5.15, A.5.18 | **NIST CSF:** PR.AA-05 | **Source:** building-role-mining-for-rbac-optimization
Design and enforce least-privilege roles for all platform functions. Map each diagnostic capability to a minimum required role. Eliminate wildcard permissions and role sprawl.

## CTR_17 — Identity Governance and Lifecycle Management
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.5.16, A.5.18 | **NIST CSF:** PR.AA-05, GV.PO-01 | **Source:** building-identity-governance-lifecycle-process
Enforce joiners-movers-leavers process: provision on hire, adjust on role change, deprovision immediately on termination. Prevents accumulation of excessive permissions over time.

## CTR_18 — Just-in-Time (JIT) Access Provisioning
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2, A.5.18 | **NIST CSF:** PR.AA-05 | **Source:** implementing-just-in-time-access-provisioning
Grant elevated access only for a defined time window and specific purpose, then auto-revoke. Eliminates persistent privileged access; limits the window of exploitation.

## CTR_19 — Zero Standing Privilege
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2 | **NIST CSF:** PR.AA-05 | **Source:** implementing-zero-standing-privilege-with-cyberark
Remove all persistent elevated permissions. All privileged access is requested, approved, time-bound, and automatically revoked. No user or service holds standing admin rights.

## CTR_20 — Privileged Access Management (PAM)
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2, A.5.18 | **NIST CSF:** PR.AA-05 | **Source:** implementing-privileged-access-management-with-cyberark
Vault and manage all privileged credentials (admin accounts, service accounts, API keys) in a PAM solution. Enforce check-out/check-in with session recording and automatic rotation.

## CTR_21 — Privileged Access Management for Database Access
**Type:** preventive | **CIAAAN:** authorization, confidentiality | **STRIDE:** elevation_of_privilege, information_disclosure
**ISO 27001:** A.8.2, A.8.3 | **NIST CSF:** PR.AA-05 | **Source:** implementing-pam-for-database-access
Proxy all database connections through PAM. No direct database credentials issued to applications or developers. All queries are attributed to an authenticated identity with session recording.

## CTR_22 — Privileged Session Monitoring
**Type:** detective | **CIAAAN:** authorization, non_repudiation | **STRIDE:** elevation_of_privilege, repudiation
**ISO 27001:** A.8.15, A.8.16 | **NIST CSF:** DE.CM-03 | **Source:** implementing-privileged-session-monitoring
Record and monitor all privileged sessions (admin, root, service account). Alert on anomalous commands, bulk data access, or policy-violating actions within privileged sessions.

## CTR_23 — Azure AD Privileged Identity Management (PIM)
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2, A.5.18 | **NIST CSF:** PR.AA-05 | **Source:** implementing-azure-ad-privileged-identity-management
Use Azure AD PIM to enforce JIT activation of privileged Azure AD roles (Global Admin, Application Admin). Require MFA and justification for role activation; auto-expire after the approved window.

## CTR_24 — AWS IAM Permission Boundaries
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2, A.5.18 | **NIST CSF:** PR.AA-05 | **Source:** implementing-aws-iam-permission-boundaries
Define maximum permission boundaries on IAM entities to prevent privilege escalation even if an entity's policy is misconfigured. Limits blast radius of compromised IAM credentials.

## CTR_25 — AWS IAM Hardening
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2 | **NIST CSF:** PR.AA-05 | **Source:** securing-aws-iam-permissions
Enforce least-privilege IAM policies. Remove wildcard (*) permissions. Enable IAM Access Analyzer. Require MFA for all IAM users. Disable root account access keys.

## CTR_26 — BOLA / Broken Object Level Authorization Detection
**Type:** detective | **CIAAAN:** authorization, confidentiality | **STRIDE:** elevation_of_privilege, information_disclosure
**ISO 27001:** A.8.16, A.8.3 | **NIST CSF:** DE.CM-01, DE.AE-02 | **Source:** detecting-broken-object-level-authorization
Detect API requests that access objects belonging to other users by monitoring authorization failures, ID enumeration patterns, and cross-tenant data access anomalies.

## CTR_27 — CSRF Token Enforcement
**Type:** preventive | **CIAAAN:** integrity, authenticity | **STRIDE:** tampering, spoofing
**ISO 27001:** A.8.26, A.8.27 | **NIST CSF:** PR.DS-01 | **Source:** custom
Enforce synchronizer token pattern or Double Submit Cookie on all state-changing API endpoints. Validate CSRF token on every non-GET/HEAD/OPTIONS request. Prevents cross-site request forgery against authenticated diagnostic sessions.

## CTR_28 — Periodic Access Recertification
**Type:** corrective | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.5.18, A.8.2 | **NIST CSF:** PR.AA-05 | **Source:** performing-access-review-and-certification
Conduct quarterly access reviews for all platform roles. Revoke unused, excessive, or unattested permissions. Document and retain review evidence for audit.

## CTR_29 — OAuth Scope Minimization
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.5.18, A.8.3 | **NIST CSF:** PR.AA-05 | **Source:** performing-oauth-scope-minimization-review
Audit and reduce OAuth scopes granted to all registered applications. Enforce principle of least privilege on scope grants. Reject applications requesting scopes broader than their documented purpose.

## CTR_30 — Service Account Credential Rotation
**Type:** corrective | **CIAAAN:** confidentiality, authenticity | **STRIDE:** information_disclosure, spoofing
**ISO 27001:** A.8.5, A.5.17 | **NIST CSF:** PR.AA-02 | **Source:** performing-service-account-credential-rotation
Rotate all service account credentials (API keys, client secrets, certificates) on a defined schedule and immediately on any suspected compromise. Use dynamic secrets where possible to eliminate long-lived credentials.

---

# FAMILY C — API Security

## CTR_31 — API Gateway Security Controls
**Type:** preventive | **CIAAAN:** availability, authorization, integrity | **STRIDE:** denial_of_service, elevation_of_privilege, tampering
**ISO 27001:** A.8.20, A.8.21, A.8.26 | **NIST CSF:** PR.PS-04 | **Source:** implementing-api-gateway-security-controls
Enforce authentication, authorization, rate limiting, schema validation, and TLS termination at the API gateway layer. Centralises security policy enforcement across all diagnostic API endpoints.

## CTR_32 — API Rate Limiting and Throttling
**Type:** preventive | **CIAAAN:** availability | **STRIDE:** denial_of_service
**ISO 27001:** A.8.6, A.8.21 | **NIST CSF:** PR.PS-04 | **Source:** implementing-api-rate-limiting-and-throttling
Enforce per-client and per-endpoint rate limits. Return 429 on threshold breach. Apply exponential backoff requirements on repeated failures. Prevents resource exhaustion and brute-force attacks.

## CTR_33 — API Abuse Detection
**Type:** detective | **CIAAAN:** availability, authorization | **STRIDE:** denial_of_service, elevation_of_privilege
**ISO 27001:** A.8.16, A.8.21 | **NIST CSF:** DE.CM-01 | **Source:** implementing-api-abuse-detection-with-rate-limiting
Detect anomalous API call patterns: volume spikes, sequential ID enumeration, unusual user-agent strings, and access pattern deviations from baseline. Alert and auto-block on confirmed abuse.

## CTR_34 — API Schema Validation
**Type:** preventive | **CIAAAN:** integrity, availability | **STRIDE:** tampering, denial_of_service
**ISO 27001:** A.8.26, A.8.28 | **NIST CSF:** PR.DS-01 | **Source:** implementing-api-schema-validation-security
Validate all API request and response payloads against OpenAPI/JSON Schema definitions. Reject requests that deviate from the declared schema at the gateway before reaching backend services.

## CTR_35 — API Key Security Controls
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.5, A.8.3 | **NIST CSF:** PR.AA-02 | **Source:** implementing-api-key-security-controls
Enforce API key scoping, expiry, and rotation. Store keys hashed server-side. Rotate on any suspected exposure. Enforce per-key rate limits and audit all API key usage.

## CTR_36 — API Security Posture Management
**Type:** detective | **CIAAAN:** authorization, integrity, availability | **STRIDE:** elevation_of_privilege, tampering, denial_of_service
**ISO 27001:** A.8.8, A.8.9 | **NIST CSF:** ID.RA-01 | **Source:** implementing-api-security-posture-management
Continuously scan the API surface for security misconfigurations, undocumented endpoints, excessive data exposure, and policy drift. Maintain an up-to-date API inventory.

## CTR_37 — Shadow API Endpoint Detection
**Type:** detective | **CIAAAN:** authorization, availability | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.8, A.5.9 | **NIST CSF:** ID.AM-03 | **Source:** detecting-shadow-api-endpoints
Discover undocumented or forgotten API endpoints through traffic analysis and API gateway logs. Shadow APIs bypass security controls and represent an unmanaged attack surface.

## CTR_38 — API Enumeration Attack Detection
**Type:** detective | **CIAAAN:** authorization, confidentiality | **STRIDE:** information_disclosure, elevation_of_privilege
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01 | **Source:** detecting-api-enumeration-attacks
Detect sequential object ID enumeration and parameter fuzzing in API traffic. Alert on patterns indicating an attacker is mapping the API surface or testing authorization boundaries.

## CTR_39 — API Gateway with WAF (AWS WAF)
**Type:** preventive | **CIAAAN:** availability, integrity, authorization | **STRIDE:** denial_of_service, tampering, elevation_of_privilege
**ISO 27001:** A.8.20, A.8.21 | **NIST CSF:** PR.PS-04 | **Source:** securing-api-gateway-with-aws-waf
Apply AWS WAF rules at the API Gateway to block SQL injection, XSS, SSRF, and known malicious IPs. Enforce geo-blocking and IP reputation filtering for the diagnostic API surface.

## CTR_40 — Cloud WAF Rules
**Type:** preventive | **CIAAAN:** integrity, availability, authorization | **STRIDE:** tampering, denial_of_service, elevation_of_privilege
**ISO 27001:** A.8.20, A.8.21 | **NIST CSF:** PR.PS-04 | **Source:** implementing-cloud-waf-rules
Deploy managed WAF rule sets (OWASP Core Rule Set) on cloud-hosted application endpoints. Block Layer 7 attacks before they reach application logic.

## CTR_41 — Content Security Policy (CSP) Enforcement
**Type:** preventive | **CIAAAN:** integrity, confidentiality | **STRIDE:** tampering, information_disclosure
**ISO 27001:** A.8.26, A.8.27 | **NIST CSF:** PR.DS-01 | **Source:** custom
Enforce Content-Security-Policy headers to restrict script sources, prohibit inline scripts, and block data exfiltration via CSP report-uri. Prevents XSS-based token theft and data exfiltration from the browser client.

## CTR_42 — Input Validation and Output Encoding
**Type:** preventive | **CIAAAN:** integrity, availability | **STRIDE:** tampering, denial_of_service
**ISO 27001:** A.8.28, A.8.26 | **NIST CSF:** PR.DS-01 | **Source:** custom
Validate all API input against strict allowlists at the application boundary. Encode all output before rendering. Block SQL, XSS, command injection, and path traversal patterns at every entry point.

## CTR_43 — DDoS Mitigation
**Type:** preventive | **CIAAAN:** availability | **STRIDE:** denial_of_service
**ISO 27001:** A.8.6, A.8.20 | **NIST CSF:** PR.IR-01 | **Source:** implementing-ddos-mitigation-with-cloudflare
Deploy volumetric and protocol-level DDoS protection at the network and application layer. Apply traffic scrubbing and rate-based blocking for the diagnostic platform endpoints.

---

# FAMILY D — Cryptography and Data Protection

## CTR_44 — TLS 1.3 Enforcement
**Type:** preventive | **CIAAAN:** confidentiality, integrity, authenticity | **STRIDE:** information_disclosure, tampering, spoofing
**ISO 27001:** A.8.24, A.8.20 | **NIST CSF:** PR.DS-02 | **Source:** configuring-tls-1-3-for-secure-communications
Enforce TLS 1.3 minimum on all API endpoints and data flows. Disable TLS 1.0/1.1 and weak cipher suites. Enable HSTS with preloading for all diagnostic platform domains.

## CTR_45 — AES Encryption for Data at Rest
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.24 | **NIST CSF:** PR.DS-01 | **Source:** implementing-aes-encryption-for-data-at-rest
Encrypt all sensitive data at rest (VIN records, DTC history, user PII, session data) using AES-256. Enforce database-level and storage-level encryption with managed key rotation.

## CTR_46 — JWT Signing, Verification and Algorithm Pinning
**Type:** preventive | **CIAAAN:** authenticity, integrity, non_repudiation | **STRIDE:** spoofing, tampering, repudiation
**ISO 27001:** A.8.24, A.8.5 | **NIST CSF:** PR.DS-02, PR.AA-02 | **Source:** implementing-jwt-signing-and-verification
Sign all JWTs with RS256 or ES256 (asymmetric). Pin the accepted algorithm at the verifier — never accept 'none' or HS256 with public keys. Validate all claims (iss, aud, exp, iat) on every request.

## CTR_47 — Envelope Encryption with KMS
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.24 | **NIST CSF:** PR.DS-01 | **Source:** implementing-envelope-encryption-with-aws-kms
Use AWS KMS or Azure Key Vault for envelope encryption of sensitive database fields (PII, credentials, tokens). Enforces key management separation — application never holds the master key.

## CTR_48 — RSA and Certificate Key Management
**Type:** preventive | **CIAAAN:** confidentiality, authenticity | **STRIDE:** information_disclosure, spoofing
**ISO 27001:** A.8.24 | **NIST CSF:** PR.DS-01 | **Source:** implementing-rsa-key-pair-management
Manage PKI keys with defined expiry, rotation schedules, and revocation procedures. Store private keys in HSM or KMS — never in code or config files. Monitor certificate expiry to prevent service disruption.

## CTR_49 — SSL/TLS Certificate Lifecycle Management
**Type:** corrective | **CIAAAN:** authenticity, integrity | **STRIDE:** spoofing, tampering
**ISO 27001:** A.8.24 | **NIST CSF:** PR.DS-02 | **Source:** performing-ssl-certificate-lifecycle-management
Automate certificate issuance, renewal, and revocation using ACME protocol (Let's Encrypt) or managed PKI. Alert on certificates expiring within 30 days. Revoke immediately on key compromise.

## CTR_50 — End-to-End Encryption for Sensitive Data Flows
**Type:** preventive | **CIAAAN:** confidentiality, integrity | **STRIDE:** information_disclosure, tampering
**ISO 27001:** A.8.24 | **NIST CSF:** PR.DS-02 | **Source:** implementing-end-to-end-encryption-for-messaging
Apply application-layer encryption for particularly sensitive diagnostic data flows (VIN lookups, DTC transfers) in addition to transport-layer TLS. Protects data even if TLS is terminated at an intermediate proxy.

## CTR_51 — Cryptographic Audit of Application
**Type:** detective | **CIAAAN:** confidentiality, integrity | **STRIDE:** information_disclosure, tampering
**ISO 27001:** A.8.24, A.8.8 | **NIST CSF:** ID.RA-01 | **Source:** performing-cryptographic-audit-of-application
Audit all cryptographic implementations in the application: algorithm choices, key lengths, IV/nonce reuse, and deprecated functions. Flag weak cryptography before exploitation.

## CTR_52 — Data Masking and Tokenization
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.11 | **NIST CSF:** PR.DS-01 | **Source:** custom
Mask PII and sensitive fields (VIN, DTC history, technician identifiers) in API responses, logs, and non-production environments. Tokenize PII at the point of collection — store tokens not raw values in diagnostic records.

## CTR_53 — Cloud DLP for Data Protection
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.11, A.8.12 | **NIST CSF:** PR.DS-01 | **Source:** implementing-cloud-dlp-for-data-protection
Deploy cloud DLP to detect and prevent PII and sensitive data from being exposed in API responses, logs, or storage buckets. Apply automated redaction on policy violation.

## CTR_54 — AWS Macie for PII Data Classification
**Type:** detective | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.5.12, A.8.12 | **NIST CSF:** ID.AM-05, DE.CM-01 | **Source:** implementing-aws-macie-for-data-classification
Use AWS Macie to continuously discover and classify PII in S3 buckets and data stores. Alert on sensitive data stored in unexpected locations or without required encryption.

## CTR_55 — Vault Dynamic Secrets Management
**Type:** preventive | **CIAAAN:** confidentiality, authenticity | **STRIDE:** information_disclosure, spoofing
**ISO 27001:** A.8.24, A.8.5 | **NIST CSF:** PR.AA-02 | **Source:** implementing-hashicorp-vault-dynamic-secrets
Generate short-lived, just-in-time credentials for all service-to-service authentication using HashiCorp Vault or equivalent. Eliminates static, long-lived secrets from application configuration.

## CTR_56 — DMARC, DKIM, and SPF Email Authentication
**Type:** preventive | **CIAAAN:** authenticity, integrity | **STRIDE:** spoofing, tampering
**ISO 27001:** A.8.24, A.5.14 | **NIST CSF:** PR.AA-01 | **Source:** implementing-dmarc-dkim-spf-email-security
Enforce DMARC (p=reject), DKIM signing, and SPF records for all platform email domains. Prevents email spoofing attacks targeting platform users (phishing for session credentials).

---

# FAMILY E — Audit Logging and Non-Repudiation

## CTR_57 — Audit Log Integrity and Tamper-Proofing
**Type:** preventive | **CIAAAN:** non_repudiation, integrity | **STRIDE:** repudiation, tampering
**ISO 27001:** A.8.15, A.5.33 | **NIST CSF:** PR.DS-01, DE.CM-03 | **Source:** custom
Write all authentication, authorization, and data access events to append-only, write-once storage with cryptographic chaining (hash-linked log entries). Every record must include: user identity, timestamp, action, resource, outcome, and source IP. Provides irrefutable audit evidence.

## CTR_58 — Web Application Logging with ModSecurity / WAF Logging
**Type:** detective | **CIAAAN:** non_repudiation, integrity, availability | **STRIDE:** repudiation, tampering, denial_of_service
**ISO 27001:** A.8.15, A.8.16 | **NIST CSF:** DE.CM-01 | **Source:** implementing-web-application-logging-with-modsecurity
Log all web request/response pairs including headers, status codes, and matched security rules. Correlate WAF logs with application logs for complete request attribution. Enables forensic reconstruction of attacks.

## CTR_59 — AWS CloudTrail Log Analysis
**Type:** detective | **CIAAAN:** non_repudiation, authorization | **STRIDE:** repudiation, elevation_of_privilege
**ISO 27001:** A.8.15, A.8.16 | **NIST CSF:** DE.CM-03, DE.AE-02 | **Source:** implementing-cloud-trail-log-analysis
Enable AWS CloudTrail for all API calls across all regions. Deliver logs to a dedicated, cross-account S3 bucket with MFA-delete enabled. Analyse CloudTrail for privilege escalation, credential use, and policy changes.

## CTR_60 — AWS CloudTrail Anomaly Detection
**Type:** detective | **CIAAAN:** non_repudiation, authorization | **STRIDE:** repudiation, elevation_of_privilege
**ISO 27001:** A.8.16 | **NIST CSF:** DE.AE-02, DE.CM-03 | **Source:** detecting-aws-cloudtrail-anomalies
Detect anomalous AWS API call patterns: after-hours console logins, access from unusual regions, high-volume API calls, and IAM policy changes. Alert within 15 minutes of anomaly detection.

## CTR_61 — Cloud SIEM with Microsoft Sentinel
**Type:** detective | **CIAAAN:** non_repudiation, availability, authorization | **STRIDE:** repudiation, denial_of_service, elevation_of_privilege
**ISO 27001:** A.8.15, A.8.16 | **NIST CSF:** DE.CM-01, DE.AE-02 | **Source:** building-cloud-siem-with-sentinel
Centralise all platform logs (Azure AD, Azure activity, application, API gateway) in Microsoft Sentinel. Apply detection rules for known attack patterns. Correlate events across identity, network, and application layers.

## CTR_62 — Insider Threat Detection with UEBA
**Type:** detective | **CIAAAN:** authorization, non_repudiation, confidentiality | **STRIDE:** elevation_of_privilege, repudiation, information_disclosure
**ISO 27001:** A.8.16, A.6.8 | **NIST CSF:** DE.CM-03 | **Source:** detecting-insider-threat-with-ueba
Apply User and Entity Behaviour Analytics (UEBA) to baseline normal access patterns and detect deviations: bulk data exports, access to unrelated vehicle records, off-hours privileged operations.

## CTR_63 — Compromised Cloud Credential Detection
**Type:** detective | **CIAAAN:** confidentiality, authenticity | **STRIDE:** spoofing, information_disclosure
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01 | **Source:** detecting-compromised-cloud-credentials
Monitor for credential use from unexpected locations, concurrent sessions from geographically distinct IPs, and access patterns inconsistent with the credential owner's normal behaviour.

## CTR_64 — Credential Exposure Detection in Source Code
**Type:** detective | **CIAAAN:** confidentiality, authenticity | **STRIDE:** information_disclosure, spoofing
**ISO 27001:** A.8.15, A.8.8 | **NIST CSF:** DE.CM-01 | **Source:** detecting-aws-credential-exposure-with-trufflehog
Scan all repositories, CI/CD pipelines, and build artefacts for exposed credentials (API keys, tokens, private keys, connection strings). Alert and rotate immediately on any finding.

## CTR_65 — Secrets Scanning in CI/CD Pipeline
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.8, A.8.28 | **NIST CSF:** PR.DS-01 | **Source:** implementing-secrets-scanning-in-ci-cd
Block builds containing secrets using pre-commit hooks and CI/CD pipeline scanning (Gitleaks, Trufflehog). Prevent credentials from ever reaching source control or build artefacts.

## CTR_66 — GDPR Data Subject Rights and Audit Trail
**Type:** corrective | **CIAAAN:** non_repudiation, confidentiality | **STRIDE:** repudiation
**ISO 27001:** A.5.34 | **NIST CSF:** GV.PO-01 | **Source:** implementing-gdpr-data-subject-access-request
Maintain complete audit trail of all personal data processing to support DSAR (Data Subject Access Request) obligations. Log data access, export, deletion, and modification with identity attribution.

---

# FAMILY F — Cloud Platform Security (Azure and AWS)

## CTR_67 — Azure AD Configuration Audit
**Type:** detective | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.9, A.5.35 | **NIST CSF:** ID.RA-01 | **Source:** auditing-azure-active-directory-configuration
Audit Azure AD tenant configuration: guest access settings, legacy authentication protocols, consent framework policies, and conditional access gaps. Identify misconfigurations before exploitation.

## CTR_68 — Azure Service Principal Abuse Detection
**Type:** detective | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01 | **Source:** detecting-azure-service-principal-abuse
Monitor service principal authentication events for token theft indicators: usage from unexpected IPs, off-hours access, permission escalation attempts, and credential creation by non-admin principals.

## CTR_69 — Azure Lateral Movement Detection
**Type:** detective | **CIAAAN:** authorization, confidentiality | **STRIDE:** elevation_of_privilege, information_disclosure
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-01, DE.AE-06 | **Source:** detecting-azure-lateral-movement
Detect lateral movement patterns within Azure: unusual role assignments, inter-resource access from unexpected principals, and Managed Identity token requests outside normal application flow.

## CTR_70 — AWS Lambda Execution Role Isolation
**Type:** preventive | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.2, A.8.25 | **NIST CSF:** PR.AA-05 | **Source:** securing-aws-lambda-execution-roles
Assign a dedicated least-privilege IAM execution role to each Lambda function. Functions must not share roles. No Lambda function should have IAM write permissions or assume arbitrary roles.

## CTR_71 — AWS IAM Privilege Escalation Detection
**Type:** detective | **CIAAAN:** authorization | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.16 | **NIST CSF:** DE.CM-03 | **Source:** detecting-aws-iam-privilege-escalation
Detect IAM privilege escalation attempts: iam:PassRole abuse, policy attachment to self, creation of new admin users, and assume-role chains that bypass permission boundaries.

## CTR_72 — AWS Config Compliance Rules
**Type:** detective | **CIAAAN:** integrity, authorization | **STRIDE:** tampering, elevation_of_privilege
**ISO 27001:** A.8.9, A.5.36 | **NIST CSF:** ID.RA-01, DE.CM-01 | **Source:** implementing-aws-config-rules-for-compliance
Enable AWS Config managed rules for critical security controls: S3 public access block, RDS encryption, Security Group ingress restrictions, CloudTrail enabled, and MFA on root. Alert on rule violations.

## CTR_73 — Cloud Security Posture Management (CSPM)
**Type:** detective | **CIAAAN:** integrity, authorization, availability | **STRIDE:** tampering, elevation_of_privilege
**ISO 27001:** A.8.9, A.8.8 | **NIST CSF:** ID.RA-01 | **Source:** implementing-cloud-security-posture-management
Continuously assess cloud infrastructure configuration against security benchmarks (CIS, NIST). Detect and alert on misconfigurations: public buckets, open security groups, disabled encryption, missing logging.

## CTR_74 — Cloud Workload Protection
**Type:** preventive | **CIAAAN:** integrity, availability | **STRIDE:** tampering, denial_of_service
**ISO 27001:** A.8.7, A.8.20 | **NIST CSF:** PR.PS-01 | **Source:** implementing-cloud-workload-protection
Deploy workload protection agents on cloud compute instances. Detect and block runtime attacks: process injection, filesystem modification, network anomalies, and memory-based exploits on backend services.

## CTR_75 — Shadow IT Cloud Usage Detection
**Type:** detective | **CIAAAN:** authorization, confidentiality | **STRIDE:** elevation_of_privilege, information_disclosure
**ISO 27001:** A.8.9, A.5.14 | **NIST CSF:** ID.AM-03 | **Source:** detecting-shadow-it-cloud-usage
Detect use of unsanctioned cloud services by platform users or developers. Shadow IT bypasses security controls; diagnostic data in unsanctioned services creates uncontrolled data flows.

---

# FAMILY G — Zero Trust and Network Controls

## CTR_76 — Zero Trust Architecture for SaaS
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.5.15, A.8.20 | **NIST CSF:** PR.AA-05 | **Source:** implementing-zero-trust-for-saas-applications
Apply zero trust principles to all SaaS access: continuous identity verification, device posture checks, and least-privilege access per session. No implicit trust from network location.

## CTR_77 — Network Microsegmentation
**Type:** preventive | **CIAAAN:** availability, authorization | **STRIDE:** denial_of_service, elevation_of_privilege
**ISO 27001:** A.8.22 | **NIST CSF:** PR.IR-01 | **Source:** configuring-microsegmentation-for-zero-trust
Segment the diagnostic platform backend into isolated network zones. API services, databases, and ML engines communicate only on declared paths. Blocks lateral movement after initial compromise.

## CTR_78 — BeyondCorp Zero Trust Access Model
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.5.15, A.8.20 | **NIST CSF:** PR.AA-05 | **Source:** implementing-beyondcorp-zero-trust-access-model
Implement device-and-identity based access control where network location provides no implicit trust. All access decisions based on verified device identity and user credentials, regardless of network.

## CTR_79 — Network Access Control
**Type:** preventive | **CIAAAN:** authorization, availability | **STRIDE:** elevation_of_privilege, denial_of_service
**ISO 27001:** A.8.20, A.5.15 | **NIST CSF:** PR.AA-05 | **Source:** implementing-network-access-control
Enforce network access control policies that permit only authenticated and authorised devices to connect to diagnostic platform segments. Block unauthenticated and non-compliant endpoints at the network layer.

## CTR_80 — DNS Exfiltration Detection
**Type:** detective | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.16, A.8.20 | **NIST CSF:** DE.CM-01 | **Source:** detecting-dns-exfiltration-with-dns-query-analysis
Monitor DNS query patterns for high-frequency lookups, unusually long subdomains, and known DNS-over-HTTPS exfiltration signatures. Alert on data exfiltration via DNS tunnelling from backend services.

## CTR_81 — Runtime Application Self-Protection (RASP)
**Type:** preventive | **CIAAAN:** integrity, availability | **STRIDE:** tampering, denial_of_service
**ISO 27001:** A.8.26, A.8.27 | **NIST CSF:** PR.PS-01 | **Source:** implementing-runtime-application-self-protection
Instrument application runtime to detect and block attacks in real time: SQL injection, command injection, path traversal, and deserialization exploits — without requiring a WAF signature update.

## CTR_82 — Zero Trust Network Access (ZTNA)
**Type:** preventive | **CIAAAN:** authorization, availability | **STRIDE:** elevation_of_privilege
**ISO 27001:** A.8.20 | **NIST CSF:** PR.AA-05 | **Source:** implementing-zero-trust-network-access-with-zscaler
Replace VPN with identity-and-context aware ZTNA. Grant access only to specific applications after verifying identity, device posture, and access entitlement — not to the entire network segment.

## CTR_83 — GDPR Data Protection Framework Controls
**Type:** preventive | **CIAAAN:** confidentiality, non_repudiation | **STRIDE:** information_disclosure, repudiation
**ISO 27001:** A.5.34 | **NIST CSF:** GV.PO-01 | **Source:** implementing-gdpr-data-protection-controls
Implement GDPR-required controls: lawful basis documentation, consent management, data minimisation, purpose limitation, retention limits, and breach notification procedures for all personal data processed.

---

# FAMILY H — Secure Development and Build Security

## CTR_84 — Static Application Security Testing (SAST)
**Type:** preventive | **CIAAAN:** integrity | **STRIDE:** tampering
**ISO 27001:** A.8.28, A.8.29 | **NIST CSF:** PR.PS-01 | **Source:** implementing-semgrep-for-custom-sast-rules
Run automated SAST on every pull request. Enforce zero-tolerance for high-severity findings. Block merge on injection vulnerabilities, hardcoded secrets, and insecure cryptography patterns.

## CTR_85 — Secret Scanning in Version Control
**Type:** preventive | **CIAAAN:** confidentiality | **STRIDE:** information_disclosure
**ISO 27001:** A.8.8, A.8.28 | **NIST CSF:** PR.DS-01 | **Source:** implementing-secret-scanning-with-gitleaks
Scan all commits and repository history for credentials using Gitleaks. Block commits containing secrets at pre-commit hook level. Rotate any credential that has ever appeared in version control.

## CTR_86 — Secure CI/CD Pipeline (GitHub Actions)
**Type:** preventive | **CIAAAN:** integrity, authorization | **STRIDE:** tampering, elevation_of_privilege
**ISO 27001:** A.8.25, A.8.28 | **NIST CSF:** PR.PS-01 | **Source:** securing-github-actions-workflows
Pin all GitHub Actions to specific commit SHAs. Enforce least-privilege GITHUB_TOKEN permissions per job. Require environment protection rules and manual approvals for production deployments.

## CTR_87 — Azure AD Service Principal Hardening
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.2, A.8.5 | **NIST CSF:** PR.AA-05 | **Source:** auditing-azure-active-directory-configuration
Enforce certificate-based authentication for all service principals (no client secrets). Assign minimum-required API permissions. Enable service principal sign-in risk detection in Azure AD Identity Protection.

## CTR_88 — AWS Lambda and Serverless Hardening
**Type:** preventive | **CIAAAN:** integrity, authorization | **STRIDE:** tampering, elevation_of_privilege
**ISO 27001:** A.8.25, A.8.9 | **NIST CSF:** PR.PS-01 | **Source:** securing-aws-lambda-execution-roles
Harden serverless functions: validate all input, enforce function-level timeouts, disable unused runtime features, restrict outbound network access to declared endpoints, and use VPC placement with security groups.

## CTR_89 — Device Posture Assessment for Zero Trust
**Type:** preventive | **CIAAAN:** authorization, authenticity | **STRIDE:** elevation_of_privilege, spoofing
**ISO 27001:** A.8.5, A.5.15 | **NIST CSF:** PR.AA-05 | **Source:** implementing-device-posture-assessment-in-zero-trust
Assess device compliance (OS patch level, disk encryption, endpoint protection status) before granting access. Deny or step-up-authenticate sessions from non-compliant or unmanaged devices.

---

# Control Index by CIAAAN Property

## Confidentiality
CTR_01, CTR_02, CTR_06, CTR_09, CTR_10, CTR_12, CTR_14, CTR_15, CTR_21, CTR_26, CTR_30,
CTR_38, CTR_44, CTR_45, CTR_47, CTR_48, CTR_50, CTR_51, CTR_52, CTR_53, CTR_54, CTR_55,
CTR_57 (integrity side), CTR_63, CTR_64, CTR_65, CTR_66, CTR_75, CTR_80, CTR_83, CTR_85

## Integrity
CTR_27, CTR_34, CTR_39, CTR_40, CTR_41, CTR_42, CTR_44, CTR_46, CTR_50, CTR_51, CTR_57,
CTR_58, CTR_72, CTR_73, CTR_74, CTR_78, CTR_81, CTR_84, CTR_86, CTR_88

## Availability
CTR_31, CTR_32, CTR_33, CTR_39, CTR_40, CTR_43, CTR_58, CTR_61, CTR_73, CTR_74, CTR_77,
CTR_78, CTR_79, CTR_82

## Authenticity
CTR_01, CTR_02, CTR_03, CTR_04, CTR_05, CTR_06, CTR_08, CTR_09, CTR_10, CTR_11, CTR_12,
CTR_13, CTR_14, CTR_15, CTR_27, CTR_30, CTR_35, CTR_44, CTR_46, CTR_49, CTR_56, CTR_63,
CTR_67, CTR_68, CTR_87, CTR_89

## Authorization
CTR_02, CTR_06, CTR_07, CTR_13, CTR_16, CTR_17, CTR_18, CTR_19, CTR_20, CTR_21, CTR_22,
CTR_23, CTR_24, CTR_25, CTR_26, CTR_27, CTR_28, CTR_29, CTR_31, CTR_33, CTR_35, CTR_36,
CTR_37, CTR_38, CTR_39, CTR_40, CTR_62, CTR_67, CTR_68, CTR_69, CTR_70, CTR_71, CTR_72,
CTR_73, CTR_75, CTR_76, CTR_78, CTR_79, CTR_82, CTR_86, CTR_87, CTR_88, CTR_89

## Non-Repudiation
CTR_22, CTR_46, CTR_57, CTR_58, CTR_59, CTR_60, CTR_61, CTR_62, CTR_66, CTR_83

---

# Control Index by STRIDE Category

## Spoofing
CTR_01, CTR_02, CTR_03, CTR_04, CTR_05, CTR_06, CTR_08, CTR_09, CTR_10, CTR_11, CTR_12,
CTR_13, CTR_14, CTR_15, CTR_27, CTR_30, CTR_35, CTR_44, CTR_46, CTR_49, CTR_56, CTR_63,
CTR_67, CTR_68, CTR_76, CTR_78, CTR_81, CTR_87, CTR_89

## Tampering
CTR_27, CTR_34, CTR_39, CTR_40, CTR_41, CTR_42, CTR_44, CTR_46, CTR_49, CTR_50, CTR_57,
CTR_58, CTR_59, CTR_60, CTR_72, CTR_74, CTR_78, CTR_81, CTR_84, CTR_86, CTR_88

## Repudiation
CTR_22, CTR_46, CTR_57, CTR_58, CTR_59, CTR_60, CTR_61, CTR_62, CTR_66, CTR_83

## Information Disclosure
CTR_09, CTR_10, CTR_12, CTR_14, CTR_15, CTR_21, CTR_26, CTR_38, CTR_41, CTR_44, CTR_45,
CTR_47, CTR_48, CTR_50, CTR_51, CTR_52, CTR_53, CTR_54, CTR_55, CTR_63, CTR_64, CTR_65,
CTR_69, CTR_75, CTR_80, CTR_83, CTR_85

## Denial of Service
CTR_31, CTR_32, CTR_33, CTR_34, CTR_39, CTR_40, CTR_42, CTR_43, CTR_58, CTR_74, CTR_77,
CTR_78, CTR_79, CTR_81, CTR_83

## Elevation of Privilege
CTR_06, CTR_07, CTR_11, CTR_13, CTR_16, CTR_17, CTR_18, CTR_19, CTR_20, CTR_21, CTR_22,
CTR_23, CTR_24, CTR_25, CTR_26, CTR_28, CTR_29, CTR_31, CTR_33, CTR_36, CTR_37, CTR_38,
CTR_39, CTR_40, CTR_43, CTR_62, CTR_67, CTR_68, CTR_69, CTR_70, CTR_71, CTR_72, CTR_73,
CTR_75, CTR_76, CTR_77, CTR_78, CTR_79, CTR_81, CTR_82, CTR_86, CTR_87, CTR_88, CTR_89
