# Paper Prototype: Rationale for Item-01 (Round 1)

Task B4. Decisions D-36 and D-37. This is a mock-up, not a screen: it shows, as plain text, what the Input Normalization page and the Item Definition page would show for synthetic item-01 if the agents produced the approved expected output (`tests/fixtures/synthetic/item-01/expected/`).

**How to read it:** each page has the stage output on top and the Rationale below. Buttons are drawn as `[ Confirm ]` and `[ Dispute ]`. Nothing on these pages stops the pipeline; reviewing is optional and can happen at any time.

---

# Page 1: Input Normalization

**Status:** complete. Item Definition started automatically after this stage.

## What I read

**Summary.** The key and certificate management portal lets operators and internal services request and download X.509 certificates, and lets security admins approve and revoke them. It runs in its own cloud account, run by the platform team. Requests come in through an API gateway that checks a sign-in token from the company's central sign-in service. Certificates are signed with a key held in the cloud key management service. Two documents disagree on how the portal is reached from the internet and on which environment they describe; see the Rationale below.

**Documents**

| Document | Read how | Used for | Ignored, and why |
|---|---|---|---|
| Architecture diagram (draw.io source) | Read directly from the file | Components, network areas and arrows | The dashed box with no label (not a network area); arrow protocols (arrows have no labels) |
| Architecture diagram (image export) | Read as an image | Cross-check only | Everything: it is a copy of the diagram above |
| Client answers to intake questions | Read directly | Entry points, sign-in, keys, secrets, notifications, deployment, logging, stored data | Answer 12, monthly running cost: not relevant to security |
| Functional description, version 0.3 | Read directly | Actors, functions, endpoints, the revocation list publisher | Nothing |

**Facts:** 70 in total. 31 stated by two or more documents with no disagreement, 34 stated by one document, 5 that need your attention.

## Rationale

### Needs your attention (5)

---
**1. Conflict: is the internet-facing load balancer reachable from the internet?**

**What I concluded:** Two documents disagree. The client answers say the API gateway is the only public entry. The diagram shows a second, internet-facing load balancer with an arrow from the internet.
**Why:**
- Client answers, answer 3: "The API gateway is the only public entry point." and "Everything else is only reachable from inside the network."
- Diagram, page 1: a shape labelled "public ALB", with an arrow from "Internet" to it.

**What I assumed:** The load balancer is reachable from the internet. It is treated as a second entry point until someone says otherwise.
**What would change it:** Confirmation that the load balancer accepts traffic only from inside the network.

Affects: FCT-011, FCT-013, EL-011 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**2. Conflict: is the CDN reachable from the internet?**

**What I concluded:** The client answers say only the API gateway is public, but the CDN receives traffic from the internet.
**Why:**
- Client answers, answer 3: "Everything else is only reachable from inside the network."
- Diagram, page 1: an arrow from "Internet" to "CDN".
- Functional description, section 3.7: "Relying services download the list through the CDN."

**What I assumed:** The CDN is reachable from the internet. It serves the portal pages and the revocation list.
**What would change it:** A statement that the CDN is restricted to the company network.

Affects: FCT-011, FCT-015, EL-005 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**3. Conflict: which environment do the documents describe?**

**What I concluded:** The client answers describe the dev environment. The diagram is titled as production.
**Why:**
- Client answers, answer 2: "These answers describe `kcp-dev`. We are onboarding the dev environment first."
- Diagram, page 1, title: "Key & Certificate Portal - Production Architecture".

**What I assumed:** Production is assessed. The answers are taken to hold for production too, because the client says production will follow the same design.
**What would change it:** The client confirming that production differs from dev, or that only dev is in scope.

Affects: FCT-018, FCT-019 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**4. Unclear: a cache appears only in the diagram.**

**What I concluded:** There is a cache next to the certificate service, but no document says what it holds or who runs it.
**Why:** Diagram, page 1: a shape labelled "Cache" with an arrow from "Cert Service". No text document mentions a cache.
**What I assumed:** The cache exists and is part of the portal.
**What would change it:** The client saying the cache was removed, or describing what it holds.

Affects: FCT-030, EL-017 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**5. Gap: the arrows in the diagram have no labels.**

**What I concluded:** I could see which components connect, but not how. No arrow names a protocol, and no text fills in most of them.
**Why:** Diagram, page 1: all 19 arrows are unlabelled.
**What I assumed:** Where no document names the protocol, it is recorded as not known.
**What would change it:** A labelled diagram, or a list of interfaces with their protocols.

Affects: links IF-03, IF-04, IF-05, IF-08, IF-09, IF-10, IF-11, IF-27 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

### For information (4)

---
**6. The image of the diagram was used only as a cross-check.**

**What I concluded:** The PNG is an export of the draw.io diagram, so nothing new was taken from it.
**Why:** Both files show the same title, shapes and arrows. The draw.io file was read directly, which is more reliable than reading an image.
**What I assumed:** The two files are the same version.
**What would change it:** A difference between the two files.

Affects: DOC-02 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**7. The dashed box with no label is not treated as a network area.**

**What I concluded:** The dashed box around the CDN, portal UI bucket, API gateway and token authorizer only groups them visually.
**Why:** Diagram, page 1: the box has no label, and no document mentions such an area.
**What I assumed:** The four components sit with the other managed services in the account, not in a separate network area.
**What would change it:** The client saying the box is a real network area, with its name.

Affects: DOC-01 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**8. Managed services drawn as one group: no connection was read for each service.**

**What I concluded:** The key management service, secrets store, container registry, audit trail and logging are drawn in one side panel, with a single arrow from the cluster to the whole panel.
**Why:** Diagram, page 1: the "Managed services" panel and one arrow from "ECS cluster" to it.
**What I assumed:** Connections to each managed service come only from the text, for example the client answers on keys, secrets and logging.
**What would change it:** A diagram that draws each connection separately.

Affects: FCT-036 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**9. Settled automatically: "Key Service" and "signing service" are the same service.**

**What I concluded:** The diagram calls it "Key Service" and the functional description calls it "signing service". I kept the diagram name.
**Why:**
- Diagram, page 1: "Key Service".
- Functional description, section 1: "Certificates are signed by the signing service, which uses the CA signing key."
- Client answers, answer 6: only the key service role may use the key for signing.

**What I assumed:** One service, two names.
**What would change it:** The client saying these are two separate services.

Affects: FCT-028, FCT-029 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---

# Page 2: Item Definition

**Status:** complete. Built from the facts above, with the defaults stated in the Input Normalization Rationale.

## What I built

**Boundary statement (from the client):** The key and certificate management portal lets operators, security admins and internal services request, approve, issue, download and revoke X.509 certificates, and covers everything the platform team deploys in the portal's cloud account.

**Where things sit**
- Portal cloud account
  - Virtual network
    - Public subnet: internet-facing load balancer, NAT gateway, internet gateway
    - Private subnet: internal load balancer, cache, certificate database, network configuration
      - ECS cluster: certificate service, key service
  - Managed services in the account: CDN, portal UI bucket, revocation list bucket, revocation list publisher, API gateway, token authorizer, CA signing key, secrets store, container registry, audit trail, logs and metrics
- Outside the account: operators and security admins (internet); internal services and the corporate sign-in service (company IT); notification service and CI/CD pipeline (outside providers)

**Components (26)**

| Component | Where | Scope | Why |
|---|---|---|---|
| Operators | Internet | Interface | People who use the portal, not broken down |
| Security admins | Internet | Interface | People who use the portal; their access path is assessed |
| Internal services | Company IT | Interface | Other company systems; their link and client certificate are assessed |
| Corporate SSO | Company IT | Interface | Run by central IT and shared; the token check on the gateway is assessed |
| CDN | Managed services | In scope | Serves the portal pages and the revocation list |
| Portal UI bucket | Managed services | In scope | Holds the portal web pages |
| Revocation list bucket | Managed services | In scope | Holds the revocation list |
| Revocation list publisher | Managed services | In scope | Builds the revocation list |
| API gateway | Managed services | In scope | The documented public entry point |
| Token authorizer | Managed services | In scope | Checks the sign-in token on every request |
| Internet-facing load balancer | Public subnet | In scope | Shown reachable from the internet |
| NAT gateway | Public subnet | In scope | Part of the portal's network |
| Internet gateway | Public subnet | In scope | The network's route to the internet |
| Internal load balancer | Private subnet | In scope | Passes requests from the gateway and the internet-facing load balancer to the services |
| Network configuration | Private subnet | In scope | Configuration of the portal's own network |
| Certificate service | ECS cluster | In scope | Handles all certificate requests |
| Key service | ECS cluster | In scope | Signs certificates |
| Cache | Private subnet | In scope | Next to the certificate service |
| Certificate database | Private subnet | In scope | Holds requests, certificates and the audit history |
| CA signing key | Managed services | In scope | The portal's signing key; its key policy is assessed |
| Secrets store | Managed services | In scope | Holds the database password and notification API key |
| Container registry | Managed services | Interface | Part of the build chain; the image pull into the portal is assessed |
| Audit trail | Managed services | In scope | Records API calls in the account |
| Logs and metrics | Managed services | In scope | Holds application logs and metrics |
| Notification service | Outside provider | Interface | Outside service; the link, data and API key are assessed |
| CI/CD pipeline | Outside provider | Interface | Part of the build chain; the deploy into the portal is assessed |

**Connections:** 27. Examples:
- Operators to API gateway: HTTPS, sign-in token, encrypted.
- Certificate service to certificate database: SQL, database password from the secrets store.
- Internet-facing load balancer to internal load balancer: protocol, authentication and encryption not known.

**Functions (11):**
- Sign in.
- Request, approve, issue, download and revoke a certificate.
- Publish the revocation list.
- Send expiry reminders.
- Rotate the CA signing key.
- View audit history.
- Deploy a new version.

Six of these are admin or system actions with extra rights.

**Recorded from the documents:**
- **Controls stated:** token check on every request; client certificates for internal services; key policy on the signing key; secrets kept in the secrets store.
- **Absence stated:** no web application firewall.

## Rationale

### Needs your attention (11)

---
**1. The internet-facing load balancer is treated as a second way in.**

**What I concluded:** Requests can reach the certificate service through the internet-facing load balancer without passing the API gateway.
**Why:** It follows from the load balancer conflict on the Input Normalization page (item 1). The diagram also shows arrows from "public ALB" to "internal ALB" to "Cert Service".
**What I assumed:** Nothing on that path checks the sign-in token.
**What would change it:** The certificate service, or the load balancer, checking the sign-in token itself.

Question: Does the certificate service check the sign-in token on requests that arrive through the internet-facing load balancer?

Affects: EL-011, IF-09, ASM-01, Q-015 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**2. Nothing checks that requests reaching the certificate service come from the API gateway.**

**What I concluded:** No document describes how the certificate service knows a request was checked by the gateway.
**Why:** The client answers, answer 3, say the gateway uses "a private link to an internal load balancer". No document describes a check on that path.
**What I assumed:** There is no check.
**What would change it:** A description of the check, for example a signed token or mutual TLS between the two.

Question: How does the certificate service check that a request really comes from the API gateway?

Affects: EL-015, IF-27, ASM-06, Q-014 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**3. Production is assessed, and dev is assumed to share nothing with it.**

**What I concluded:** The written answers describe dev. They are used for production, as the client says production follows the same design.
**Why:** Input Normalization, item 3.
**What I assumed:** Dev and production share no accounts, keys, databases or credentials.
**What would change it:** Anything shared. For example, if dev used the same CA signing key, a weakness in dev could produce trusted production certificates.

Question: Do the dev and production environments share cloud accounts, keys, databases or credentials?

Affects: portal cloud account, ASM-03, Q-016 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**4. The internet-facing load balancer is assumed only to pass requests on.**

**What I concluded:** No document says whether the load balancer checks sign-in, filters traffic or ends encrypted connections.
**Why:** The diagram shows it only as "public ALB". No text describes it.
**What I assumed:** It only passes requests on.
**What would change it:** The client describing rules on the load balancer.

Question: Does the load balancer do anything with requests, such as checking sign-in, filtering or ending encrypted connections, or does it only pass them on?

Affects: EL-011, Q-002 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**5. I do not know who can read or delete the audit records.**

**What I concluded:** The audit trail records API calls in the account, but no document says who can read or delete the records.
**Why:** Client answers, answer 10: "API calls in the cloud account are recorded by the audit trail." Nothing more is said.
**What I assumed:** Only the platform team.
**What would change it:** The client naming who has access, or a setting that prevents deletion.

Question: Who can read or delete the audit trail records?

Affects: EL-022, Q-009 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**6. I do not know where the pipeline keeps its deploy credentials.**

**What I concluded:** The pipeline deploys with a deploy role, but where its credentials are kept is not documented.
**Why:** Client answers, answer 9: "deploys them to the cluster using a deploy role".
**What I assumed:** They are kept in the hosted CI service's secret settings.
**What would change it:** The client describing how the pipeline gets the role.

Question: Where does the pipeline keep the credentials for the deploy role?

Affects: EL-025, Q-011 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**7. The build pipeline and container registry are treated as outside the portal.**

**What I concluded:** Both are part of the build and release chain, so only the point where built code enters the portal is assessed: the image pull into the certificate and key services, and the deploy.
**Why:** Client answers, answer 9: the pipeline "builds container images, pushes them to the container registry and deploys them to the cluster".
**What I assumed:** Nothing checks images before they run. No document mentions image signing or scanning.
**What would change it:** The client describing an image check, such as signed images.

Affects: EL-021, EL-025, IF-25, IF-26 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**8. The revocation list bucket is assumed reachable only through the CDN.**

**What I concluded:** The revocation list is published through the CDN. No document says whether the bucket itself is reachable.
**Why:** Functional description, section 3.7: the publisher "writes it to the revocation list bucket. Relying services download the list through the CDN."
**What I assumed:** Only through the CDN.
**What would change it:** The bucket being reachable directly. Anyone who can change the list can make revoked certificates look valid.

Question: Can the revocation list bucket be reached directly from the internet, or only through the CDN?

Affects: EL-007, Q-007 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**9. The cache is assumed to hold certificate data.**

**What I concluded:** The cache is next to the certificate service, but what it holds is not documented.
**Why:** Input Normalization, item 4.
**What I assumed:** It holds certificate data, the more cautious choice.
**What would change it:** The client saying what is cached.

Question: What data does the cache hold? Does it include certificates, keys or sign-in tokens?

Affects: EL-017, ASM-05, Q-003 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**10. I do not know who controls access to the certificate database.**

**What I concluded:** The database holds every request, certificate and the audit history. No document says who decides who can read it.
**Why:** Client answers, answer 11: "stored in a managed PostgreSQL database". Functional description, section 3.10: the audit history is "kept in an audit table in the certificate database".
**What I assumed:** Only the platform team.
**What would change it:** Wider access, for example a support team with read access.

Question: Who decides who can read the certificate database and who changes its settings?

Affects: EL-018, Q-005 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**11. I do not know who controls access to the secrets store.**

**What I concluded:** The secrets store holds the database password and the notification API key. No document says who can read it.
**Why:** Client answers, answer 7: "The database password and the notification service API key are kept in the secrets store."
**What I assumed:** Only the portal services and the platform team.
**What would change it:** Wider access.

Question: Who decides who can read the secrets store and who changes its settings?

Affects: EL-020, Q-008 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

### For information (8)

---
**12. The CDN is treated as reachable from the internet.** Follows from Input Normalization, item 2. The portal pages and revocation list are public by design.

Affects: EL-005, ASM-02 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**13. The portal UI bucket is assumed reachable only through the CDN.**

**Why:** Functional description, section 1: pages are "served from a storage bucket through the CDN".
**What would change it:** The bucket being directly reachable, which would let anyone read or, with a wrong setting, change the portal pages.

Question: Can the portal UI bucket be reached directly from the internet, or only through the CDN?

Affects: EL-006, Q-006 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**14. The API gateway is assumed to be run by the cloud provider.**

**Why:** No document says whether it is a provider service or installed by the team.
**What would change it:** If the team runs it, its software is assessed too, not only its settings.

Question: Is the API gateway a service your cloud provider runs, or something your team installed and runs itself?

Affects: EL-009, Q-001 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**15. The cache is assumed to be run by the cloud provider.**

**Why:** No document says.
**What would change it:** If the team runs it, its software and settings are assessed.

Question: Is the cache a service your cloud provider runs, or something your team installed and runs itself?

Affects: EL-017, Q-004 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**16. Security admins are assumed to use company-managed computers.**

**Why:** No document says. Admins can approve and revoke certificates and rotate the CA signing key.
**What would change it:** Personal devices, which would widen the admin access path.

Question: Do security admins use company-managed computers to reach the portal?

Affects: EL-002, Q-012 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**17. Operators are assumed to use company-managed computers.**

**Why:** No document says.
**What would change it:** Personal devices, which would widen who could misuse a signed-in session.

Question: From which devices do operators use the portal?

Affects: EL-001, Q-013 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**18. I do not know who can read or delete the application logs.**

**Why:** Client answers, answer 10: "Application logs and metrics go to the cloud logging service." Nothing more is said.
**What I assumed:** Only the platform team.
**What would change it:** Wider access. Logs can show certificate requests and errors, and deleting them hides activity.

Question: Who can read or delete the application logs?

Affects: EL-023, Q-010 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---
**19. The inside of managed services is the cloud provider's responsibility.**

**What I concluded:** For the key management service, secrets store, database, storage, CDN, logging and audit trail, the provider protects the service itself. The portal team's settings, such as the key policy and access rules, are assessed.
**Why:** These are provider services listed in the diagram's managed services panel and the client answers.
**What would change it:** The team running any of them itself.

Affects: ASM-04 · Status: unreviewed · `[ Confirm ]` `[ Dispute ]`

---

**Settled by the documents, so not asked:**
- Is the corporate SSO shared? Answer 5 says yes.
- Is the account shared? Answer 1 says it is dedicated.
- Is the API gateway public? Answer 3 says yes.
