# Web Item Definition: Discovery Questions, Answers and Design Decisions

Purpose: everything I need to know to build the **Web Item Definition** agent properly (see `CONTEXT.md` for terms).

Agreed flow (updated after review rounds 1 and 2):

```
Client documents
  → Stage 01 Input Normalization   (reads every document once, turns it into facts with sources)
  → CP0 Reading review             (analyst confirms what was read and how)
  → Stage 02 Item Definition       (elements, links, zones, scope, questions; from confirmed facts only)
  → CP1 Item Definition review     (analyst confirms scope, boundary, assumptions)
  → Stage 03 Asset identification  (from the finalized Item Definition only)
  → Damage scenarios → …
```

- **Input Normalization** reads every client document once and turns it into facts, each with a source reference, plus a document register. It is followed by its own checkpoint (CP0). It is no longer merged with Item Definition.
- **Item Definition** works only from CP0-confirmed facts and analyst answers. It never re-reads client documents.
- **Asset identification** is a separate, later step built only from the finalized Item Definition.
- Sections A to J hold the original questions and their answers. Sections K to O were added during review: analyst dialogue (K), question generation (L), reading diagrams and documents (M), architecture decisions (N), and the roadmap of what is built now versus later (O).

**Current focus:** the logic and backend for Stage 01, CP0, Stage 02 and CP1. Items marked "later" in section O are recorded here so the repo stays informed, but are built in later steps, one at a time.

How to answer: write directly under each question, then commit and push. Where a question asks for examples or files, attach them under `.meta/item-definition-samples/` and reference the filename.

Each question states the **answer level** I need:
- **Short** — one line / a choice
- **List** — an exhaustive list, one item per line
- **Rules** — explicit if/then rules I can encode in the prompt
- **Example** — real or realistic sample content
- **File** — an actual artifact (diagram, sheet, document)

---

## A. Purpose and success

**A1. Who creates and reviews a Web Item Definition, and what do they do with it next?** — *Short*
(e.g. "security engineer at a Tier-1 drafts it, OEM cybersecurity manager approves it, it then feeds asset identification")

**Answer:**

The analyst drafts it together with the agent (see section K: it is a guided discussion, not a hand-over). A TARA reviewer checks it for method and scope. The client's system owners answer the open questions and confirm boundary and architecture facts. Once confirmed it feeds Asset identification, and later its interface IDs, zones, actors and assumptions are reused by damage, impact, feasibility and claims.

Formal approval (reviewer, confirmation reviewer, approver) happens on the whole TARA, not on the Item Definition alone.

**A2. Can you provide 1–3 finished Web Item Definitions from real (or realistic) past TARA work?** — *File*
These become the gold standard for the output shape and for measuring accuracy. Most important question on this list.

**Answer:**

Four past assessments are used as references in this document, named neutrally. The mapping to real engagements is kept offline only and must never be committed.

| Ref | Input profile | Why it is useful |
|---|---|---|
| TARA-1 | Read-only cloud configuration export | Richest input; expert-made output; strongest ground truth for output shape (Assumptions & Scope sheet, Item Definition sheet with diagram, Data Flow Inventory, asset table with semantic prefixes EXT-, NET-, INF-, WL-, DS-, IAM-, API-) |
| TARA-2 | One-page diagram + client Q&A document + functional documentation | Tests "diagram contradicts written answers" |
| TARA-3 | No diagram: infrastructure sizing table + API specification + user manual | Tests "derive architecture from text only" |
| TARA-4 | Single SRS, no output | Negative test (see I1) |

**Legal constraint.** These are client work products covered by confidentiality obligations. Using them in this repo, even renamed, is a risk: an architecture is identifiable from its shape, not only from its names, so renaming alone is not anonymisation. I am not a lawyer; confirm with your employer before any of this material is used outside the engagement. Workaround, in order of safety:

1. **Nothing client-derived in the repo.** Commit only the output schema, the evaluation harness and the method. Real reference TARAs are used, if at all, only for private local evaluation on company-approved infrastructure, with permission, and kept in a git-ignored folder.
2. **Synthetic gold standards for the repo.** Write 3 to 4 fictional items from public material (for example AWS reference architectures and open-source sample applications), and hand-write their expected Item Definitions. Design each one to reproduce a difficulty pattern from TARA-1 to TARA-4 (no diagram, contradicting sources, config export only), not their content. Patterns and method are your own knowledge; architectures, names, data and findings belong to the client.
3. **Never** copy text, diagrams, component lists, counts or findings from a client TARA into a synthetic sample, even with names changed.

**A3. What does "50% precision" mean concretely?** — *Rules*
Measured against what, and at which level? Options: % of expected elements found; % of found elements that are real (no hallucinations); % of scope decisions matching the expert; % of links correct. Pick the one(s) that matter and the target for each.

**Answer:**

Use four separate numbers, measured per run against the expert Item Definition for the same inputs. An element "matches" if it refers to the same real component, regardless of naming (the evaluator maps agent IDs to expert IDs once, by hand, per sample).

| Metric | Definition | Target (v1) | Why |
|---|---|---|---|
| Element recall | matched elements / expert elements | >= 80% | A missed element is lost for good, since nothing downstream re-reads the documents |
| Element precision (no hallucination) | matched elements / agent elements, where an unmatched element counts as a hallucination only if it has no supporting source reference | >= 95% | Every element spawns several assets and 3 to 8 threats each; an invented element produces a fabricated chain |
| Scope agreement | elements where agent scope status equals expert status / matched elements | >= 85% | Scope errors silently remove or add whole threat branches |
| Link correctness | links with correct source, destination and protocol / expert links | >= 70% | Links carry the interface IDs used as "medium of attack" later |

"50% precision" is acceptable only as a first milestone for recall and link correctness. It is not acceptable for hallucination precision; that number should be near 100% from day one, because it is enforceable by rule (no element without a source reference). Extra elements the expert simply did not model (but which are real and sourced) are "disputed", not hallucinations, and are reviewed manually.

**A4. Which mistakes are worst? Rank them.** — *List*
Missed element · hallucinated element · wrong scope decision · wrong link/protocol · wrong element type · too many "ambiguous" flags · too few "ambiguous" flags.

**Answer:**

Ranked by how much damage the mistake does, weighted by how likely the analyst is to catch it at CP1 (silent mistakes rank higher than visible ones):

1. Missed element: invisible at review, nothing later re-reads the documents, so it is never recovered.
2. Wrong scope decision: an in-scope element marked out of scope is effectively a missed element; the reverse wastes effort and pollutes the register. Both are easy to overlook because the element is present.
3. Too few "ambiguous" flags: false confidence hides errors of types 1 and 2 (example from TARA-2: the diagram shows an internet-facing ALB, the client Q&A says API Gateway is the only public ingress; auto-resolving this either way would have been wrong).
4. Hallucinated element: visible at review and deletable, but if not caught it generates fabricated threats. We have repeatedly caught fabricated precedents in past sessions, so assume reviewers will miss some.
5. Wrong link / protocol: drives the interface ID, authentication mechanism and exposure used in feasibility and attack paths.
6. Wrong element type: usually caught and cheap to fix, but it changes the asset derivation rules in G1.
7. Too many "ambiguous" flags: only costs analyst time, as long as each flag carries a proposed default.

---

## B. Client documents and Input Normalization

**B1. Which client document types actually arrive in practice, and how often?** — *List*
For each: format (PNG, PDF, draw.io, Visio, Lucidchart export, Terraform/CloudFormation, AWS Config export, Excel feature list, Word/PDF spec, plain text) · how common · typical size.

**Answer:**

From past engagements (patterns only):

| Document type | Format | How common | Typical size |
|---|---|---|---|
| Architecture diagram | PDF export of draw.io / Lucid with AWS icon set, or PNG / JPEG | Common, but not guaranteed (TARA-3 had none) | 1 page, 20 to 40 icons |
| Client Q&A / clarification document (our question list answered by the client) | PDF or Word | Common once we ask; often the most reliable text source | 3 to 10 pages |
| Functional / product documentation | PDF (often screenshot-heavy) | Common | 20 to 100 pages, several MB |
| API specification | Excel (one sheet per API) or OpenAPI / Postman | Common for portals and integrations | 20 to 60 sheets |
| Infrastructure sizing / solution document | Word, often a pricing-calculator table (service, instance type, storage, count) | Common for smaller vendors | 1 to 3 pages |
| User manual | Word / PDF | Occasional | 5 to 30 pages |
| Cloud configuration export (AWS Config, Terraform, CLI dumps) | JSON / text / HCL | Rare, best quality when present | large |
| SRS | PDF | Occasional | 50+ pages |
| Existing item definition / asset list | Excel | Rare | 1 sheet |

Analyst free text (boundary statement and system summary) is present on every run.

**B2. What does a typical web architecture diagram look like?** — *Example + File*
Notation (AWS icon set, C4, custom boxes), roughly how many boxes, are labels readable, are VPCs/subnets/trust zones drawn, one diagram or several per item. Please attach 2–3 real diagrams of varying quality (including a messy one).

**Answer:**

Typical diagram (pattern from TARA-2): AWS icon set, custom boxes, one page, about 25 icons, readable labels. It shows the account box, one VPC, a public subnet (IGW, NAT), private subnets (container cluster with backend and frontend services, database in a separate private subnet box), a group of load balancers, an API gateway with an authorizer function outside the VPC, DNS and a corporate IdP outside the account, and a sidebar of managed services (secrets, logging, KMS, private CA, certificates, registry, storage, IAM).

Patterns the agent must handle:
- Managed services drawn as a sidebar with one generic arrow to the whole VPC, so no real per-service links.
- Arrows without labels, protocols or ports.
- Boxes that look like network zones but are only visual grouping.
- Diagram of one environment while the text describes another (prod vs dev).
- Components in the text that are not drawn, and the reverse.
- No diagram at all (TARA-3).

How diagrams are actually read (source files parsed directly, images through an image-capable model) is described in section M.

Sample diagrams for the repo must be synthetic (see A2).

**B3. What is the minimum input for a run to be valid?** — *Rules*
e.g. "at least one diagram OR a feature list + free text"; is a boundary statement mandatory?

**Answer:**

Rules:
- R1: A boundary statement (or at least the item name plus one sentence on what it is) is mandatory. Without it, scope decisions have no anchor.
- R2: At least one document that describes components (diagram, infra/sizing document, config export, or an architecture section inside functional docs) is mandatory. TARA-3 had no diagram, so a diagram cannot be required.
- R3: At least one document that describes behaviour (functional doc, API spec, user manual, SRS, Q&A) is mandatory. Without it the function inventory and data-carried fields are empty and Asset identification cannot derive business-function or data assets.
- R4: If R2 or R3 fails, stop and return the list of what is missing. If both pass but the diagram is missing, run and flag every link as "inferred from text".

**B4. When sources disagree, which one wins?** — *Rules*
Give a precedence order (e.g. existing item definition > network topology > architecture diagram > feature list > free text), and say which disagreements must always go to the analyst instead of being auto-resolved.

**Answer:**

Precedence (highest wins):
1. Analyst statement at CP1 (explicit decision by the analyst)
2. Configuration export (AWS Config, Terraform, CLI output): it is what is deployed
3. Written client answers to our questions (Q&A / clarification document), newest first
4. Existing item definition supplied by the client
5. Architecture diagram
6. Infrastructure / sizing document
7. Functional documentation, SRS, API specification
8. User manual
9. Analyst free text in the run prompt

Always send to the analyst instead of auto-resolving:
- Any disagreement about internet exposure or ingress path (TARA-2: diagram shows an internet-facing ALB, written answers say API Gateway is the only public ingress).
- Any disagreement about which environment is described (prod vs dev vs staging), or documents from different environments mixed in one run.
- Any disagreement about whether a component exists at all.
- Any disagreement about who owns or operates a component (client, supplier, third party).
- Any disagreement about authentication mechanism on an entry point.
- Any disagreement where the higher-precedence source is older than the lower one.

Auto-resolve (with the loser recorded in the conflict log): naming differences, instance sizes, counts, versions.

**B5. For feature/function lists and topology exports: what are the exact columns/fields?** — *File*
Attach one real sample of each.

**Answer:**

No client has sent a feature list in a fixed column format; function information arrived as prose. Observed structures (patterns only):
- API specification workbook: one sheet per API with API name, API ID, system / sub-system, author, date, description, then request and response parameter tables. Each sheet becomes one function entry.
- Infrastructure sizing document: table with Description | Service | Configuration summary (instance counts, OS, storage).
- Cloud configuration export: raw service configuration per resource.

Recommended internal normalized format for functions, whatever the source: `FN_ID, Function name, Description (plain words), Actor(s), Elements involved, Endpoints / API paths, Data read, Data written, Privileged (Y/N), Source ref`. Samples must be synthetic (see A2).

**B6. When a client sends an asset list (CSV/Excel), how should Input Normalization use it?** — *Rules*
It is now just another client document, not a shortcut to rated assets. Should each row become a candidate **element**, a hint passed on to Asset identification, or both? Attach a sample.

**Answer:**

Both, with different weights:
- Each row becomes a candidate element only if it names a component that exists in the system (a service, store, gateway). Rows that are data, credentials or functions are not elements.
- Every row is passed to Asset identification as a hint, carrying its original text, the client's CIA flags if present, and the source ref. Asset identification must still apply its own rules; the client's CIA columns are an input, not a decision (our CIAAAN rule: an entitlement failure is Authorization, not Confidentiality, which client lists usually get wrong).
- Any row that maps to nothing in the other documents becomes an open question, not an element.

**B7. Should Input Normalization keep a document register?** — *List*
i.e. a record of every client document used (id, title, version, date, owner) so each fact in the Item Definition can be traced to a specific document version. Which fields are needed?

**Answer:**

Yes. Fields:
- DOC_ID (DOC-01 ...)
- Title
- Client document ID / version as printed
- Date on document, and date received
- Author / owner (client, supplier, assessor)
- Environment described (prod / staging / dev / unknown)
- Type (diagram, Q&A, functional, API spec, infra, manual, config export, SRS)
- File hash (SHA-256), so a re-run can detect a changed file with the same name
- Read status (parsed / partial / failed, with reason)
- Precedence rank (from B4)

This register becomes the Document History / references section of the final TARA and is what traceability (F4) points into.

**B8. Besides elements and links, what else should Input Normalization extract from client documents?** — *List*
Candidates: functions/use cases · stated assumptions · constraints · security requirements already stated by the client · open questions for the client (gaps the documents don't answer).

**Answer:**

Extract all of these:
- Functions / use cases, with the actor, endpoints and data involved (needed because Asset identification derives business-function assets (API- prefix in the reference TARAs) and cannot re-read documents).
- Actors and their authentication method.
- Stated assumptions (region, account, single tenant, environment).
- Stated responsibility split (who builds, who operates, who monitors).
- Stated security controls, and stated absences ("No WAF", "WAF: Not Applicable", "no CloudHSM"). Absences are as important as controls; they drive feasibility and attack path step 4.
- Data handled per store and per flow, with specific items (see C6).
- Legal / regulatory context stated by the client (data controller / processor, data residency).
- Constraints (managed service limits, vendor-operated components the client cannot change).
- Security requirements already stated by the client.
- Open questions for the client (gaps and contradictions).
- Environment facts (region, AZs, prod vs staging, tenant).

**B9. When the documents leave a gap, should the tool generate a list of questions to send back to the client?** — *Short*

**Answer:**

Yes. This is a core feature, not an extra. On TARA-2 the client's answers to our question list became the most reliable source. Each question should name the element, the gap, why it matters, and the default the agent will assume if unanswered. Questions go to the analyst first (section K), and only the ones the analyst cannot answer go to the client.

---

## C. Elements — what goes into the model

**C1. Complete list of element kinds for a web item.** — *List*
Confirm/correct/extend: cloud account · region · VPC · subnet · security group · Kubernetes cluster (EKS/AKS/GKE) · node group · namespace · microservice/workload · serverless function · API gateway · load balancer · WAF · CDN · database · object storage · cache · message queue/stream · identity provider · secrets/key store · certificate authority · monitoring/logging (CloudWatch etc.) · CI/CD pipeline · container registry · third-party SaaS · web frontend · mobile app · admin portal · external vehicle system · human actor.

**Answer:**

Confirmed, with changes.

Treat as containers, not elements (see C3): cloud account, region, VPC, subnet, namespace, availability zone.

Fold into another element instead of standalone: security group, NACL, route table (all become attributes of one "network boundary configuration" element per VPC).

Keep as elements: Kubernetes cluster (split into control plane API server, worker nodes / node groups, pod runtime), ECS cluster / service, microservice / workload, serverless function (including Lambda authorizers), API gateway, load balancer, WAF, CDN, database, object storage bucket, cache, message queue / stream, identity provider, secrets store, key store / KMS key, certificate authority, monitoring / logging, CI/CD pipeline, container registry, third-party SaaS, web frontend, mobile app, admin portal, external vehicle system, human actor.

Add:
- NAT gateway, internet gateway, VPC endpoint / PrivateLink, Transit Gateway / peering / VPN / Direct Connect
- DNS (Route 53, Cloudflare)
- Bastion / SSM Session Manager / admin access path
- In-cluster platform components (secrets operator, cert-manager, service mesh / ingress controller)
- Workflow / orchestration engine (e.g. Step Functions)
- IoT device gateway and device provisioning service
- Signing service (code / metadata / certificate signing)
- Data warehouse / lakehouse, stream processing / ETL (Flink, EMR, Glue)
- Backup / snapshot store
- Audit trail and configuration recorder (CloudTrail, AWS Config)
- Security detection tooling (GuardDuty, Security Hub) and landing zone / governance (Control Tower, Organizations), only when the documents show them
- IaC orchestration (Terraform runner or hosted IaC service)
- Notification gateways (SMS, email), payment gateway, mapping provider
- File storage (EFS / NFS)
- Field device (e.g. EV charger), partner platform, partner / OEM backend
- Non-human external clients (system-to-system integrations)

**C2. Granularity: what is one element?** — *Rules*
Is each AWS managed service an element? Each microservice? Each API endpoint, or one element per API? Each database table, or one per database? Each pod, or one per deployment? Give the rule plus one example of "too fine" and "too coarse".

**Answer:**

Rule: one element = one independently deployed or configured unit that has its own identity, access policy or distinct data content.

- Managed service: one element per instance the item uses with its own configuration (per bucket, per logical DB, per KMS key with its own purpose), not one per service family.
- Microservice: one per deployment / ECS service / Kubernetes Deployment, not per pod or replica.
- API: one element per API surface (gateway, GraphQL engine, BFF). Individual endpoints are not elements; they are grouped by business function in the function inventory and become business-function assets later.
- Database: one per logical database / schema with distinct data or a distinct owning service. Never per table.
- Buckets: one per bucket with distinct content; merge buckets only if content, access policy and owner are identical.
- Pods, containers, replicas, instances in an autoscaling group: never separate.

Too fine: one element per S3 prefix, per DB table, per REST endpoint, per security group, per pod.
Too coarse: "AWS backend", "Database" when one database cluster hosts several logical databases with different data, "S3" when several buckets hold firmware, PII and logs separately, "KMS" when several keys protect different stores.

**C3. Containers vs elements.** — *Rules*
Are VPC / subnet / cluster / namespace / cloud account **elements** themselves, or **containers/zones** that group elements? Should the model be nested (VPC ⊃ subnet ⊃ cluster ⊃ service) or flat?

**Answer:**

Nested model, containers separate from elements:

`cloud account > region > VPC > subnet (zone) > cluster > namespace > workload`

- Account, region, VPC, subnet, AZ, namespace: containers only. They group elements and define zones and trust boundaries.
- Each VPC additionally gets one element "network boundary configuration" (security groups, NACLs, routes, endpoints), because the exposure configuration itself is attackable (for example security groups open to 0.0.0.0/0).
- A Kubernetes / ECS cluster is both a container and the parent of real elements (control plane, nodes, runtime).
- Managed services outside the VPC (KMS, S3, Secrets Manager, IAM) sit in an "account-level managed services" container, not inside a subnet.
- Every element has exactly one parent container. Flat lists are generated from the tree for export.

**C4. Required attributes per element.** — *List*
Which of these are mandatory, optional, or not needed: provider (AWS/Azure/GCP/on-prem) · region · hosting type (managed/self-hosted) · internet-exposed (yes/no) · authentication method · data handled/classification · owner (OEM / supplier / third party) · technology/version · criticality.

**Answer:**

| Attribute | Status | Note |
|---|---|---|
| ID, name, kind | Mandatory | |
| Parent container / zone | Mandatory | |
| Provider (AWS / Azure / GCP / on-prem / SaaS) | Mandatory | |
| Hosting type (managed / self-hosted) | Mandatory | Decides the managed-internals scoping rule |
| Internet exposed (yes / no / unknown) | Mandatory | With the evidence for it |
| Owner / operator (client / supplier / third party / cloud provider) | Mandatory | Drives Share treatment and claims |
| Scope status + reason | Mandatory | |
| Source refs + confidence | Mandatory | |
| Data handled / stored | Mandatory for stores and processes | See C6 |
| Authentication method | Mandatory for entry points and anything internet exposed, optional otherwise | Named mechanism, not yes/no |
| Stated security configuration (encryption at rest, public access block, deletion protection, logging on/off) | Optional but strongly wanted | These drive threats |
| Technology / version | Optional | |
| Region | Optional | Inherited from container |
| Criticality | Not needed | Criticality comes out of impact rating; recording it here biases later ratings |

**C5. Are human actors part of the Item Definition?** — *Short + List*
(technician, fleet operator, OEM admin, vehicle owner, developer). If yes, list the standard actor set.

**Answer:**

Yes, as external interactor elements (EXT- prefix). They are needed because Asset identification derives Authenticity / Non-repudiation assets for them and impact rating needs the stakeholder split.

Standard actor set:
- End user / customer (EV driver, app user, vehicle owner)
- Business operator / portal user (OEM operator, CPO operator, dealer technician)
- Tenant or platform administrator (role, user and token management)
- Platform operator / SRE / DevOps (privileged infrastructure access, break-glass)
- Developer / CI identity (pushes code and infrastructure)
- System-to-system client (partner API integration, roaming partner, OEM backend)
- Support / helpdesk (if documented)
- Field device (vehicle / TCU, EV charger)
- External data sinks (SaaS analytics, logging vendors), non-human

**C6. What data information should the Item Definition record so Asset identification can derive data assets later?** — *Rules*
Data assets (PII, VIN, credentials, firmware packages, logs) are now identified in the later Asset identification step, not in the Item Definition. But that step never re-reads client documents, so the Item Definition must already capture enough about data: e.g. "data stored" on each data store and "data carried" on each link. Which data details must be recorded, and at what level (category like "PII" vs specific like "vehicle owner name, email, VIN")?

**Answer:**

Record data at the specific level whenever the documents give it, plus one category tag from a fixed list. Category-only is a fallback and must be flagged "unspecified".

On every data store: `data stored` = list of `{item, category, stated protection}`, for example `{vehicle owner name / email / phone, PII, KMS encrypted}`.
On every link: `data carried` = same structure.
On every process: `data held in memory / transient` only if it holds something no store or link covers (for example raw keys before encryption).

Category list:
PII (direct) · vehicle-linked PII (VIN, location, driving behaviour) · credentials and session tokens · cryptographic keys (with purpose: encryption / signing / TLS) · certificates · firmware / software artifacts · signed metadata · configuration (including vehicle data-collection config) · logs and telemetry · audit / record data (mark as record store, relevant for Non-repudiation) · business transactions · payment data · backups.

For keys and credentials also record: purpose, where held (KMS, Secrets Manager, env var, code), and who can use it.

---

## D. Links / interfaces

**D1. Should links represent logical data flows, network connectivity, or both?** — *Short*

**Answer:**

Both, as two link types:
- Data flow (primary): an intended exchange of data between two elements . These get IF-## IDs.
- Exposure: network reachability that exists without an intended flow, such as an internet-facing load balancer on a data-plane service (for example a message broker or analytics store published through an internet-facing load balancer). Also IF-## but typed "exposure".

Plain network connectivity inside a zone is not modelled as links; it is implied by the container tree.

**D2. Link attributes: which are mandatory?** — *List*
protocol · direction · authenticated (y/n/unknown) · encrypted (y/n/unknown) · data carried · sync/async · port · crosses trust boundary (y/n).

**Answer:**

Mandatory:
- IF-## ID, source, destination, direction
- Protocol and port where known (for example "MQTT/TLS 8883", "HTTPS/REST via NLB 443")
- Usage / function at destination
- Authentication mechanism, named (Master Token, Bearer JWT from an external IdP, mutual X.509, SigV4 IAM role), or "unknown". Not yes/no.
- Encryption, named (TLS 1.2, mTLS, SASL_SSL), or "unknown"
- Data carried (C6 format)
- Crosses trust boundary (derived from zones)
- Remark (the security-relevant observation, for example "only public entry point; no WAF in front")
- Source refs + confidence

Optional: sync / async, rate limiting, volume.

These map one-to-one onto the reference Data Flow Inventory columns, so export is straightforward.

**D3. Complete protocol list for web items.** — *List*
Confirm/extend: HTTPS · HTTP · gRPC · WebSocket · MQTT · AMQP · Kafka · SQL/JDBC · Redis · S3 API · SSH · SFTP · OAuth2/OIDC · SAML · TLS/mTLS · VPN/IPsec · Cellular (to vehicle).

**Answer:**

Confirmed, extended, and split into transport vs security mechanism, because OAuth2/OIDC, SAML, TLS and mTLS are not transport protocols and belong in the auth / encryption attributes.

Transport / application protocols:
HTTPS (REST) · HTTP · GraphQL over HTTPS · gRPC · WebSocket · EV charging protocols (OCPP and similar, JSON over WebSocket or REST) · MQTT (over TLS, 8883) · AMQP (AWS MQ / RabbitMQ) · Kafka (SASL_SSL) · Kinesis / SQS / SNS API · SQL wire (PostgreSQL, MySQL, JDBC) · Redis · S3 API and presigned URL download · AWS service API calls signed with SigV4 (KMS, PCA, Secrets Manager, STS) · instance metadata (IMDS) · NFS (EFS) · SMTP · SMS gateway API · payment gateway API and webhooks · JWKS fetch · DNS · SSH · SSM Session Manager · SFTP · VPN / IPsec · Direct Connect · Protobuf payloads (as a payload format, noted in remarks) · Cellular (as bearer to the vehicle, noted, not a protocol).

Authentication / encryption mechanisms (attributes): TLS, mTLS, SASL, OAuth 2.0, OIDC, SAML, API key, Master Token, JWT Bearer, X.509 device certificate, SigV4 / IAM role, IRSA, session cookie.

**D4. Trust boundaries: does the Item Definition mark them?** — *Rules*
If yes: the standard zones (internet · DMZ/public subnet · private subnet · management plane · third-party · vehicle), and who decides them (agent proposes vs analyst draws).

**Answer:**

Yes. The agent proposes zones and trust boundaries from the diagram and text; the analyst confirms at CP1. The agent must never invent a zone the documents do not show (TARA-2 had no governance layer, and forcing one would have been wrong).

Standard zones:
- Internet / external
- Edge / public subnet (internet-facing load balancers, IGW, NAT, API gateway)
- Private application subnet (workloads)
- Data subnet (databases), only when a separate subnet group is documented; otherwise databases stay in the application zone
- Account-level managed services (KMS, S3, Secrets Manager, IAM)
- Cloud and cluster control plane / management plane
- Governance / security account, only if documented
- Corporate IT (shared IdP such as Azure AD / Entra ID)
- Third-party SaaS
- Vehicle / field device

A trust boundary exists wherever a link crosses zones with different owners or different exposure.

---

## E. Boundary and scoping rules

**E1. The upload screen says "the pipeline applies standard scoping rules". Write those rules out explicitly.** — *Rules*
This is the core of the Call 1B prompt. As many as you use in practice.

**Answer:**

**Change from v1: these rules are not applied blindly.** They are the agent's internal defaults. The agent never shows the rule itself to the analyst. For every element a rule touches, it asks the analyst a plain factual question about the system, maps the answer to a scope decision, and then shows the decision with a plain-language reason (transparency of reasoning, not of the method). If the analyst does not know, the question goes to the client list and the default is used, marked "assumed".

Internal defaults (patterns from TARA-1 to TARA-3):

- S1 Account: what is deployed in the cloud account(s) hosting the item is inside the boundary, including network plumbing and the registry.
- S2 Plumbing: load balancers, NAT, IGW stay in scope as elements; Asset identification treats them as configuration only. (TARA-3 and TARA-2 decided this differently; S1/S2 is the proposed default, to be locked.)
- S3 Managed service internals: provider internals out of scope; how the item uses and configures the service in scope. Explained in detail in K4.
- S4 Identity provider: a shared company-wide IdP is an interface, only the item's token check is in scope; an IdP instance dedicated to and configured for this item is in scope as configuration.
- S5 Vehicle: vehicle and ECUs out of scope; the cloud endpoint of each vehicle channel in scope; the vehicle / TCU is one interactor.
- S6 Third-party SaaS: interface; the outbound link, data and credentials the item holds are in scope.
- S7 Supply chain: anything that can push code or infrastructure into the item is in scope, wherever it is hosted.
- S8 Monitoring and audit: in scope.
- S9 Environments: only the assessed environment; others flagged if they share credentials, networks or data with it.
- S10 Actors and user devices: interactors, never broken down.
- S11 to S14 (method rules, no question needed): nothing is scoped out silently; stated absences are facts; undocumented components become questions, never elements; no blending with the vehicle variant.

**Question bank (what the analyst actually sees).** The analyst sees only the "Question" column; everything else is internal.

| Rule | Fact the agent needs | Question to the analyst (plain words) | How the answer decides |
|---|---|---|---|
| S1 | Which accounts host the item; what else shares them | "Which cloud accounts or subscriptions does this system run in? Do other products share any of them?" | Own account → S1 as is. Shared account → only the item's resources inside, flag shared ones |
| S2 | Does the component only pass traffic, or also act on it | "Does the load balancer / gateway only forward traffic, or does it also check logins, filter requests or terminate certificates?" | Forward only → configuration asset only. Acts on requests → full element with function assets |
| S3 | Managed or self-run; who sets its permissions | "Is [KMS / certificate authority / database] a cloud-provider service or something your team installed and runs? Who decides who can use it and changes its settings?" | Provider-run → split into internals (out) and usage / configuration (in). Team-run → fully in scope |
| S4 | Is the login system shared or dedicated; who administers it; where tokens are checked | "Where do users sign in? Is that sign-in used only by this product or also by other company applications? Who adds users, assigns roles or changes MFA: the product team or central IT? At which point does the product check the login token?" | Shared + central IT → interface, token check in scope. Dedicated + product team → in scope as configuration. Mixed answers → ambiguous with both options shown |
| S5 | Does the system talk to vehicles and through what | "Does this system exchange data with vehicles? Through which unit, and is the in-vehicle side assessed elsewhere?" | Yes → one vehicle interactor per counterpart. In-vehicle assessed here → flag, separate vehicle TARA |
| S6 | Which external services get data; how the item authenticates | "Which outside services receive data from the system, what data, and how does the system log in to them?" | Interface element, plus link and credential in scope |
| S7 | How changes reach production | "How does new code or infrastructure reach production? Which tools can deploy, and where are their credentials kept?" | Each such tool becomes an in-scope element |
| S8 | Where logs go and who controls them | "Where are logs and audit records kept, who can read or delete them, and do they contain user data?" | In scope; data category recorded |
| S9 | Which environment; what is shared | "Which environment is this assessment about? Do test or staging environments share accounts, databases, keys or credentials with it?" | Nothing shared → other environments out. Shared → ambiguous |
| S10 | Who uses the system and from where | "Who uses the system, and from which devices? Do administrators use company-managed machines?" | Interactors; admin access path in scope |

After the answers, the analyst sees the result per element, for example: *"Sign-in service: outside the assessment. Reason: you said it is the company-wide login used by other applications and managed by central IT. The point where this system checks the login token is inside the assessment."* The analyst can overrule; the overrule is logged as an analyst decision (precedence 1 in B4).

**E2. How is each of these scoped by default? (in_scope / interface / out_of_scope)** — *Rules*
- AWS/Azure managed services the item uses (shared responsibility)
- Third-party SaaS (Auth0, Twilio, Stripe, SendGrid…)
- Corporate IT (SSO/AD, email, VPN)
- CI/CD, source repos, container registry
- Monitoring/logging stack
- Developer/admin workstations
- End-user devices (browser, mobile app)
- Vehicles / ECUs that talk to the backend (the FOTA/SUMS case)
- Other OEM backends the item integrates with

**Answer:**

| Kind | Default | Rule reference |
|---|---|---|
| AWS / Azure managed services the item uses | in_scope for usage and configuration, out_of_scope for provider internals | S3 |
| Third-party SaaS (Auth0, Twilio, Stripe, SendGrid, payment gateways) | interface; in_scope if it is an item-dedicated tenant the item owner configures (IdP) | S4, S6 |
| Corporate IT (SSO / AD, email, VPN) | interface; token verification point in_scope | S4 |
| CI/CD, source repos, container registry | in_scope | S1, S7 |
| Monitoring / logging stack | in_scope | S8 |
| Developer / admin workstations | out_of_scope; the access path they use (SSO, bastion, SSM, CLI credentials) in_scope | S10 |
| End-user devices (browser, mobile app) | interface (actor); the served web frontend code is in_scope | S10 |
| Vehicles / ECUs | interface for the vehicle / TCU as one element; ECU internals out_of_scope | S5 |
| Other OEM backends | interface; outbound link and credentials in_scope | S6 |

**E3. Vehicle ECUs inside a web architecture (FOTA/SUMS case).** — *Rules*
My proposed default: one flat "external vehicle system" element per ECU, only `interface`/`out_of_scope`, never broken down into internal parts; if the boundary statement explicitly includes an ECU, flag `ambiguous` and suggest the Vehicle variant. Confirm or correct.

**Answer:**

Confirmed with one correction: model one external vehicle element per vehicle-side counterparty the cloud actually talks to, not one per ECU. The cloud sees a device identity (normally the TCU), so "one element per ECU" is too fine for a web TARA. TARA-1 used a single vehicle / TCU interactor. Split only when documents show separate vehicle-side identities with separate credentials (for example a TCU and a separate charging controller with its own certificate).

Status: always interface or out_of_scope. If the boundary statement explicitly includes an ECU, flag ambiguous and tell the analyst the vehicle part needs a separate vehicle-type TARA; do not blend.

**E4. What does a good boundary statement look like?** — *Example*
2 good ones and 2 bad ones for web items. Should the agent propose a boundary statement when the analyst leaves it blank?

**Answer:**

Good (synthetic):
1. "The item is the cloud backend of a vehicle software-update service in the client's AWS account (production, one region). Analysis stops at the AWS boundary; only the cloud end of each vehicle connection is in scope. The remote-command module and the OEM's own backend systems are excluded."
2. "The item is a key and certificate management portal (production) in one AWS account, covering its API gateway, container services, database, storage buckets and its use of the cloud key and certificate services. The company login system is external; the item starts where it checks the login token."

Bad:
1. "Assess the cloud platform." (No item name, no edge, no environment.)
2. "Everything in the architecture diagram, including Azure and the vehicles." (Pulls in corporate IT and vehicle internals, and relies on a drawing that may be wrong.)

A good statement names the item, the account and environment, where analysis stops, and the notable exclusions. If left blank, the agent proposes one in the K2 discussion, marked "proposed"; CP1 cannot close until the analyst accepts or edits it.

**E5. "Ambiguous" tolerance.** — *Short*
Prefer the agent to flag more ambiguity (safer, more analyst work) or decide more (faster, riskier)? Rough acceptable ambiguous % per run?

**Answer:**

Flag more, but make each flag cheap (see K3): a proposed default, one plain question, one-click accept. Up to about 15 to 20% of elements flagged is acceptable. Above that, the documents are too weak and the run should say so and produce the client question list instead.

---

## F. Item Definition content beyond architecture (ISO/SAE 21434 clause 9.3)

**F1. Which of these sections must the Web Item Definition contain?** — *List (mark each required / optional / not needed)*
item boundary · functions / use cases · preliminary architecture · operational environment (deployment regions, tenants, environments like prod/staging) · interfaces to external systems · assumptions · constraints · applicable legal/regulatory requirements (R155/R156, GDPR…) · stakeholders.

**Answer:**

| Section | Status |
|---|---|
| Item boundary (statement + in / out of scope lists with reasons) | Required |
| Functions / use cases | Required |
| Preliminary architecture (diagram + element list + data flow inventory) | Required |
| Operational environment (provider, account, region, AZs, environment, tenancy) | Required |
| Interfaces to external systems | Required (part of the data flow inventory) |
| Assumptions | Required |
| Responsibility split (who builds, operates, monitors) | Required (add this section) |
| Existing security controls and stated absences | Required (add this section) |
| Stakeholders | Required (drives impact rating) |
| Open questions | Required (add this section) |
| Constraints | Optional |
| Legal / regulatory | Optional; for deployments in India this is the DPDP Act 2023 and data residency, not GDPR by default. R155 / R156 are referenced for context only; the UNECE threat catalogue was dropped for web/cloud items |

**F2. For any section marked required: should the agent generate it, or does the analyst write it?** — *Rules*

**Answer:**

- The agent drafts every section from the documents, with source refs on every sentence.
- The analyst owns and must confirm: boundary statement, in / out of scope lists, assumptions, legal / regulatory section, and stakeholder list.
- Any sentence without a source is labelled "assumption" and cannot pass CP1 without analyst confirmation.
- The agent must never write an assumption that fills a gap silently; unfilled gaps go to open questions.

**F3. What is the final deliverable format?** — *File*
JSON only · Excel in an OEM template · Word/PDF report · diagram. Attach any template your customers expect.

**Answer:**

Two outputs:
1. Canonical JSON (internal, drives all later steps).
2. Excel export in the reference workbook format: the **Assumptions&Scope** sheet (General Assumptions, Scope with IN SCOPE / OUT OF SCOPE / BOUNDARY blocks) and the **Item Definition** sheet (Step 1 diagram, Step 2 Data Flow Inventory, Step 3 asset table). Step 3 is filled after Asset identification, since the template expects it in the same sheet.

Also recommended: a draw.io file of the zone diagram (zones as nested containers, flows labelled with IF-## IDs). Template: the sheet layout of TARA-1, rebuilt as an empty template with no client content (see A2).

**F4. Traceability: must every element point back to where it came from in the source (page, diagram region)?** — *Short*

**Answer:**

Yes, mandatory for every element, link, function, assumption and scope decision: DOC_ID + page / sheet / section + a short quoted snippet, and for diagrams an approximate region. Past sessions produced citations to precedents that did not exist, so a fact without a checkable reference must not reach the Item Definition.

---

## G. Asset identification and downstream

**G1. Element → asset rules for Asset identification (clause 15.3).** — *Rules*
An element is something that exists in the system; an asset is something inside it worth protecting, with CIAAAN properties. One element can yield several assets or none. For each element kind in C1, which asset(s) does it typically produce, and which CIAAAN properties apply? Example of the expected level:
- Firmware package store → *firmware packages* (Integrity, Authenticity), *signing metadata* (Integrity)
- OTA update API → *update authorization function* (Authorization, Authenticity, Integrity), *API availability* (Availability)
- VPC → no asset (container only)

**Answer:**

General rules first:
- Many elements are assets directly (WL-, DS-, INF- prefixes); containers never are.
- Business-function assets (API- prefix) come from the function inventory, not from elements.
- Credential and key assets (IAM- prefix) come from the data-stored fields of secrets stores and key stores.
- In-transit assets (COMM- prefix) come from links that carry sensitive data across a trust boundary.
- CIAAAN rule: if the wrong party gets data because an entitlement check is missing, that is Authorization, not Confidentiality. Confidentiality applies to an element only for data it holds that no other asset row covers. A row whose every consequence is owned by other rows should not exist.
- Terminology: TARA-1 uses Auditing in its "CIA-AAA" column where this spec uses Non-repudiation; pick one and map.

| Element kind | Typical asset(s) | Properties |
|---|---|---|
| Account / region / VPC / subnet / namespace | none (container) | |
| Network boundary configuration | exposure configuration | I, A |
| Load balancer / NAT / IGW | routing configuration | I, A |
| API gateway / edge router | the gateway function and its auth configuration | Au, Az, I, A |
| Microservice / workload | the service logic | I, A, Az (where it enforces entitlements), C only per the rule above |
| Business function (from function inventory) | e.g. firmware push, rollout authoring, token minting, MFA reset | Az, I, Au, A, NR for privileged actions |
| Web frontend | served application code | I, Au |
| Database (logical) | records held | C, I, A, NR if it is a record store |
| Object storage bucket | content (firmware: I, Au, A; PII: C, I; logs: I, A, NR) | per content |
| Cache / session store | session and auth state | C, I, Au, A |
| Queue / stream | messages in flight | I, A, C if PII, Au of producers |
| Identity provider tenant / config | identities, roles, MFA settings | I, Au, Az, A |
| Credential / token (from secrets store) | Master token, JWT, service account secret | C, Au, (I for JWT) |
| KMS key / signing key | key material and key policy | C, I, A, Au (signing keys: C, I, Au) |
| Certificate authority / PCA usage | issuance function, issued certificates | Au, I, A |
| Secrets store | stored secrets as a set | C, I, A |
| Monitoring / audit trail | logs and records | I, A, NR, C if PII |
| CI/CD, IaC, registry | pipeline and artifacts | I, Au, Az |
| Kubernetes control plane / nodes / pod runtime | cluster API, node, isolation | Az, I, A, Au / I, A / I, Az |
| IoT device gateway / provisioning | device authentication and topic authorization | Au, Az, I, A |
| Link carrying sensitive data across a boundary | data in transit | C, I, (Au) |
| External interactor (actor, vehicle, SaaS) | the identity the item relies on | Au, NR |
| Third-party SaaS internals | none | |

**G2. Which scope statuses produce assets?** — *Rules*
Only `in_scope` elements? Also `interface` elements (e.g. the link to a vehicle ECU)? Never `out_of_scope`?

**Answer:**

- in_scope: all asset types in G1.
- interface: only the item's side: the link / in-transit asset, the external party's identity as used by the item (Au, NR), and credentials the item holds for that party. Never the external system's internals.
- out_of_scope: no assets, but listed in the Item Definition with reasons so claims can reference them.

**G3. How much analyst review does Asset identification need?** — *Short*
A full second review, or a light confirm-and-adjust of what the agent proposes?

**Answer:**

Light confirm-and-adjust for the asset list itself, full review of the CIAAAN column. Property assignment is where most of our review debates happened (for example whether Confidentiality applies to a pure processing service), so that column should not be light-touch.

**G4. Do any later stages (damage, threats, attack paths) need anything from the Item Definition directly (e.g. trust boundaries, internet exposure, actors)?** — *List*

**Answer:**

Yes:
- Interface IDs (IF-##): used as "Medium of Attack" in the Impact Analysis sheet and in attack path step 1.
- Zones, trust boundaries, internet exposure: attack vector and attack path initial precondition.
- Authentication mechanism per link / entry point: privileges required.
- Stated control absences ("no WAF"): attack complexity and attack path step 4 (control gap).
- Actors and stakeholder list: impact rating split (tool user vs other stakeholders).
- Data categories: privacy impact rating.
- Responsibility split: Share treatment and cybersecurity claims.
- Out-of-scope list and assumptions: cybersecurity claims and the Assumptions&Scope sheet.
- Function inventory: threat wording (threats must name the exact endpoint, grant or missing server-side check).

---

## H. Item Definition review (CP1)

**H1. What must an analyst be able to do at Item Definition review?** — *List*
Confirm/extend: change scope · add element · delete element · rename · edit attributes · add/delete link · resolve conflict · edit boundary statement · re-run with extra files · approve/finalize.

**Answer:**

Confirmed list, plus: change element kind; merge / split elements; move an element to another zone; choose which source wins a conflict; answer an open question inline or attach the client's answer as a new document and re-run; edit assumptions, responsibility split and stakeholders; lock an item so re-runs keep it; export open questions for the client; ask "why" on any item and get the reasoning in plain words (section K).

**H2. Re-runs after finalize: new version, or merge with previous analyst edits?** — *Short*

**Answer:**

Merge. A re-run creates a new version; analyst edits are stored as locked overrides and re-applied; the analyst sees a diff (added / removed / changed) before accepting. Never silently overwrite an analyst edit.

**H3. Is there a separate approver/sign-off role, or does the analyst finalize alone?** — *Short*

**Answer:**

The analyst finalizes CP1 alone. Formal sign-off (reviewer, confirmation reviewer, approver) is on the complete TARA workbook. An optional "reviewed by" field at CP1 is useful for audit but should not block the pipeline.

---

## I. Evaluation set

**I1. How many sample items (inputs + expected Item Definition) can you provide for testing?** — *Short*
Even 3–5 lets me measure precision before and after each prompt change instead of guessing.

**Answer:**

Four real cases exist (TARA-1 to TARA-4), but for the legal reasons in A2 they cannot be the committed evaluation set. Plan: 3 to 5 synthetic items in the repo, each copying one difficulty pattern; real cases used only privately, with permission.

**I2. Acceptable run time and cost per run?** — *Short*
e.g. "under 2 minutes, under $1".

**Answer:**

Your call, but a reasonable target: under 5 minutes and under USD 2 per run for a typical 3 to 5 document input. A manual Item Definition takes days, so even a slower run is worth it as long as precision holds.

---

## J. Operational constraints

**J1. Can customer architecture diagrams be sent to a cloud LLM API (Anthropic)?** — *Short*
Or is on-prem / private deployment / redaction required for some customers?

**Answer:**

Must be confirmed with your employer and each client before use; do not assume yes. The repo is public, so client documents, account IDs, system names, engagement names and client-derived examples must not be committed. Build a redaction step (account IDs, hostnames, bucket names, IPs, personal names) that runs before any document leaves the machine, with a reversible mapping kept locally.

**J2. Must the tool support non-English diagrams or documents?** — *Short*

**Answer:**

Not needed for v1; all documents so far are English. Keep the design language-agnostic but do not spend effort on it.

**J3. On partial failure (e.g. one of three files unreadable), should the run continue with a warning or stop?** — *Short*

**Answer:**

Continue with a warning, as long as the B3 minimum is still met. Record the failed document in the register (read status "failed" plus reason), show it prominently at CP1, and add an open question to resend it. Stop only if the minimum input is no longer satisfied.

**J4. For the demo: what must be visible for it to "look properly working"?** — *List*
e.g. boundary drawn as a diagram (needs element positions/grouping), provenance per element, confidence badges, conflict panel, edit history. This tells me what the backend must produce even though the frontend comes later.

**Answer:**

- Zone diagram with nested containers and elements positioned in them (needs container tree + layout hints)
- Data flow inventory table with IF-## IDs, matching the reference columns
- Scope status badge per element with the reason
- Provenance on click (DOC_ID, page, quoted snippet)
- Confidence badge per element and link
- Conflict panel showing both sources and the proposed resolution
- Open questions list, exportable as a client query document
- Document register with read status
- Edit history / diff between versions
- Excel export in the reference workbook format

---

## K. Analyst dialogue design (added after review round 1)

These points were not asked above but came out of the first review. They change how CP0 and CP1 work.

**K1. Principle: a discussion, not a hand-over.**
The agent does not just produce an Item Definition. At each checkpoint it explains what it concluded, why, and what it assumed, in plain words. The analyst sees the reasoning behind every result, not the internal method or rules. The analyst can ask "why?" on any item; the agent answers only from its recorded sources and decisions and says "I don't know, this is an open question" rather than guessing.

Plain-language rules for everything the agent says to the analyst:
- Short sentences; one idea per sentence.
- A technical term is allowed only if the analyst would use it at work; anything else gets a few words of explanation in brackets.
- State the conclusion first, then the reason, then the source.
- One question per card; never a compound question the analyst has to untangle.
- No rule IDs, scores or internal labels in analyst-facing text.

**K2. Two checkpoints.**

```
Client documents → Input Normalization → CP0 (reading review) → Item Definition → CP1 (Item Definition review) → Asset identification
```

- **CP0, reading review.** Confirms the agent read the right things the right way before anything is built on them. Shows: a one-paragraph summary of the system as the agent understood it; per document, what it was used for and what was ignored and why (for example "pricing figures ignored, not relevant to security"); unreadable files; conflicts between documents; facts the agent could not find.
- **CP1, Item Definition review.** Confirms the elements, links, zones, scope decisions, boundary statement and assumptions, each with its reasoning. Scope questions from the E1 question bank are asked here.

**K3. Keeping the analyst's effort small: review by exception.**
Reading everything one by one would defeat the purpose. The agent sorts every fact into three groups:

| Group | What it contains | What the analyst does |
|---|---|---|
| Agreed | Stated by two or more documents with no conflict | Nothing; shown collapsed as a count, openable |
| Single source | Stated by one document only | Skims the list; accepts all with one click, or opens any item |
| Needs you | Conflicts, gaps, assumptions, scope questions, low-confidence reads | Must answer each card |

Target: the analyst answers roughly 10 to 25 cards per run, not hundreds of rows.

Each "Needs you" card has the same four parts:
1. **What I concluded** (or the two options, if it is a conflict)
2. **Why** (the sources, with a short quote)
3. **What I assumed** (the default if the analyst does not answer)
4. **What would change it** (the one fact that would flip the decision)

Trust check: at CP0 and CP1 the agent also picks 3 to 5 random items from the "Agreed" group and asks the analyst to verify them. If any are wrong, the whole group is opened for review. This keeps bulk acceptance honest without full review.

**K4. S3 explained: managed service internals.**

*Plain version.* When a system uses a cloud provider's service, such as AWS KMS for keys, there are two sides to it. The inside of the service (the hardware that holds the keys, the provider's software, its data centre) is built and run by the provider. The client cannot see it, test it or change it, and the provider is responsible for it under their contract. So there is nothing the client could do about a weakness there, and the TARA does not assess it. It is recorded as an assumption instead ("we rely on the provider to protect the inside of KMS").

The outside of the service is different. The client decides who is allowed to use a key, which key protects which data, whether keys are rotated, whether logging is switched on, and what the system does with the certificates or files the service gives back. All of that can be set up wrongly by the client, so it is assessed.

Think of a bank locker. The strength of the bank's vault is the bank's problem. Who you hand your locker key to is yours.

*Technical version.* This is the cloud shared responsibility model: the provider owns security *of* the cloud, the customer owns security *in* the cloud. For each element with hosting type "managed", the agent splits it:

| Side | Examples | Scope |
|---|---|---|
| Provider internals | HSM hardware and firmware in KMS or a private CA, provider hypervisors, the database engine patching inside a managed database | Out of scope; recorded as an assumption and later a cybersecurity claim |
| Customer-controlled surface | Key policies and IAM permissions (who can call Decrypt / Sign / IssueCertificate), key rotation and deletion settings, which key encrypts which store, bucket policies, database network exposure and users, audit logging settings, the artifacts the service returns (issued certificates, CRLs, encrypted blobs) and where the item stores them | In scope |

Example threats. In scope: "an application role is allowed to call Decrypt on the key that protects another service's data". Out of scope: "the key is extracted from the provider's HSM hardware".

The same component can be fully in scope when the team runs it itself. For example, a secrets vault installed on the team's own virtual machines is self-hosted, not managed. That is why question S3 in the E1 bank asks who runs the service and who controls its settings, rather than assuming from the service name.

**K5. CP0 and CP1 are designed iteratively, not in one prompt.**
The content of each checkpoint, the reasoning format, the questions and the presentation are designed and tested on paper first. Method: take one synthetic item, hand-write the checkpoint exactly as the agent would show it, give it to a colleague cold, and record every confusion, every "why?", every override and the time taken. Revise and repeat until a colleague can finish it without asking anything. Only then is it turned into prompts, schemas and screens. Tracked per iteration: "Needs you" cards per run, analyst time, override rate, "why?" requests per card.

---

## L. Question generation (added after review round 2)

**L1. Why a fixed question list is not enough.**
Every web TARA has different components, so a fixed list of questions cannot fit all of them. What stays stable is the small set of facts a scoping decision depends on. What changes is which components raise which facts, and how the question should be worded for that system.

**L2. The stable part: fact types.**

| ID | Fact type | Example question (wording is generated per system) |
|---|---|---|
| FT-01 | Who runs it (team, cloud provider, third party) | "Is the key service a cloud-provider service, or something your team installed and runs?" |
| FT-02 | Who controls its settings and permissions | "Who decides who can use it and changes its settings?" |
| FT-03 | Dedicated to this system or shared with others | "Is this sign-in used only by this product or also by other company applications?" |
| FT-04 | Where it can be reached from | "Can this be reached from the internet, or only from inside the network?" |
| FT-05 | What data it holds or carries | "What data is stored here? Does it include personal data or keys?" |
| FT-06 | Which environment, and what it shares | "Do test or staging environments share accounts, databases, keys or credentials with production?" |
| FT-07 | Whether it can push changes into the item | "Which tools can deploy code or infrastructure to production, and where are their credentials kept?" |

The internal mapping from answers to scope decisions (rules S1 to S10 in E1) lives in `_config/scoping-facts.md` and is never shown to the analyst.

**L3. How questions are produced.**
1. For each element, the agent looks up which fact types its kind needs (starter set).
2. A thinking model looks at the elements and the confirmed facts and writes additional questions specific to this system, only for facts that are still missing.
3. A separate model call tries to answer every question (starter and generated) from the confirmed facts and documents. If it finds the answer with a quote, the question is dropped before the analyst sees it. A separate check is used because a model checking its own questions tends to keep them.
4. The server deduplicates by (element, fact type) and caps questions per element (default 3).
5. Questions go to the analyst first. Only the ones the analyst cannot answer go to the client question list, each with the default the agent will assume.

**L4. Guards the server enforces.**
- A question without an element ID and a fact type is refused.
- A duplicate (element, fact type) is refused.
- More than the per-element cap is refused.

**L5. Unknown component kinds.**
If an element kind is not in the catalogue (for example a hybrid on-premises link or a multi-tenant layer), the agent asks the full fact set FT-01 to FT-07 and logs the kind as "new". Periodically a human reviews the log and decides whether a new scoping rule is needed. Only a human adds rules; the agent never does. If no existing rule fits, the agent flags it instead of forcing the element into the nearest rule.

---

## M. Reading diagrams and documents (added after review round 2)

**M1. Principle: parse what can be parsed; use a model only for what cannot.**
Deterministic parsing is exact, repeatable and costs nothing. A model is used only where the content exists only as an image or as free prose.

**M2. Reading method per input type.**

| Input | Method | Notes |
|---|---|---|
| draw.io / diagrams.net (`.drawio`, `.xml`, draw.io-embedded PNG or SVG) | Parse the XML directly, no model | Shapes, labels, container nesting (parent attribute and geometry), edges with source, target and label, style names (for example AWS icon style names give a kind hint). Compressed diagram content must be decompressed first. |
| Visio (`.vsdx`) | Unzip and parse the page XML, no model | Shapes, text, connectors and their glued endpoints, group membership. |
| Lucidchart export (CSV / JSON) | Parse directly, no model | Shape list, containment, lines with source and destination. |
| PNG / JPEG diagram, or a diagram page inside a PDF | Image-capable model, two passes | Pass 1: inventory of every labelled box and icon, with its approximate region on the page. Pass 2: containment (what sits inside which box) and arrows (from, to, label, direction). |
| PDF document | Extract the text layer first | Pages with little or no text (screenshots, scanned pages, embedded diagrams) go to the image-capable model. The method used is recorded per page. |
| Word document | Text and tables parsed directly | Embedded images treated like PNG. |
| Excel (API specs, sizing tables, asset lists) | Parsed per sheet, no model for structure | A model reads only the free-text cells when meaning must be interpreted. |
| Cloud configuration export (AWS Config, Terraform, CLI output) | Parsed directly where the format is known | Most reliable source (precedence rank 2 in B4). |
| Plain text / Markdown | Read by the model in page-sized chunks | Chunk boundaries keep their location references. |

**M3. Checks for image-read diagrams.**
- Label check: text read by the model is compared with text found by OCR on the same image. Labels that disagree are marked low confidence and become "Needs you" cards if they matter for scope.
- Arrows: direction and endpoints read from images are often uncertain. A link read only from an image is stored with confidence no higher than medium, and a link with an unclear endpoint becomes a question, not a guess.
- Every element read from an image carries its page and approximate region as the source reference, so the analyst can see where it came from.

**M4. Diagram-specific interpretation rules.**
- Managed services drawn as a sidebar list with one generic arrow to the whole network do not produce per-service links. Their links are taken from text or asked.
- A drawn box is a zone or subnet only if it is labelled as one (VPC, subnet, account, cluster) or the text confirms it. Otherwise it is visual grouping only and is recorded as such.
- An icon without a label becomes a question, not an element with an invented name.
- Legends, titles and page decorations are ignored and listed as ignored in the document register.
- A diagram title or label that names an environment (for example "dev") is recorded as an environment fact and checked against the other documents.

**M5. Model choice implication.**
Many open-weight models cannot read images. The model trial must test image reading separately from text extraction, on the synthetic item's PNG diagram. If the best text model cannot read images, two models are used: one for text, one for images, both pinned.

**M6. Document register fields added for reading.**
Per document: reading method (parsed / text layer / image model / mixed), per-page method for PDFs, pages or regions that could not be read, and the parser or model version used.

---

## N. Architecture decisions (added after review round 2)

**N1. What we learned from a reference commercial tool.**
We studied a commercial TARA tool that connects AI assistants over MCP. Its tools are not intelligent: they are plain read and write operations on its database, and the AI does the thinking. Its quality comes from three things built into the server: method rules written into each tool description; refusals of wrong moves (duplicate titles, decisions without reasons, the AI approving its own work); and completeness checks the server calculates itself. The lesson we copy is "put the rules in the server", not "use MCP".

**N2. Decisions.**
- The backend store (`checkpoint-api`) is the single source of truth for everything an analyst can see or change. Stage folders keep instructions, agent code and raw machine output for debugging and audit.
- Rules are enforced by the API, item by item, and also explained in each stage's `CONTEXT.md` so the model rarely breaks them. Minimum refusals: a fact without a source; a source pointing to an unknown document; an element without a supporting fact; a link to a missing element; a question without element and fact type; a scope decision without a reason; a confirm by anyone who is not the analyst; a confirm while "Needs you" cards are unanswered; any write to a confirmed checkpoint; Stage 02 writing anything based on a fact not confirmed at CP0.
- The server, not the model, computes the three CP0 groups, counts, spot checks, conflicts and coverage.
- Only the analyst can confirm CP0 and CP1. No model-facing code path can call a confirm.
- Model access: OpenRouter for both the pipeline and the review assistant, open-weight models only, at a size that could later be self-hosted, with model and provider pinned per stage and recorded in the audit trail for every run.
- No MCP for now. Reviewing many items in a chat window is impractical; the review happens in our own screens.
- LLM stages stay in Node; the store stays in Python. JSON schemas are the contract between them.
- The existing boundary data held as one JSON blob is replaced by per-item tables. Its finalize, freeze and edit-log behaviour is kept.

**N3. Stage numbering in the web workspace.**
01 Input Normalization, 02 Item Definition, 03 Asset Identification, then the existing stages from damage analysis onwards, renumbered.

---

## O. Roadmap: built now versus later (keeps the repo informed)

Built step by step, one step per prompt. Nothing below is done in one shot.

**Now (logic and backend first):**

| Step | What | Status |
|---|---|---|
| 1 | Update repo docs to this flow (glossary, decisions log, stage folders, Layer 0 to 2 docs) | planned |
| 2 | Data contract: documents, facts with sources, elements, links, zones, questions, scope decisions, analyst decisions, and the refusal rules | planned |
| 3 | Layer 3 config: fact types and scoping mapping, element kinds, link model, source precedence, analyst language rules | planned |
| 4 | Synthetic reference item 1 with analyst-approved expected output | planned |
| 5 | CP0 paper prototype, tested with a colleague, then CP0 spec | planned |
| 6 | CP1 paper prototype, tested with a colleague, then CP1 spec | planned |
| 7 | Evaluation scorer (section A3 metrics) | planned |
| 8 | Backend store with refusal rules and analyst-only confirmation | planned |
| 9 | Stage 01 reading: parsers (M2) plus model extraction, document register | planned |
| 10 | Reconciliation and grouping engine (deterministic) | planned |
| 11 | Stage 02: elements, links, zones, scope proposals, question generation (L) | planned |

**Later (recorded now, built in later steps):**

| Item | What it will cover | Status |
|---|---|---|
| Prompts | The five prompts (extraction, leftover reconciliation, Item Definition, question generation, answer checker). Each one goes through a review gate and a test run on the synthetic item before use. | later |
| Review assistant | Answers "why?" questions. Receives only the stored records for the item asked about, must cite them, must answer "I don't know, this is an open question" when nothing is stored, short plain answers. Needs its own test set of questions with expected answers. | later |
| Review screens | CP0 and CP1 screens and the review assistant's interface, built to the approved paper prototypes, functional first. | later |
| OpenRouter data handling | Check data-retention and logging settings, restrict to providers that do not retain data, redaction step (account IDs, hostnames, bucket names, IPs, personal names) with a reversible local mapping, before any real document is used. | later |
| Model trial | Compare 2 to 3 open-weight models for text extraction and, separately, image reading (M5); pick and pin. | later |
| Run time and cost target | Target per run (suggested: under 5 minutes and under USD 2 for 3 to 5 documents); runs over target are reported. | later |
| Exports | Excel in the reference layout and a draw.io zone diagram. | later |
| More synthetic items | Item 2 (no diagram, text only) and item 3 (configuration export only). | later |
| Asset identification | Stage 03, using the rules in G1 to G4. | later |
| Self-hosting models, MCP, diagram canvas, vehicle variant | Not part of this build. | not planned yet |
