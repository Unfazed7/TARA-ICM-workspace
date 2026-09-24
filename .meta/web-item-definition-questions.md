# Web Item Definition — Discovery Questions

Purpose: everything I need to know to build the **Web Item Definition** agent properly (see `CONTEXT.md` for terms).

Agreed flow these questions assume:

```
Client documents → [Input Normalization + Item Definition] → Item Definition review (CP1) → Asset identification → Damage scenarios → …
```

- **Input Normalization** reads every client document once and reconciles them into one consistent set of facts; it runs together with Item Definition as a single step.
- Nothing after Item Definition review re-reads client documents.
- **Asset identification** is a separate, later step built only from the finalized Item Definition.

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

**A2. Can you provide 1–3 finished Web Item Definitions from real (or realistic) past TARA work?** — *File*
These become the gold standard for the output shape and for measuring accuracy. Most important question on this list.

**A3. What does "50% precision" mean concretely?** — *Rules*
Measured against what, and at which level? Options: % of expected elements found; % of found elements that are real (no hallucinations); % of scope decisions matching the expert; % of links correct. Pick the one(s) that matter and the target for each.

**A4. Which mistakes are worst? Rank them.** — *List*
Missed element · hallucinated element · wrong scope decision · wrong link/protocol · wrong element type · too many "ambiguous" flags · too few "ambiguous" flags.

---

## B. Client documents and Input Normalization

**B1. Which client document types actually arrive in practice, and how often?** — *List*
For each: format (PNG, PDF, draw.io, Visio, Lucidchart export, Terraform/CloudFormation, AWS Config export, Excel feature list, Word/PDF spec, plain text) · how common · typical size.

**B2. What does a typical web architecture diagram look like?** — *Example + File*
Notation (AWS icon set, C4, custom boxes), roughly how many boxes, are labels readable, are VPCs/subnets/trust zones drawn, one diagram or several per item. Please attach 2–3 real diagrams of varying quality (including a messy one).

**B3. What is the minimum input for a run to be valid?** — *Rules*
e.g. "at least one diagram OR a feature list + free text"; is a boundary statement mandatory?

**B4. When sources disagree, which one wins?** — *Rules*
Give a precedence order (e.g. existing item definition > network topology > architecture diagram > feature list > free text), and say which disagreements must always go to the analyst instead of being auto-resolved.

**B5. For feature/function lists and topology exports: what are the exact columns/fields?** — *File*
Attach one real sample of each.

**B6. When a client sends an asset list (CSV/Excel), how should Input Normalization use it?** — *Rules*
It is now just another client document, not a shortcut to rated assets. Should each row become a candidate **element**, a hint passed on to Asset identification, or both? Attach a sample.

**B7. Should Input Normalization keep a document register?** — *List*
i.e. a record of every client document used (id, title, version, date, owner) so each fact in the Item Definition can be traced to a specific document version. Which fields are needed?

**B8. Besides elements and links, what else should Input Normalization extract from client documents?** — *List*
Candidates: functions/use cases · stated assumptions · constraints · security requirements already stated by the client · open questions for the client (gaps the documents don't answer).

**B9. When the documents leave a gap, should the tool generate a list of questions to send back to the client?** — *Short*

---

## C. Elements — what goes into the model

**C1. Complete list of element kinds for a web item.** — *List*
Confirm/correct/extend: cloud account · region · VPC · subnet · security group · Kubernetes cluster (EKS/AKS/GKE) · node group · namespace · microservice/workload · serverless function · API gateway · load balancer · WAF · CDN · database · object storage · cache · message queue/stream · identity provider · secrets/key store · certificate authority · monitoring/logging (CloudWatch etc.) · CI/CD pipeline · container registry · third-party SaaS · web frontend · mobile app · admin portal · external vehicle system · human actor.

**C2. Granularity: what is one element?** — *Rules*
Is each AWS managed service an element? Each microservice? Each API endpoint, or one element per API? Each database table, or one per database? Each pod, or one per deployment? Give the rule plus one example of "too fine" and "too coarse".

**C3. Containers vs elements.** — *Rules*
Are VPC / subnet / cluster / namespace / cloud account **elements** themselves, or **containers/zones** that group elements? Should the model be nested (VPC ⊃ subnet ⊃ cluster ⊃ service) or flat?

**C4. Required attributes per element.** — *List*
Which of these are mandatory, optional, or not needed: provider (AWS/Azure/GCP/on-prem) · region · hosting type (managed/self-hosted) · internet-exposed (yes/no) · authentication method · data handled/classification · owner (OEM / supplier / third party) · technology/version · criticality.

**C5. Are human actors part of the Item Definition?** — *Short + List*
(technician, fleet operator, OEM admin, vehicle owner, developer). If yes, list the standard actor set.

**C6. What data information should the Item Definition record so Asset identification can derive data assets later?** — *Rules*
Data assets (PII, VIN, credentials, firmware packages, logs) are now identified in the later Asset identification step, not in the Item Definition. But that step never re-reads client documents, so the Item Definition must already capture enough about data: e.g. "data stored" on each data store and "data carried" on each link. Which data details must be recorded, and at what level (category like "PII" vs specific like "vehicle owner name, email, VIN")?

---

## D. Links / interfaces

**D1. Should links represent logical data flows, network connectivity, or both?** — *Short*

**D2. Link attributes: which are mandatory?** — *List*
protocol · direction · authenticated (y/n/unknown) · encrypted (y/n/unknown) · data carried · sync/async · port · crosses trust boundary (y/n).

**D3. Complete protocol list for web items.** — *List*
Confirm/extend: HTTPS · HTTP · gRPC · WebSocket · MQTT · AMQP · Kafka · SQL/JDBC · Redis · S3 API · SSH · SFTP · OAuth2/OIDC · SAML · TLS/mTLS · VPN/IPsec · Cellular (to vehicle).

**D4. Trust boundaries: does the Item Definition mark them?** — *Rules*
If yes: the standard zones (internet · DMZ/public subnet · private subnet · management plane · third-party · vehicle), and who decides them (agent proposes vs analyst draws).

---

## E. Boundary and scoping rules

**E1. The upload screen says "the pipeline applies standard scoping rules". Write those rules out explicitly.** — *Rules*
This is the core of the Call 1B prompt. As many as you use in practice.

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

**E3. Vehicle ECUs inside a web architecture (FOTA/SUMS case).** — *Rules*
My proposed default: one flat "external vehicle system" element per ECU, only `interface`/`out_of_scope`, never broken down into internal parts; if the boundary statement explicitly includes an ECU, flag `ambiguous` and suggest the Vehicle variant. Confirm or correct.

**E4. What does a good boundary statement look like?** — *Example*
2 good ones and 2 bad ones for web items. Should the agent propose a boundary statement when the analyst leaves it blank?

**E5. "Ambiguous" tolerance.** — *Short*
Prefer the agent to flag more ambiguity (safer, more analyst work) or decide more (faster, riskier)? Rough acceptable ambiguous % per run?

---

## F. Item Definition content beyond architecture (ISO/SAE 21434 clause 9.3)

**F1. Which of these sections must the Web Item Definition contain?** — *List (mark each required / optional / not needed)*
item boundary · functions / use cases · preliminary architecture · operational environment (deployment regions, tenants, environments like prod/staging) · interfaces to external systems · assumptions · constraints · applicable legal/regulatory requirements (R155/R156, GDPR…) · stakeholders.

**F2. For any section marked required: should the agent generate it, or does the analyst write it?** — *Rules*

**F3. What is the final deliverable format?** — *File*
JSON only · Excel in an OEM template · Word/PDF report · diagram. Attach any template your customers expect.

**F4. Traceability: must every element point back to where it came from in the source (page, diagram region)?** — *Short*

---

## G. Asset identification and downstream

**G1. Element → asset rules for Asset identification (clause 15.3).** — *Rules*
An element is something that exists in the system; an asset is something inside it worth protecting, with CIAAAN properties. One element can yield several assets or none. For each element kind in C1, which asset(s) does it typically produce, and which CIAAAN properties apply? Example of the expected level:
- Firmware package store → *firmware packages* (Integrity, Authenticity), *signing metadata* (Integrity)
- OTA update API → *update authorization function* (Authorization, Authenticity, Integrity), *API availability* (Availability)
- VPC → no asset (container only)

**G2. Which scope statuses produce assets?** — *Rules*
Only `in_scope` elements? Also `interface` elements (e.g. the link to a vehicle ECU)? Never `out_of_scope`?

**G3. How much analyst review does Asset identification need?** — *Short*
A full second review, or a light confirm-and-adjust of what the agent proposes?

**G4. Do any later stages (damage, threats, attack paths) need anything from the Item Definition directly (e.g. trust boundaries, internet exposure, actors)?** — *List*

---

## H. Item Definition review (CP1)

**H1. What must an analyst be able to do at Item Definition review?** — *List*
Confirm/extend: change scope · add element · delete element · rename · edit attributes · add/delete link · resolve conflict · edit boundary statement · re-run with extra files · approve/finalize.

**H2. Re-runs after finalize: new version, or merge with previous analyst edits?** — *Short*

**H3. Is there a separate approver/sign-off role, or does the analyst finalize alone?** — *Short*

---

## I. Evaluation set

**I1. How many sample items (inputs + expected Item Definition) can you provide for testing?** — *Short*
Even 3–5 lets me measure precision before and after each prompt change instead of guessing.

**I2. Acceptable run time and cost per run?** — *Short*
e.g. "under 2 minutes, under $1".

---

## J. Operational constraints

**J1. Can customer architecture diagrams be sent to a cloud LLM API (Anthropic)?** — *Short*
Or is on-prem / private deployment / redaction required for some customers?

**J2. Must the tool support non-English diagrams or documents?** — *Short*

**J3. On partial failure (e.g. one of three files unreadable), should the run continue with a warning or stop?** — *Short*

**J4. For the demo: what must be visible for it to "look properly working"?** — *List*
e.g. boundary drawn as a diagram (needs element positions/grouping), provenance per element, confidence badges, conflict panel, edit history. This tells me what the backend must produce even though the frontend comes later.
