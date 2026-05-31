# Web Asset Types — Layer 3 Reference

Used by: Stage 02 (Asset Analysis)  
Purpose: Taxonomy of assets specific to web-based automotive applications

---

## Asset Type Definitions

### communication_path
A data channel between two nodes.

**Web-automotive examples:**
- REST API connection between frontend and backend
- HTTPS connection to Azure Key Vault
- WebSocket connection for real-time telemetry streaming
- Message queue (Azure Service Bus, RabbitMQ) between services
- OAuth 2.0 authorization flow between app and identity provider
- OTA update download channel (CDN → vehicle gateway)

**CIA considerations:** Integrity and confidentiality typically high. Availability varies.

---

### data_store
A repository where data is persisted.

**Web-automotive examples:**
- Vehicle configuration database (PostgreSQL, MongoDB)
- License entitlement database
- Audit log store (Azure Monitor, Splunk)
- OTA firmware package repository (Azure Blob Storage)
- Session store (Redis)
- Secrets store (Azure Key Vault, HashiCorp Vault)
- User PII database

**CIA considerations:** Confidentiality typically high for PII/secrets. Integrity critical for configuration data. Availability high for license DB (revenue-impacting).

---

### ecu (for web-automotive hybrid systems)
A hardware compute unit connected to or controlled by the web system.

**Web-automotive examples:**
- Telematics Control Unit (TCU) that connects to cloud backend
- OTA-capable ECU receiving updates from the web service
- Gateway ECU that bridges CAN to Ethernet/cloud

**CIA considerations:** Integrity is paramount (firmware integrity). Availability affects vehicle function.

---

### function
A software capability or process.

**Web-automotive examples:**
- Vehicle diagnostic API handler (processes diagnostic requests)
- License validation function (checks entitlements before activation)
- OTA update authorization function (validates and approves updates)
- Authentication middleware (validates JWT tokens)
- Audit logging function (records all diagnostic commands)
- Anomaly detection function (monitors for unusual API patterns)

**CIA considerations:** Integrity critical (function must behave correctly). Availability varies by criticality.

---

### auth_credential
Authentication or authorization artifact.

**Web-automotive examples:**
- JWT access tokens (short-lived)
- OAuth 2.0 refresh tokens (long-lived, high value)
- API keys for service-to-service communication
- Certificates (TLS client certs, code signing certs)
- Azure Managed Identity credentials
- Service account passwords

**CIA considerations:** Confidentiality always critical. Integrity critical (must not be tampered). Availability less critical (can be re-issued).

Note: This is a web-MVP addition to the base asset type taxonomy (extends `data_store`).

---

### api_endpoint
A specific HTTP endpoint exposed by the application.

**Web-automotive examples:**
- `POST /api/v1/vehicles/{vin}/diagnose` — triggers diagnostic session
- `PUT /api/v1/licenses/{id}/activate` — activates a license
- `GET /api/v1/vehicles/{vin}/telemetry` — retrieves vehicle telemetry
- `POST /api/v1/ota/approve` — approves an OTA update for deployment
- `GET /api/admin/users` — lists all users (admin only)

**CIA considerations:** Integrity critical (parameters must not be tampered). Confidentiality varies (some endpoints expose PII). Availability impacts business continuity.

Note: This is a web-MVP addition to the base asset type taxonomy.

---

### cloud_service
A managed cloud platform service the application depends on.

**Web-automotive examples:**
- Azure Active Directory (authentication provider)
- Azure Key Vault (secret storage)
- Azure API Management (API gateway)
- Azure Blob Storage (OTA package repository)
- Azure Service Bus (async message queue)
- Azure Monitor / Log Analytics (observability)
- Azure App Service (hosting)

**CIA considerations:** Confidentiality critical for Key Vault. Integrity critical for identity provider. Availability critical for App Service (revenue-impacting downtime).

Note: This is a web-MVP addition to the base asset type taxonomy.

---

## CIA Rating Scale

For web assets, CIA ratings follow this scale:

| Rating | Confidentiality | Integrity | Availability |
|--------|----------------|-----------|-------------|
| negligible | Public data, no harm if exposed | Corruption has no functional impact | Brief unavailability acceptable |
| low | Internal data, minor harm if exposed | Corruption causes minor functional degradation | Hours of unavailability acceptable |
| medium | Sensitive data (PII, VIN data) | Corruption causes significant malfunction | Hours cause notable business impact |
| high | Secret data (credentials, private keys) | Corruption causes safety/financial harm | Hours cause serious business impact |
| critical | Highest-sensitivity data (root CA, master keys) | Corruption causes catastrophic outcome | Any downtime has major consequences |

---

## Asset ID Naming Convention

```
AST-{NNN}  — Sequential, zero-padded (AST-001, AST-002, ...)
```

Asset IDs must be globally unique within an assessment.

---

## Minimum Assets Expected for a Web-Automotive System

A thorough Stage 02 analysis should identify assets in MOST of these categories:

- [ ] Primary API endpoint group (auth, core business functions)
- [ ] Authentication system (tokens, sessions, identity provider)
- [ ] Database(s) (vehicle data, user data, configuration)
- [ ] Secret/key management system
- [ ] Audit/logging system
- [ ] OTA update pipeline (if applicable)
- [ ] Cloud services (hosting, queuing, storage)
- [ ] Admin interfaces (if separate from user-facing API)

If fewer than 8-10 assets are identified for a typical web-automotive app, the analysis is likely incomplete.
