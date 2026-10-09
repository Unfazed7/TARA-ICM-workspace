# Key and Certificate Portal: Functional Description

Version 0.3

Synthetic document for testing. It describes no real system.

---

## 1. Overview

The portal manages X.509 certificates for company services. The portal web pages are served from a storage bucket through the CDN. Requests are handled by the certificate service. Certificates are signed by the signing service, which uses the CA signing key.

## 2. Actors

| Actor | What they do |
|---|---|
| Operators | Request certificates for their services and download issued certificates |
| Security admins | Approve and revoke certificates, rotate the CA signing key, read the audit history |
| Internal services | Request and download certificates through the API. They call the API with a client certificate issued by the portal |
| Deploy pipeline | Deploys new versions of the portal |

## 3. Functions

### 3.1 Sign in
Operators and security admins sign in through the corporate SSO. The portal receives a token and sends it with every API call.

### 3.2 Request a certificate
An operator or an internal service submits a certificate signing request with the service name and the requested validity. The certificate service stores the request.
Endpoint: `POST /certificates/requests`

### 3.3 Approve a request
A security admin reviews a pending request and approves or rejects it.
Endpoint: `POST /certificates/requests/{id}/decision`

### 3.4 Issue a certificate
After approval, the signing service signs the certificate with the CA signing key. The issued certificate is stored with the request.

### 3.5 Download a certificate
An operator or an internal service downloads an issued certificate and its chain.
Endpoint: `GET /certificates/{id}`

### 3.6 Revoke a certificate
A security admin revokes a certificate and records the reason.
Endpoint: `POST /certificates/{id}/revoke`

### 3.7 Publish the revocation list
Every hour, the CRL publisher, a scheduled function, builds the certificate revocation list and writes it to the revocation list bucket. Relying services download the list through the CDN.

### 3.8 Send expiry reminders
Every day, the certificate service finds certificates that expire within 30 days and emails the owning team through the notification service.

### 3.9 Rotate the CA signing key
A security admin starts a rotation. A new key version is created in the key management service and used for new certificates.
Endpoint: `POST /admin/ca-key/rotate`

### 3.10 View audit history
A security admin views who requested, approved, issued and revoked each certificate. The history is kept in an audit table in the certificate database.
Endpoint: `GET /admin/audit`

### 3.11 Deploy a new version
The deploy pipeline builds a new container image and rolls it out to the cluster.
