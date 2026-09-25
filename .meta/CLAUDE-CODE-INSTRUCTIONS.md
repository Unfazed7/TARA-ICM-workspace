# TARA Aegis: Rebuild Plan for Input Normalization, CP0, Item Definition, CP1 and Asset Identification

**Audience:** Claude Code, working in the `TARA-ICM-workspace` repository.
**Suggested location in repo:** `.meta/CLAUDE-CODE-INSTRUCTIONS.md`
**Owner of decisions:** the analyst (repo owner). Claude Code proposes and implements; the analyst decides at every HUMAN GATE.

---

## PART 0. How to use this document

1. Work through the tasks strictly in order. Task IDs are `A1`, `A2`, ... `C14`.
2. Do exactly one task per session or per prompt. Start each task by re-reading **PART 1 (Global rules)** and the **Design Reference** sections that the task lists under "Read first".
3. A task marked **HUMAN GATE** ends with a stop. Claude Code writes its output, summarises it, lists the decisions needed, and waits. It does not start the next task until the analyst replies with an explicit go-ahead.
4. Every task ends with the "Acceptance" checklist. If any item fails, fix it or report it; never mark a task done with a failing item.
5. Record progress in `.meta/REBUILD-PROGRESS.md` (created in task A0): task ID, date, status (`done`, `blocked`, `waiting-gate`), commit hash, notes.

Suggested prompt to start each session:

> Read `.meta/CLAUDE-CODE-INSTRUCTIONS.md` PART 1 and the Design Reference sections listed for task `<ID>`. Then read `.meta/REBUILD-PROGRESS.md`. Execute task `<ID>` only. Stop at the end of the task and report against its Acceptance list.

---

## PART 1. Global rules (apply to every task)

### 1.1 Working rules
- R1. Work directly on the current `claude` branch. Do not create new branches. Make one commit per task (more if a task has a HUMAN GATE in the middle), using the commit message given in the task, so every task stays easy to find and revert in the history.
- R2. Use `git mv` for moves and renames so history is kept. Never delete a file that is not named for deletion in the task. Superseded documents are marked, not deleted (see R6).
- R3. Before editing, list the files you will touch. After editing, list the files you actually touched. They must match, or explain the difference.
- R4. Run the full test suites after every code change: `npm test` at the repo root and `pytest` in `checkpoint-api/`. A task is not done while previously passing tests fail, unless the task explicitly retires those tests.
- R5. Do not invent facts about client systems. All example and fixture content must be synthetic (see Design Reference DR-10).
- R6. To supersede a document, add this block at the very top and leave the rest untouched:
  ```
  > **SUPERSEDED** on <date> by <new file path>. Kept for history. Do not use for new work.
  ```
- R7. Respect the existing ICM layering (`.meta/CLAUDE.md`): Layer 0 `CLAUDE.md`, Layer 1 `CONTEXT.md`, Layer 2 `stages/*/CONTEXT.md`, Layer 3 `_config/`, Layer 4 `stages/*/output/`. Web-based TARA files stay inside `tara-workspace/web-based-tara/`. Never edit another TARA type's folder.
- R8. Respect the existing spec format in `.meta/CLAUDE.md` (Goal, Success Criteria, File Ownership, Input/Output, Process, Validation Rules, Error Conditions, Verification Steps) and its size limit. If a spec would exceed the limit, split it into several numbered specs.
- R9. Write the spec before the code. For any Phase C task, the corresponding spec must already be committed and approved.
- R10. Stop and ask when something in the repo contradicts this document, when a required decision is missing, or when a change would touch more than the task allows. Never resolve a contradiction silently.

### 1.2 Writing rules for all prose (docs, prompts, UI text)
- W1. Do not use em dashes. Connect clauses with a comma, a full stop, a colon, or "so".
- W2. Plain language. Short sentences. A technical term is allowed only if a TARA analyst would use it at work.
- W3. No client names, engagement names, company names, personal names, account IDs, bucket names or hostnames anywhere in the repo.

### 1.3 Safety rules for the running tool
- S1. Only the analyst can confirm CP0 and CP1. No model-facing code path may call a confirm endpoint.
- S2. Every stored fact must carry a source reference. The API refuses anything without one.
- S3. Model access only through `tara-workspace/web-based-tara/stages/llm-client.js`, using `LLM_PROVIDER=openrouter`, with the model and provider taken from `_config/models.json` (task C1). No direct provider calls anywhere else.

---

## PART 2. Design Reference (the agreed design)

These sections are the source of truth for every task. Tasks refer to them by ID.

### DR-1. Pipeline flow (web-based TARA)

```
Client documents
  -> Stage 01 Input Normalization      (reads every client document once, produces facts)
  -> CP0 Reading review                (analyst confirms what was read and how)
  -> Stage 02 Item Definition          (builds elements, links, zones, scope from confirmed facts only)
  -> CP1 Item Definition review        (analyst confirms scope, boundary, assumptions)
  -> Stage 03 Asset Identification     (derives assets from the finalized Item Definition only)
  -> light asset review (full review of the CIAAAN column)
  -> Stage 04 Damage Analysis and onwards (existing stages, renumbered +2 where needed)
```

Rules:
- No stage after CP0 re-reads client documents. Stage 02 works only from CP0-confirmed facts and analyst answers.
- No stage after CP1 reads anything except the finalized Item Definition and later stage outputs.
- The web and vehicle Item Definition variants never blend. A web TARA that touches vehicles models the vehicle as one external interactor.

### DR-2. Core principle: discussion, not hand-over
- The agent shows the analyst what it concluded, why, and what it assumed. It shows reasoning, never the internal method or rule IDs.
- The analyst can ask "why?" on any item. The answer is built only from stored sources and stored decisions. If nothing is stored, the answer is "I don't know, this is an open question", never a guess.
- Plain-language rules for analyst-facing text: conclusion first, then reason, then source. One idea per sentence. One question per card. No rule IDs, scores or internal labels.

### DR-3. Review by exception (CP0 and CP1)
Every fact or proposal is sorted by the server (never by the model) into three groups:

| Group | Contents | Analyst action |
|---|---|---|
| Agreed | Stated by two or more documents with no conflict | None required; shown collapsed as a count, can be opened |
| Single source | Stated by one document only | Skim; accept all with one click, or open any item |
| Needs you | Conflicts, gaps, assumptions, scope questions, low-confidence reads | Must answer each card |

- Target: 10 to 25 "Needs you" cards per run. If more than about 20% of elements are flagged, the run reports that the documents are too weak and produces the client question list instead.
- Every "Needs you" card has four parts: **What I concluded** (or both options for a conflict), **Why** (sources with a short quote), **What I assumed** (the default if unanswered), **What would change it** (the one fact that would flip it).
- Spot check: at each checkpoint the server picks 3 to 5 random "Agreed" items for the analyst to verify. If any is wrong, the whole "Agreed" group is reopened for review.
- A checkpoint cannot be confirmed while any "Needs you" card is unanswered, unless the analyst explicitly marks it "send to client" (then the default is recorded as an assumption).

### DR-4. CP0 content (Reading review)
- One-paragraph summary of the system as understood.
- Document register view: per document, what it was used for, what was ignored and why (for example "pricing figures ignored, not relevant to security"), read status.
- Unreadable or partially read files, each with a resend question.
- Conflicts between documents (always "Needs you").
- Facts the agent could not find (gaps), as questions.
- The three groups from DR-3.

### DR-5. CP1 content (Item Definition review)
- Proposed boundary statement (marked "proposed" if the agent wrote it).
- Container tree and zones, elements, links (Data Flow Inventory), trust boundaries.
- Scope decision per element with a plain reason (see DR-7 example).
- Assumptions, responsibility split, stated controls and stated absences, stakeholders, open questions.
- Analyst actions: change scope, add/delete/rename element, change kind, merge/split, move zone, edit attributes, add/delete link, resolve conflict, edit boundary statement, answer questions, attach a new document and re-run, lock items, export client questions, ask "why".
- Re-runs create a new version; analyst edits are stored as locked overrides and re-applied; a diff is shown before acceptance. Never silently overwrite an analyst edit.

### DR-6. Question generation
- A fixed starter set of fact types (DR-7) exists in `_config/scoping-facts.md`.
- A thinking model generates additional questions after looking at the elements and checking whether the documents already answer them.
- Guards, all enforced by the server:
  1. Every question must reference one element ID and one fact type from the catalogue. Otherwise refused.
  2. A separate model call tries to answer each generated question from the confirmed facts and documents. If it finds an answer with a quote, the question is dropped before the analyst sees it.
  3. Deduplicate by (element ID, fact type). Cap questions per element (default 3).
- Questions go to the analyst first. Only the ones the analyst cannot answer go to the client question list.

### DR-7. Scoping: internal defaults confirmed through factual questions
The scoping rules are internal defaults. They are never shown to the analyst. For each element a rule touches, the agent asks a plain factual question, maps the answer to a scope decision, then shows the decision with a plain reason. If the analyst does not know, the question goes to the client list and the default is used, marked "assumed".

Internal defaults:
- S1 Account: what is deployed in the cloud account(s) hosting the item is inside the boundary, including network plumbing and the registry.
- S2 Plumbing: load balancers, NAT, IGW stay in scope as elements; Asset Identification treats them as configuration only. (Proposed default, recorded in the decisions log.)
- S3 Managed service internals: provider internals out of scope and recorded as an assumption; the customer-controlled surface is in scope (key policies and IAM permissions, rotation and deletion settings, which key protects which store, bucket policies, network exposure, audit logging settings, artifacts the service returns and where they are stored). A service the team runs itself is fully in scope.
- S4 Identity provider: a shared company-wide IdP is an interface and only the item's token check is in scope; an IdP instance dedicated to and configured for the item is in scope as configuration.
- S5 Vehicle: vehicle and ECUs out of scope; the cloud endpoint of each vehicle channel in scope; one vehicle/TCU interactor per vehicle-side identity.
- S6 Third-party SaaS: interface; the outbound link, the data it carries and the credentials the item holds are in scope.
- S7 Supply chain: anything that can push code or infrastructure into the item is in scope, wherever hosted.
- S8 Monitoring and audit: in scope.
- S9 Environments: only the assessed environment; others flagged if they share credentials, networks or data.
- S10 Actors and user devices: interactors, never broken down; admin access paths in scope.
- S11 Nothing is scoped out silently; every out-of-scope element has a recorded reason.
- S12 Stated absences ("no WAF", "no HSM") are facts and are recorded.
- S13 Undocumented components become questions, never elements.
- S14 No blending with the vehicle variant.

Fact types (the stable part; question wording is generated per system):

| ID | Fact type | Example question |
|---|---|---|
| FT-01 | Who runs it (team, cloud provider, third party) | "Is the key service a cloud-provider service, or something your team installed and runs?" |
| FT-02 | Who controls its settings and permissions | "Who decides who can use it and changes its settings?" |
| FT-03 | Dedicated or shared with other systems | "Is this sign-in used only by this product or also by other company applications?" |
| FT-04 | Where it can be reached from | "Can this be reached from the internet, or only from inside the network?" |
| FT-05 | What data it holds or carries | "What data is stored here? Does it include personal data or keys?" |
| FT-06 | Which environment, and what it shares | "Do test or staging environments share accounts, databases, keys or credentials with production?" |
| FT-07 | Whether it can push changes into the item | "Which tools can deploy code or infrastructure to production, and where are their credentials kept?" |

Mapping table (internal, lives in `_config/scoping-facts.md`):

| Rule | Facts needed | Answer -> decision |
|---|---|---|
| S1 | FT-01, FT-03 on the account | Own account -> S1 as is. Shared account -> only the item's resources inside; shared ones flagged |
| S2 | FT-02 plus "does it act on requests" | Forward only -> configuration asset only. Acts on requests (auth, filtering, TLS termination) -> full element |
| S3 | FT-01, FT-02 | Provider-run -> split internals (out) and customer surface (in). Team-run -> fully in scope |
| S4 | FT-03, FT-02, token check location | Shared and central IT -> interface, token check in scope. Dedicated and product team -> in scope as configuration. Mixed -> ambiguous with both options |
| S5 | talks to vehicles, through which unit, in-vehicle assessed elsewhere | Yes -> one interactor per counterpart. In-vehicle in scope here -> flag, separate vehicle TARA |
| S6 | which services receive data, what data, how the item authenticates | Interface element plus in-scope link and credential |
| S7 | FT-07 | Each such tool is an in-scope element |
| S8 | where logs go, who can read or delete, personal data | In scope; data category recorded |
| S9 | FT-06 | Nothing shared -> other environments out. Shared -> ambiguous |
| S10 | who uses it, from which devices, admin machines managed | Interactors; admin access path in scope |

Unknown element kinds: ask the full fact set FT-01 to FT-07, and log the kind as "new" in `stages/02-item-definition/output/new-kinds.log` for later human review. Only a human adds new rules.

Example of analyst-facing result: "Sign-in service: outside the assessment. Reason: you said it is the company-wide login used by other applications and managed by central IT. The point where this system checks the login token is inside the assessment."

### DR-8. Source precedence and escalation
Precedence (highest wins): 1 analyst decision at a checkpoint; 2 cloud configuration export; 3 written client answers (newest first); 4 existing client item definition; 5 architecture diagram; 6 infrastructure/sizing document; 7 functional documentation, SRS, API specification; 8 user manual; 9 analyst free text.

Always "Needs you", never auto-resolved: internet exposure or ingress path; which environment a document describes; whether a component exists; who owns or operates a component; authentication mechanism on an entry point; a higher-precedence source that is older than the lower one.

Auto-resolved (loser kept in the conflict log): naming differences, instance sizes, counts, versions.

### DR-9. Minimum input and partial failure
- Mandatory: a boundary statement (or at least item name plus one sentence); at least one document describing components (diagram, infra/sizing, config export, or an architecture section); at least one document describing behaviour (functional doc, API spec, user manual, SRS, Q&A).
- If a mandatory input is missing: stop and list what is missing.
- A diagram is not mandatory. Without one, every link is marked "inferred from text".
- If one file cannot be read but the minimum is still met: continue, mark the file "failed" with the reason in the document register, show it at CP0, and add a resend question.

### DR-10. Data policy (legal)
- The repo is public. Nothing client-derived goes into it: no client documents, workbooks, diagrams, names, account IDs, component lists, counts or findings, even renamed.
- Reference cases from past work are called only TARA-1 (config export), TARA-2 (diagram plus client Q&A plus functional docs), TARA-3 (no diagram; sizing table, API spec, user manual), TARA-4 (single SRS, negative test). They are described by input pattern only.
- Evaluation items in the repo are synthetic, built from public knowledge (for example public cloud reference architectures), and reproduce a difficulty pattern, not content.
- Real material may only be used locally, on approved infrastructure, with permission, in a git-ignored folder (`/private-eval/`).

### DR-11. Model policy
- OpenRouter for all model calls, for both the pipeline and the review assistant. No MCP for now.
- Open-weight models only, at a size that could realistically be self-hosted later, so test results transfer.
- Model and provider pinned per stage in `_config/models.json`. Every run records the model, provider and prompt version in the audit trail.
- Heavy reading (Stage 01) gets the strongest model you could host. The review assistant answers from stored reasons, so a smaller model is acceptable.

### DR-12. Architecture decisions
- AD-1. `checkpoint-api` (FastAPI, SQLAlchemy) is the single source of truth for anything an analyst can see or change.
- AD-2. ICM stage folders hold instructions (`CONTEXT.md`, `_config/`), agent code and raw machine output for debugging and audit. Once seeded into the API, downstream stages read confirmed state from the API, not stage output files.
- AD-3. Rules are enforced by the API (refusals, per item), and explained in the stage `CONTEXT.md` so the model rarely hits them.
- AD-4. The server, not the model, computes groupings, counts, coverage and conflicts.
- AD-5. LLM stages stay in Node; the store stays in Python. The JSON schemas in `src/schemas/` are the shared contract.
- AD-6. The existing boundary blob model (`BoundaryState.merged_model`, `decisions`) is replaced by per-item tables. Its finalize, freeze (409) and edit-log behaviour is kept.

### DR-13. Element model (for Stage 02)
- Containers, not elements: cloud account, region, VPC, subnet, availability zone, namespace. Nested tree: account > region > VPC > subnet (zone) > cluster > namespace > workload. Every element has exactly one parent container. Managed services outside the VPC sit in an "account-level managed services" container.
- Each VPC also gets one element "network boundary configuration" (security groups, NACLs, routes, endpoints).
- A Kubernetes or ECS cluster is a container and the parent of real elements (control plane, nodes, runtime).
- Element kinds: cluster control plane, worker nodes, pod runtime, ECS service, microservice/workload, serverless function (including authorizers), API gateway, load balancer, WAF, CDN, database (logical), object storage bucket, cache, queue/stream, identity provider, secrets store, KMS key, certificate authority, monitoring/logging, audit trail/config recorder, security detection tooling, landing zone/governance (only if documented), CI/CD pipeline, IaC runner, container registry, NAT gateway, internet gateway, VPC endpoint, transit gateway/peering/VPN/direct connect, DNS, bastion/session manager, in-cluster platform components, workflow engine, IoT device gateway, device provisioning service, signing service, data warehouse, stream processing/ETL, backup store, file storage, notification gateway, payment gateway, mapping provider, third-party SaaS, partner/OEM backend, web frontend, mobile app, admin portal, field device, external vehicle system, human actor, system-to-system client.
- Granularity: one element per independently deployed or configured unit with its own identity, access policy or distinct data content. Never per pod, table, endpoint, S3 prefix or security group. Too coarse: "AWS backend", one "Database" for several logical databases with different data, one "S3" for buckets with different content.
- Required element attributes: ID, name, kind, parent container/zone, provider, hosting type (managed/self-hosted), internet exposed (yes/no/unknown with evidence), owner/operator, scope status plus reason, source refs plus confidence, data handled/stored (for stores and processes). Authentication method mandatory for entry points and anything internet exposed. Stated security configuration optional but wanted. No criticality field.
- Actors: end user/customer, business operator/portal user, tenant/platform administrator, platform operator/SRE/DevOps, developer/CI identity, system-to-system client, support/helpdesk (if documented), field device, external data sinks.
- Data recording: specific items when documents give them, plus one category tag: PII (direct), vehicle-linked PII, credentials and session tokens, cryptographic keys (with purpose), certificates, firmware/software artifacts, signed metadata, configuration, logs and telemetry, audit/record data (mark as record store), business transactions, payment data, backups. Category-only is flagged "unspecified". For keys and credentials also record purpose, where held, who can use it.

### DR-14. Link model
- Two link types: data flow (intended exchange) and exposure (reachability without intended flow). Both get IF-## IDs.
- Mandatory link attributes: IF-## ID, type, source, destination, direction, protocol and port if known, usage/function at destination, authentication mechanism (named, or "unknown"), encryption (named, or "unknown"), data carried (DR-13 format), crosses trust boundary (derived from zones), remark (security-relevant observation), source refs plus confidence. Optional: sync/async, rate limiting, volume.
- Protocols are transport/application only (HTTPS/REST, GraphQL, gRPC, WebSocket, EV charging protocols such as OCPP, MQTT over TLS, AMQP, Kafka, Kinesis/SQS/SNS API, SQL wire protocols, Redis, S3 API and presigned URLs, SigV4-signed cloud service API calls, IMDS, NFS, SMTP, SMS gateway API, payment gateway API and webhooks, JWKS fetch, DNS, SSH, session manager, SFTP, VPN/IPsec, direct connect). OAuth2, OIDC, SAML, TLS, mTLS, API keys, JWT, X.509, IAM roles and session cookies are authentication or encryption attributes, not protocols.
- Zones: internet/external; edge/public subnet; private application subnet; data subnet (only if a separate subnet group is documented); account-level managed services; control/management plane; governance account (only if documented); corporate IT; third-party SaaS; vehicle/field device. The agent never invents a zone the documents do not show.

### DR-15. Asset Identification rules (for Stage 03, later)
- Many elements are assets directly; containers never are. Business-function assets come from the function inventory. Credential and key assets come from secrets/key store data fields. In-transit assets come from links carrying sensitive data across a trust boundary.
- Scope statuses: `in_scope` produces all asset types; `interface` produces only the item's side (link asset, the external party's identity as used by the item, credentials the item holds); `out_of_scope` produces none but stays listed.
- CIAAAN rule: if the wrong party gets data because an entitlement check is missing, that is Authorization, not Confidentiality. Confidentiality applies to an element only for data it holds that no other asset row covers. A row whose every consequence is owned by other rows must not exist.
- Default property table per element kind: see `.meta/web-item-definition-questions.md`, answer G1.

### DR-16. Evaluation metrics
Measured per run against the expected output of a synthetic item. An element matches if it refers to the same real component regardless of name (a hand-made match map per item).

| Metric | Definition | Target (v1) |
|---|---|---|
| Element recall | matched / expected elements | >= 80% |
| No-hallucination precision | matched / produced elements, where unmatched counts as hallucinated only if it has no source reference | >= 95% |
| Scope agreement | same scope status / matched elements | >= 85% |
| Link correctness | correct source, destination and protocol / expected links | >= 70% |

Also tracked: "Needs you" cards per run, analyst time, override rate, "why?" requests per card.

### DR-17. Reading diagrams and documents
Full rules are in `.meta/web-item-definition-questions.md` section M. Summary:
- Parse source files directly with no model: draw.io XML (decompress if needed), Visio `.vsdx` page XML, Lucid CSV/JSON exports, Excel sheets, Word text and tables, known config export formats.
- PNG/JPEG diagrams and diagram pages in PDFs go to an image-capable model in two passes (inventory with regions, then containment and arrows).
- PDFs: text layer first; pages with little or no text go to the image model; method recorded per page.
- Image-read labels are cross-checked with OCR; image-read links get confidence no higher than medium; unclear endpoints and unlabelled icons become questions.
- A drawn box is a zone only if labelled as one or confirmed by text; sidebar managed services with one generic arrow produce no per-service links.
- The document register records reading method per document and per page.

---

## PART 3. Tasks

### Phase A. Lock decisions and make the repo tell the truth

---

#### A0. Set up tracking
**Read first:** PART 0, PART 1.
**Do:**
1. Confirm you are on the `claude` branch.
2. Add this document as `.meta/CLAUDE-CODE-INSTRUCTIONS.md` (the analyst provides it).
3. Create `.meta/REBUILD-PROGRESS.md` with a table: Task, Status, Date, Commit, Notes. One row per task A0 to C14, all `pending` except A0.
4. Confirm `.meta/web-item-definition-questions.md` is the latest version (it contains section K "Analyst dialogue design"). If it does not, stop and ask the analyst for the latest file.
**Acceptance:** both files exist; progress table lists every task; section K is present in the questions file.
**Commit:** `chore: add rebuild instructions and progress tracker`

---

#### A1. Stale inventory (read-only)
**Read first:** DR-1, DR-12.
**Do:**
1. Search the whole repo (excluding `node_modules`, `.git`, `frontend/src/components/ui`, `frontend/src/components/effects`) for anything describing the old flow. Search terms at minimum: `asset-register`, `input_mode`, `asset-list`, `Mode A`, `Mode B`, `01-input-normalization`, `01-item-definition`, `02-asset-analysis`, `single step`, `merged_model`, `boundary review`, `CP1`, `vehicle_type`, `claude-opus`, `claude-sonnet`, `ANTHROPIC_API_KEY`, `hermes-3`.
2. Also list governance inconsistencies: `.meta/CLAUDE.md` says specs live in `.meta/specs/` and Codex implements; `.meta/WORKFLOW.md` says specs live in `/Agents/Claude/SPECIFICATIONS/` and Qwen implements; the orchestrator header lists a different 7-stage sequence.
3. Write `.meta/STALE-INVENTORY.md` with a table: File, What is stale, Proposed action (`update`, `supersede`, `move`, `keep`, `delete-after-approval`), Task that will handle it (A3 to C14).
**Do not:** edit any file other than the inventory.
**Acceptance:** every file from the search appears once; every row has an action and a task; governance conflicts listed separately.
**HUMAN GATE:** analyst reviews and approves or edits the proposed actions.
**Commit:** `docs: stale inventory for rebuild`

---

#### A2. Public repo hygiene (read-only, then gated removal)
**Read first:** DR-10.
**Do:**
1. List every file that could be client-derived or confidential. At minimum inspect: `frontend/database/**` (all workbooks), `test-assets.csv`, `tests/fixtures/**`, `docs/**`, `frontend/public/docs/**`, `.meta/**`, `README.md`. For each workbook, list sheet names and the first rows so the analyst can judge.
2. Search all text files for patterns that look like AWS account IDs (12 digits), bucket names, hostnames, email addresses, IP addresses, and personal names.
3. Write `.meta/HYGIENE-REPORT.md`: File, Why it may be sensitive, Evidence (sheet/line), Proposed action (`remove`, `replace with synthetic`, `keep`).
4. Add `/private-eval/` to `.gitignore`.
**Do not:** remove or rewrite anything in this task except `.gitignore`.
**Acceptance:** report complete; `.gitignore` updated.
**HUMAN GATE:** analyst decides per file. After approval, in a second commit, remove or replace only the approved files, and note that removing a file from the latest commit does not remove it from git history (the analyst decides whether history rewriting or making the repo private is needed).
**Commit:** `chore: public repo hygiene report` then `chore: remove approved sensitive files`

---

#### A3. Decisions log
**Read first:** DR-1 to DR-12.
**Do:** Create `.meta/DECISIONS.md`. One entry per decision, format: ID, Decision, Reason, Date, Status (`accepted`, `proposed`). Entries at minimum:
- D-01 Flow: Stage 01 Input Normalization, CP0, Stage 02 Item Definition, CP1, Stage 03 Asset Identification (DR-1).
- D-02 No stage after CP0 re-reads client documents; Stage 02 uses confirmed facts only.
- D-03 Discussion approach: reasoning shown, method and rules hidden (DR-2).
- D-04 Review by exception with three server-computed groups and spot check (DR-3).
- D-05 Scoping rules are internal defaults confirmed through factual questions (DR-7).
- D-06 Question generation with three server-enforced guards (DR-6).
- D-07 Source precedence and always-escalate list (DR-8).
- D-08 Minimum input and partial-failure behaviour (DR-9).
- D-09 Data policy: public repo, synthetic references, TARA-1 to TARA-4 naming (DR-10).
- D-10 OpenRouter, open-weight models, pinned provider, no MCP for now (DR-11).
- D-11 `checkpoint-api` is the source of truth; rules enforced by API; server computes groupings (DR-12 AD-1 to AD-4).
- D-12 Node stages plus Python store, schemas as contract (AD-5).
- D-13 Replace boundary blob with per-item tables, keep finalize/freeze/edit log (AD-6).
- D-14 S1/S2 account rule as default for network plumbing. Status `proposed` until the analyst confirms.
- D-15 Web and vehicle Item Definition variants never blend.
- D-16 Terminology: this tool uses Non-repudiation (NR) in CIAAAN; the reference workbook's "Auditing" maps to NR.
- D-17 Governance: which document is current (`.meta/CLAUDE.md` or `.meta/WORKFLOW.md`) and who implements (Claude Code, Codex or Qwen). Status `proposed`; filled in at the gate.
**Acceptance:** every DR section is covered by at least one decision; no decision contradicts another.
**HUMAN GATE:** analyst confirms D-14 and D-17.
**Commit:** `docs: decisions log`

---

#### A4. Glossary update
**Read first:** root `CONTEXT.md`, DR-1 to DR-5.
**Do:** Update the root `CONTEXT.md` glossary (keep its format: term, definition, "Avoid" line):
1. Replace the Input Normalization definition: reading every client document once and turning it into facts with sources and a document register; it is Stage 01 and is followed by CP0. Remove "performed together with Item Definition as a single step".
2. Add terms: **Fact**, **Document register**, **Source reference**, **CP0 / Reading review**, **CP1 / Item Definition review** (rename the existing "Item Definition review" entry to include CP1), **Open question**, **Fact type**, **Scope decision**, **Analyst decision**, **Element**, **Container**, **Zone**, **Link (data flow / exposure)**, **Asset Identification**, **Needs you / Single source / Agreed**.
3. Update "Relationships": the new flow and the "no re-reading after CP0" rule.
4. Update "Flagged ambiguities": record that Input Normalization and Item Definition were once one step and are now separated by CP0.
**Acceptance:** no remaining statement that the two stages run as one step; every new term has an "Avoid" line.
**Commit:** `docs: glossary for CP0 and staged item definition`

---

#### A5. Governance consistency
**Read first:** `.meta/CLAUDE.md`, `.meta/WORKFLOW.md`, `Agents/**`, decision D-17.
**Do:** Apply the analyst's D-17 decision:
1. Make one workflow document current. Supersede the other per R6.
2. Make the spec location consistent (`.meta/specs/` unless D-17 says otherwise).
3. Update the file ownership table in `.meta/CLAUDE.md` for the new stage folders (01, 02, 03 and the renumbered later stages).
**Acceptance:** exactly one current workflow document; all spec paths in it resolve to existing folders.
**Commit:** `docs: align governance with rebuild`

---

#### A6. Restructure the web stages
**Read first:** DR-1, R2, R7, `.meta/STALE-INVENTORY.md`.
**Do:**
1. Renumber `tara-workspace/web-based-tara/stages/` with `git mv`:
   - `01-input-normalization` keeps its name but gets the new meaning (content rewritten in A7). Move the old `agent.js` to `01-input-normalization/legacy/agent.csv-mode.js` and mark it superseded in a header comment.
   - Create `02-item-definition/` and move `tara-workspace/stages/01-item-definition/agent.js` to `02-item-definition/legacy/agent.v1.js` (reference only, not wired). Remove the now-empty `tara-workspace/stages/` folder.
   - Create `03-asset-identification/` (empty `CONTEXT.md` placeholder and `output/.gitkeep`).
   - Renumber existing stages: `02-damage-analysis` -> `04-damage-analysis`, `03-threat-identification` -> `05-threat-identification`, `04-attack-path-modelling` -> `06-attack-path-modelling`, `05-impact-analysis` -> `07-impact-analysis`, `06-risk-scoring` -> `08-risk-scoring`, `07-risk-treatment` -> `09-risk-treatment`, `08-residual-risk` -> `10-residual-risk`.
2. Update every path reference found in A1 (agents, `agent-utils.js`, tests, `scripts/*.js`, `checkpoint-api/checkpoint_api/pipeline_runner.py`, schemas `$id`s if they contain paths). Rename schema files to match: `stage-01-asset-register.schema.json` -> `stage-03-asset-register.schema.json`, `stage-02-...` -> `stage-04-...`, and so on; update `tests/fixtures/valid|invalid` names and `tests/helpers/schema-validation.js` accordingly.
3. Stage 04 (damage) now reads `asset-register.json` from Stage 03. Update its input path only; do not change its logic.
4. Update the orchestrator header comment in `orchestrator/run-web-tara.js` to list the new sequence. Do not implement the orchestrator.
**Do not:** change any prompt text or agent logic beyond paths.
**Acceptance:** `npm test` and `pytest` pass (or the analyst-approved list of retired tests is documented); `grep` for old stage folder names returns only superseded files and history docs.
**Commit:** `refactor: renumber web stages for CP0 and staged item definition`

---

#### A7. Rewrite Layer 0, Layer 1 and Layer 2 docs for stages 01 to 03
**Read first:** DR-1 to DR-9, DR-13 to DR-15, `.meta/CLAUDE.md` Layer rules.
**Do:**
1. `tara-workspace/web-based-tara/CLAUDE.md` (Layer 0): update identity and stage list; add the rules: no re-reading after CP0; analyst-only confirmation; plain-language output; sources on every fact; OpenRouter via `llm-client.js` only.
2. `tara-workspace/web-based-tara/CONTEXT.md` (Layer 1): new routing table with columns Stage, Dir, Type, Input, Output, Checkpoint:
   - 01 Input Normalization: AI plus deterministic reconciliation; input = client documents plus boundary statement; output = `document-register.json`, `facts.json`; checkpoint CP0.
   - 02 Item Definition: AI plus deterministic grouping; input = CP0-confirmed facts and answers (from API); output = `item-definition.json`, `questions.json`; checkpoint CP1.
   - 03 Asset Identification: AI; input = finalized Item Definition (from API); output = `asset-register.json`; checkpoint light review.
   - 04 to 10: existing stages with new numbers.
   Update the Layer 3 loading map (01: `source-precedence.md`, `analyst-language.md`; 02: `element-kinds.md`, `scoping-facts.md`, `analyst-language.md`; 03: `web-asset-types.md`, `ciaaan-properties.md`) Leave the ID conventions table as it is for now, with a note that it is replaced in task B1, step 2, where the new ID conventions are defined.
3. Rewrite `stages/01-input-normalization/CONTEXT.md`, `stages/02-item-definition/CONTEXT.md`, `stages/03-asset-identification/CONTEXT.md` (Layer 2). Each: Purpose, Input, Output, Process, Rules the API enforces (so the model knows them), Checkpoint, What the next stage receives. Stage 03 may be brief and marked "spec pending (C12)".
4. Update `tara-workspace/CONTEXT.md` (Layer 1 dispatcher) only where it mentions stage names.
**Do not:** write prompts yet; the Layer 2 files describe behaviour, the prompt text comes with the agent tasks.
**Acceptance:** routing table matches DR-1 exactly; every rule in DR-2, DR-3, DR-8, DR-9 is reflected in the stage 01 or 02 `CONTEXT.md`; no statement contradicts `.meta/DECISIONS.md`.
**Commit:** `docs: layer 0-2 docs for stages 01-03`

---

### Phase B. Design on paper before building

---

#### B1. Data contract specs and schemas
**Read first:** DR-3 to DR-8, DR-13, DR-14, R8.
**Do:**
1. Write specs (split to respect the size limit):
   - `.meta/specs/12a-document-register-and-facts.md`
   - `.meta/specs/12b-item-definition-model.md`
   - `.meta/specs/12c-questions-scope-and-analyst-decisions.md`
   - `.meta/specs/12d-refusal-rules.md`
2. ID conventions (add to `web-based-tara/CONTEXT.md` ID table): `DOC-##` documents, `FCT-###` facts, `CNF-###` conflicts, `CTR-##` containers, `ZN-##` zones, `EL-###` elements, `IF-##` links, `FN-###` functions, `Q-###` questions, `SD-###` scope decisions, `AD-###` analyst decisions, `ASM-##` assumptions.
3. Entities and fields (minimum):
   - Document: id, title, client doc id/version as printed, date on document, date received, author/owner (client, supplier, assessor), environment described (prod/staging/dev/unknown), type (diagram, Q&A, functional, API spec, infra, manual, config export, SRS, asset list, other), SHA-256 hash, read status (parsed/partial/failed) plus reason, precedence rank, used for (text), ignored and why (text).
   - Source reference: document id, location (page, sheet, section, or diagram region), quote (short snippet).
   - Fact: id, subject (what the fact is about, free text plus optional element id once known), fact type (component exists, link exists, attribute, function, actor, assumption stated, control stated, absence stated, data, environment, responsibility, legal context, constraint, client requirement), value, source references (one or more), confidence (high/medium/low), group (agreed/single_source/needs_you, server-computed), status (proposed/confirmed/rejected/overridden).
   - Conflict: id, fact ids involved, kind (from DR-8), proposed resolution, auto-resolved flag, loser kept.
   - Container, Zone, Element (DR-13 attributes), Link (DR-14 attributes), Function (FN-###: name, plain description, actors, elements involved, endpoints, data read, data written, privileged, sources).
   - Question: id, element id, fact type (FT-01..07 or generic), text (plain), why it matters, default if unanswered, origin (starter/generated), answer, answered by (analyst/client), status (open/answered/sent_to_client/dropped_answered_by_docs).
   - Scope decision: id, element id, status (in_scope/interface/out_of_scope/ambiguous), plain reason, based on (question ids, fact ids), assumed flag.
   - Analyst decision: id, target (any entity id), action, before, after, rationale, actor, timestamp, locked.
   - Checkpoint: assessment id, kind (CP0/CP1), version, status (open/confirmed), confirmed by, confirmed at.
4. Refusal rules (spec 12d), each with an error message in plain words:
   - fact without at least one source reference;
   - source reference to a document not in the register;
   - element without at least one supporting fact;
   - link whose source or destination element does not exist;
   - question without element id and fact type, or duplicate (element id, fact type);
   - more than the per-element question cap;
   - scope decision without a reason;
   - any confirm call by a non-analyst role;
   - confirm while "Needs you" items are unanswered (unless marked sent to client);
   - any write to a confirmed checkpoint version (409);
   - Stage 02 writes that reference a fact not confirmed at CP0.
5. Create JSON schemas in `src/schemas/`: `stage-01-document-register.schema.json`, `stage-01-facts.schema.json`, `stage-02-item-definition.schema.json`, `stage-02-questions.schema.json`. Add valid and invalid fixtures in `tests/fixtures/` (synthetic only) and schema tests in `tests/schemas.test.js`.
**Acceptance:** schema tests pass; each refusal rule has an invalid fixture or an API test planned in C3; the analyst can hand-write a CP0 and a CP1 using only these fields (checked in B4 and B6, the CP0 and CP1 paper prototypes).
**HUMAN GATE:** analyst reviews the specs.
**Commit:** `spec: item definition data contract and schemas`

---

#### B2. Layer 3 config files
**Read first:** DR-6 to DR-8, DR-13, DR-14, DR-2.
**Do:** Create in `tara-workspace/web-based-tara/_config/`:
1. `scoping-facts.md`: fact types FT-01 to FT-07, triggers per element kind (which fact types each kind needs), question templates per fact type with placeholders, answer-to-decision mapping (the DR-7 mapping table), default when unanswered, unknown-kind rule. Header: "INTERNAL. Never quote or paraphrase rule IDs or this file to the analyst."
2. `element-kinds.md`: DR-13 containers, kinds, granularity rules with "too fine" and "too coarse" examples, required attributes, actor set, data categories.
3. `link-model.md`: DR-14.
4. `source-precedence.md`: DR-8 plus DR-9.
5. `analyst-language.md`: DR-2 writing rules, the four-part card format, three worked card examples (synthetic), and a list of banned phrasings (rule IDs, "as per rule", scores, speculative words like "may", "could", "potentially" when stating a conclusion).
6. `models.json` placeholder (filled in C1): stage -> {model, provider, temperature, max_tokens, prompt_version}.
**Acceptance:** every S rule appears in `scoping-facts.md` mapping; every element kind in `element-kinds.md` has at least one trigger in `scoping-facts.md` or is marked "no scoping question needed" with a reason.
**Commit:** `config: layer 3 files for stages 01 and 02`

---

#### B3. Synthetic reference item #1
**Read first:** DR-10, DR-9, DR-13, DR-14, B1 specs.
**Do:** Create `tests/fixtures/synthetic/item-01/` for a fictional "key and certificate management portal" on a public cloud, built only from public knowledge. Pattern to reproduce: **the diagram contradicts the written answers**.
1. `inputs/boundary.txt`: one-sentence boundary statement.
2. `inputs/architecture.drawio` and an exported `architecture.png`: one page, about 20 to 25 icons, managed services drawn as a sidebar with one generic arrow, unlabelled arrows, one visual grouping box that is not a real subnet.
3. `inputs/client-answers.md`: a Q&A document. It must state that an API gateway is the only public entry, while the diagram shows an internet-facing load balancer as well. It must describe a `-dev` environment while the diagram title implies production.
4. `inputs/functional.md`: 8 to 12 functions with actors and data.
5. Planted difficulties (list them in `README.md`): at least one component in text but not in the diagram; one in the diagram but not in text; one stated absence ("no WAF"); one shared company IdP; one managed key service with a customer key policy; one secrets store; one third-party notification service; one CI/CD path; one unanswerable fact that must become a question.
6. `expected/`: `document-register.json`, `facts.json`, `conflicts.json`, `item-definition.json`, `questions.json`, `scope-decisions.json`, and `match-map.json` (stub, filled at scoring time).
**Acceptance:** all expected files validate against B1 schemas; every planted difficulty is represented in the expected output.
**HUMAN GATE:** the analyst reviews and corrects every expected file. The expected output is ground truth only after analyst approval. Record approval in `README.md` with the date.
**Commit:** `test: synthetic reference item 01`

---

#### B4. CP0 paper prototype
**Read first:** DR-2 to DR-4, DR-8, `_config/analyst-language.md`, item-01.
**Do:**
1. Write `.meta/prototypes/cp0-item-01.md`: exactly what CP0 would show for item-01, as if the agent had produced it: system summary, document register view, failed reads, conflicts, gaps, three groups with counts, every "Needs you" card in the four-part format, the spot-check items, and the confirm-blocking message.
2. Write `.meta/prototypes/cp0-test-script.md`: instructions for a colleague reviewing it cold (no briefing), and a findings table: card id, confusion, "why?" asked, override, time spent.
**Acceptance:** 10 to 25 "Needs you" cards; every card traces to facts in `expected/facts.json`; no rule IDs or internal labels in the text; no em dashes.
**HUMAN GATE:** the analyst runs the test with a colleague and fills `.meta/prototypes/cp0-findings-round-1.md`. Claude Code then revises the prototype from the findings. Repeat until the analyst declares it approved. Record each round.
**Commit:** `design: CP0 paper prototype round <n>`

---

#### B5. CP0 spec
**Read first:** approved CP0 prototype and findings.
**Do:** Write `.meta/specs/13-cp0-reading-review.md` (split if needed): screen sections, data each section needs (by B1 entity), grouping and spot-check logic (server-side), card format, analyst actions (answer, accept group, open item, mark sent to client, attach document, ask why), confirm conditions, API endpoints needed.
**Acceptance:** everything in the approved prototype is covered; nothing in the spec is absent from the prototype without a reason.
**Commit:** `spec: CP0 reading review`

---

#### B6. CP1 paper prototype and spec
**Read first:** DR-5, DR-7, approved CP0 spec, item-01 expected Item Definition.
**Do:** Same method as B4 and B5 for CP1: `.meta/prototypes/cp1-item-01.md`, test script, findings rounds, then `.meta/specs/14-cp1-item-definition-review.md`. Include how scope decisions and reasons read, how the boundary statement proposal reads, the Data Flow Inventory table, the re-run diff view, and the Excel and diagram exports.
**Acceptance:** as B4 and B5.
**HUMAN GATE:** as B4.
**Commit:** `design: CP1 paper prototype round <n>` and `spec: CP1 item definition review`

---

#### B7. Evaluation spec and scorer
**Read first:** DR-16, item-01.
**Do:**
1. `.meta/specs/15-evaluation.md`: how a run is scored against an item, how the match map is made, the four metrics and their targets, and the secondary tracking (cards per run, overrides, "why?" requests).
2. `scripts/score-item-definition.js`: inputs = produced output folder, expected folder, match map; output = metrics JSON plus a readable summary in `stages/02-item-definition/output/score-<date>.md`.
3. Test it by scoring a deliberately imperfect hand-made output (commit it under `tests/fixtures/synthetic/item-01/sample-imperfect-run/`) and asserting known metric values in `tests/engines/score-item-definition.test.js`.
**Acceptance:** scorer test passes; scoring a run takes under 15 minutes including the match map.
**Commit:** `feat: item definition evaluation scorer`

---

### Phase C. Build, one stage at a time

---

#### C1. Model configuration and provider pinning
**Read first:** DR-11, `llm-client.js`.
**Do:**
1. Change the default provider in `llm-client.js` to `openrouter`. Keep the other providers working for backwards compatibility but mark them "not used in the rebuild".
2. Read model settings per stage from `_config/models.json`.
3. Support OpenRouter provider pinning (request field for provider preferences with fallbacks disabled). Check OpenRouter's current documentation for the exact field names before implementing; do not guess them.
4. Every call writes an audit record: timestamp, stage, model, provider actually used (from the response, if returned), prompt version, token counts, request id.
5. Replace the free-tier default model with a placeholder that fails loudly if `models.json` is not filled.
**Acceptance:** unit test proves the pinned provider and model are sent; audit record written; running without `models.json` gives a clear error.
**Commit:** `feat: pinned OpenRouter models per stage`

---

#### C2. Model trial (Stage 01 extraction only)
**Read first:** DR-11, B1, B7, item-01.
**Do:**
1. Write a minimal Stage 01 per-document extraction prompt in `stages/01-input-normalization/prompts/extract-v1.md` (facts with source references only; no reconciliation).
2. `scripts/model-trial.js`: for each candidate model in a list the analyst provides (open-weight, self-hostable size), run extraction on item-01, score facts against expected facts (recall and no-hallucination precision on facts), record cost and latency.
3. Test image reading separately on item-01's PNG diagram (DR-17): element recall from the image alone and arrow correctness. If the best text model cannot read images, pick a second, image-capable model and pin both.
4. Write `.meta/model-trial-results.md`: a table per model with the scores, cost, latency, and 3 examples of typical errors.
**HUMAN GATE:** the analyst provides the candidate list before the run, and picks the model after it. Record the choice as a decision in `.meta/DECISIONS.md` and in `_config/models.json`.
**Commit:** `chore: stage 01 model trial`

---

#### C3. API data layer (per-item tables and refusals)
**Read first:** DR-12, B1 specs, spec 12d, existing `checkpoint-api`.
**Do:**
1. Add SQLAlchemy models for every B1 entity. Keep existing models; do not drop `BoundaryState` yet.
2. Implement write endpoints with the refusal rules from spec 12d. Error messages exactly as written in the spec.
3. Implement a bulk seed endpoint per stage that validates item by item and returns accepted ids plus refused items with reasons (partial acceptance is allowed; nothing refused is stored).
4. Role check: add an `analyst` role; confirm endpoints require it; model-facing service tokens never have it.
5. Tests: one test per refusal rule, plus seed partial-acceptance, plus role enforcement. Existing 12 tests must still pass.
**Acceptance:** all tests pass; every refusal rule in spec 12d has a test.
**Commit:** `feat: item definition store with refusal rules`

---

#### C4. Stage 01 agent: per-document extraction and document register
**Read first:** DR-4, DR-8, DR-9, stage 01 `CONTEXT.md`, C2 result.
**Do:**
1. `stages/01-input-normalization/agent.js`: check minimum input (DR-9) first; implement the deterministic parsers and the image path from DR-17 before any model extraction; build the document register (hash, type detection, environment, read status); extract facts per document with the chosen model; one call per document (split large documents by page range with overlap, keep page references); write `output/document-register.json`, `output/facts.raw.json`.
2. Add a redaction hook (no-op by default, config switch) that runs before any content leaves the machine: account IDs, hostnames, bucket names, IPs, personal names, with a reversible mapping stored locally.
3. Seed the register and raw facts through the C3 seed endpoint; log refused items.
**Acceptance:** on item-01, fact recall and precision meet the C2 numbers for the chosen model; no fact without a source reaches the API; partial-failure path tested with an unreadable file.
**Commit:** `feat: stage 01 extraction and document register`

---

#### C5. Reconciliation and grouping engine (deterministic)
**Read first:** DR-3, DR-8, spec 12a.
**Do:**
1. `tara-workspace/web-based-tara/_engines/fact-reconcile.js`: match facts that describe the same thing (normalised names plus a small synonym table in `_config/element-kinds.md`; a model call is allowed only for semantic matching of leftovers, recorded in audit); detect conflicts; apply precedence; auto-resolve only the DR-8 auto list; compute groups agreed/single_source/needs_you; pick spot-check items.
2. Server exposes the grouped view (the grouping is computed in the API from stored facts, reusing the same rules; the engine is used by the pipeline and by tests).
3. Tests with item-01: expected conflicts found; the ingress conflict and environment conflict land in "Needs you".
**Acceptance:** tests pass; "Needs you" count on item-01 within 10 to 25.
**Commit:** `feat: fact reconciliation and grouping engine`

---

#### C6. CP0 API endpoints
**Read first:** spec 13.
**Do:** Endpoints for: grouped view, card detail with sources, answer card, accept group, mark sent to client, spot-check result (wrong reopens the "Agreed" group), attach document and re-run stage 01, ask why (returns stored reasons and sources only), export client questions, confirm (analyst only, blocked per spec). Versioning: confirm freezes the version.
**Acceptance:** tests for each endpoint including every blocked-confirm case.
**Commit:** `feat: CP0 endpoints`

---

#### C7. CP0 screen
**Read first:** spec 13, approved CP0 prototype, `frontend/src/components/workspace/BoundaryReview.tsx` pattern.
**Do:** Build `frontend/src/components/workspace/ReadingReview.tsx` as a functional screen matching the approved prototype, nothing more. Wire to C6 endpoints through `frontend/src/lib/api.ts`. Add it to the workspace stage tabs before Item Definition. Review assistant ("why?") uses the C6 endpoint only.
**Do not:** add canvas, animations or features not in the prototype.
**Acceptance:** `tsc --noEmit` clean, `npm run build` succeeds, manual walk-through of item-01 CP0 end to end recorded in `.meta/REBUILD-PROGRESS.md`.
**Commit:** `feat: CP0 reading review screen`

---

#### C8. Stage 02 agent: Item Definition, questions and scope
**Read first:** DR-5 to DR-7, DR-13, DR-14, stage 02 `CONTEXT.md`, `_config/scoping-facts.md`, `_config/element-kinds.md`, `_config/link-model.md`.
**Do:**
1. Input: CP0-confirmed facts and answers from the API only. Never read client documents.
2. Build containers, zones, elements, links, functions, assumptions, responsibility split, stated controls and absences, stakeholders, proposed boundary statement (if the analyst left it blank).
3. Questions: take starter fact types triggered per element kind; ask a thinking model for additional questions per element; send each question through a separate answer-checker call against confirmed facts; drop answered ones; dedupe and cap (server also enforces).
4. Scope: apply the internal mapping only when the needed facts are known; otherwise propose the default and mark it "assumed" with the linked question.
5. Log unknown element kinds to `output/new-kinds.log`.
6. Seed through the API; log refusals.
**Acceptance (on item-01 via B7 scorer):** element recall >= 80%, no-hallucination precision >= 95%, scope agreement >= 85%, link correctness >= 70%; no question without element id and fact type; no rule IDs in any analyst-facing text.
**Commit:** `feat: stage 02 item definition with generated questions`

---

#### C9. CP1 endpoints and screen
**Read first:** spec 14, approved CP1 prototype, existing `routers/boundary.py`.
**Do:**
1. Endpoints per spec 14, reusing the finalize/freeze/edit-log behaviour from the boundary router, now over per-item tables.
2. Re-run creates a new version; analyst overrides re-applied; diff endpoint.
3. Screen `frontend/src/components/workspace/ItemDefinitionReview.tsx` per the approved prototype; replace the `BoundaryReview` usage in `ItemDefinition.tsx`.
4. After this task passes, mark the old boundary blob endpoints superseded (do not delete until C14).
**Acceptance:** tests for finalize, freeze (409), override re-application, diff; manual walk-through of item-01 CP1.
**Commit:** `feat: CP1 item definition review`

---

#### C10. Exports
**Read first:** spec 14 export section.
**Do:**
1. Excel export in the reference layout: an "Assumptions & Scope" sheet (general assumptions; scope with IN SCOPE, OUT OF SCOPE, BOUNDARY blocks) and an "Item Definition" sheet (Step 1 diagram placeholder, Step 2 Data Flow Inventory with columns DATA SOURCE, DATA DESTINATION, INTERFACE, PROTOCOL, USAGE/FUNCTION AT DESTINATION, DETAILS, Remark; Step 3 asset table left empty until Stage 03).
2. draw.io export of the zone diagram: nested containers, elements inside zones, links labelled with IF-## ids.
**Acceptance:** export of item-01 opens cleanly; every IF-## in the Excel appears in the diagram.
**Commit:** `feat: item definition exports`

---

#### C11. Synthetic items #2 and #3 and re-evaluation
**Read first:** DR-10, B3.
**Do:** Create `item-02` (no diagram: infrastructure sizing table, API specification, user manual) and `item-03` (configuration export only), same structure as item-01. Run stages 01 and 02 on all three items and score them.
**HUMAN GATE:** analyst approves the expected outputs of items 02 and 03 before scoring.
**Acceptance:** results table for all three items in `.meta/model-trial-results.md` (or a new `.meta/evaluation-results.md`); regressions on item-01 explained.
**Commit:** `test: synthetic items 02 and 03 and evaluation`

---

#### C12. Stage 03 Asset Identification
**Read first:** DR-15, `.meta/web-item-definition-questions.md` answers G1 to G4.
**Do:**
1. Spec `.meta/specs/16-asset-identification.md` first (HUMAN GATE on the spec).
2. Agent: input is the finalized Item Definition from the API only. Derive assets per DR-15 with a plain reason per asset and per CIAAAN property; output `asset-register.json` valid against `stage-03-asset-register.schema.json` (extend the schema with source element id, reason fields and asset prefix scheme if the spec requires).
3. Light review endpoint and screen for the asset list; full review for the CIAAAN column (every property shows its reason).
**Acceptance:** on item-01, every in-scope element produces zero or more assets with reasons; no asset from an out-of-scope element; the CIAAAN rule holds (tests for the Authorization vs Confidentiality case).
**Commit:** `feat: stage 03 asset identification`

---

#### C13. Reconnect downstream stages
**Read first:** A6 changes, stage 04 onwards `CONTEXT.md`.
**Do:** Point Stage 04 at the Stage 03 output from the API; update `scripts/validate-chain.js` and chain tests; run the full chain on item-01 with fixtures.
**Acceptance:** chain validation passes end to end on item-01.
**Commit:** `feat: connect downstream stages to new asset output`

---

#### C14. Retire legacy
**Read first:** `.meta/STALE-INVENTORY.md`.
**Do:** With analyst approval, delete the superseded boundary blob endpoints and model, the legacy CSV-mode Stage 01 agent (a client asset list is now just another document type in Stage 01), the legacy v1 Item Definition agent, and superseded docs the analyst marks for deletion. Update the inventory to show every row resolved.
**HUMAN GATE:** analyst approves the deletion list.
**Acceptance:** all tests pass; inventory fully resolved.
**Commit:** `chore: retire legacy flow`

---

## PART 4. Deliberately out of scope for this rebuild

Do not start any of these, even if they look easy:
- MCP server or MCP tools.
- Self-hosting models.
- Diagram canvas (React Flow or similar) beyond the functional screens.
- The vehicle Item Definition variant and the other TARA types.
- Changes to the logic of stages 04 to 10 (only paths and inputs change).
- Real client data anywhere in the repo.

## PART 5. Definition of done for the whole rebuild

- The flow in DR-1 runs end to end on three synthetic items.
- CP0 and CP1 are confirmed only by an analyst, and only when no "Needs you" card is open.
- Every fact, element, link, question and scope decision traces to a source or an analyst decision.
- Item-01 meets the DR-16 targets; items 02 and 03 have recorded scores.
- `.meta/DECISIONS.md`, the glossary, and all Layer 0 to 2 docs agree with each other and with the code.
- No client-derived material in the repo.
