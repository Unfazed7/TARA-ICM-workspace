# CIAAAN Cybersecurity Properties — Layer 3 Reference

Used by: Stage 01 (Input Normalization), Stage 02 (Damage Analysis)  
Standard: ISO/SAE 21434 (extended for web application context)

---

## The 6 CIAAAN Properties

For web-based TARAs, all 6 properties apply. Each asset is assessed against each applicable property.

| Symbol | Property | Definition | Web Application Example |
|--------|----------|------------|------------------------|
| **C** | Confidentiality | Information is not disclosed to unauthorized parties | Refresh tokens, PII, diagnostic data, API keys |
| **I** | Integrity | Information/functions are not modified without authorization | OTA packages, vehicle configs, audit logs, ML model weights |
| **A** | Availability | System functions are accessible when needed | Diagnostic API, license validation service, OTA update channel |
| **Au** | Authenticity | Identity of users, systems, or messages can be verified | JWT tokens, API request signing, user session identity |
| **Az** | Authorization | Authenticated parties have only their permitted access | Role-based access, object-level permissions (anti-BOLA) |
| **NR** | Non-repudiation | Actions cannot be denied after the fact | Diagnostic command logs, license activation events, OTA approvals |

---

## How Properties Are Assessed

In the Asset List (input), each property is flagged **Y** (applicable) or **N** (not applicable).

```
C = Y → derive one damage scenario for Confidentiality of this asset
I = Y → derive one damage scenario for Integrity of this asset
A = Y → derive one damage scenario for Availability of this asset
Au = Y → derive one damage scenario for Authenticity of this asset
Az = Y → derive one damage scenario for Authorization of this asset
NR = Y → derive one damage scenario for Non-repudiation of this asset
```

One asset with 4 applicable properties → 4 damage scenarios → 4 threats → 4 attack paths.

---

## Property Assignment Rules for Architecture Diagram Mode

When assets are derived from architecture diagram (no pre-built asset list), the AI agent assigns properties using these rules:

| Asset Type | Typical CIAAAN Profile |
|-----------|----------------------|
| Auth credentials (tokens, keys, certificates) | C=Y, I=Y, Au=Y, Az=Y, NR=N, A=N |
| API endpoints | I=Y, A=Y, Au=Y, Az=Y, NR=Y, C=N (usually) |
| Database / data store | C=Y, I=Y, A=Y, Au=N, Az=Y, NR=N |
| Audit log / event log | C=N, I=Y, A=N, Au=N, Az=N, NR=Y |
| User session | C=Y, I=N, A=N, Au=Y, Az=Y, NR=N |
| Cloud service | C=N, I=N, A=Y, Au=N, Az=N, NR=N |
| OTA update package | C=N, I=Y, A=Y, Au=Y, Az=N, NR=N |
| ML model / algorithm | C=Y, I=Y, A=N, Au=N, Az=N, NR=N |

These are starting points — the agent must justify any deviation.

---

## CIAAAN vs CIA (Why the Difference Matters)

Standard CIA covers 3 properties. CIAAAN adds 3 more that are critical for web apps:

| Property | Why Standard CIA Misses It |
|----------|--------------------------|
| Authenticity (Au) | CIA "confidentiality" doesn't capture identity forgery / token replay |
| Authorization (Az) | CIA doesn't capture BOLA, BFLA, privilege escalation specifically |
| Non-repudiation (NR) | CIA "integrity" doesn't capture audit log absence or deniability |

A TARA using only CIA would miss: spoofing attacks, BOLA exploits, and audit evasion threats.

---

## Format in Asset Register

```json
{
  "asset_id": "AS_01",
  "asset_title": "Refresh Token",
  "asset_type": "auth_credential",
  "asset_description": "OAuth 2.0 long-lived token stored in browser localStorage",
  "ciaaan": {
    "confidentiality": true,
    "integrity": false,
    "availability": false,
    "authenticity": true,
    "authorization": true,
    "non_repudiation": false
  },
  "ciaaan_justification": "Refresh token confidentiality is critical as exposure enables session replay. Authenticity matters as forged tokens can impersonate users. Authorization is relevant as stolen tokens bypass access controls."
}
```
