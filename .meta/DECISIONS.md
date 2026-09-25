# Decisions Log

Every design decision for the rebuild, in one place. Source of detail: the Design Reference (DR) sections in `.meta/CLAUDE-CODE-INSTRUCTIONS.md`.

Status values: `accepted` (in force), `proposed` (waiting for the analyst).

| ID | Decision | Reason | Date | Status |
|---|---|---|---|---|
| D-01 | The web-based TARA flow is: Stage 01 Input Normalization, CP0 Reading review, Stage 02 Item Definition, CP1 Item Definition review, Stage 03 Asset Identification, then the existing stages renumbered from 04 (DR-1). | Reading documents, defining the item and identifying assets are different jobs. Separating them lets the analyst check each one before the next builds on it. | 2026-09-25 | accepted |
| D-02 | No stage after CP0 re-reads client documents. Stage 02 uses only CP0-confirmed facts and analyst answers. No stage after CP1 reads anything except the finalized Item Definition and later stage outputs (DR-1). | Documents are read once, so there is one agreed set of facts and no second reading that can disagree with the first. | 2026-09-25 | accepted |
| D-03 | The agent discusses, it does not hand over. It shows what it concluded, why and what it assumed. It never shows its internal method, rule IDs or scores. "Why?" answers come only from stored sources and decisions; if nothing is stored, it says the point is an open question (DR-2). | The analyst must be able to trust and challenge every conclusion without learning the tool's internals. | 2026-09-25 | accepted |
| D-04 | Review by exception. The server sorts every fact or proposal into Agreed, Single source and Needs you. Each Needs you card has four parts. The server picks 3 to 5 Agreed items as a spot check; one wrong item reopens the whole Agreed group. A checkpoint cannot be confirmed while a Needs you card is open, unless the analyst sends it to the client (DR-3). | Keeps review to 10 to 25 real questions per run while still catching silent errors in the easy items. | 2026-09-25 | accepted |
| D-05 | Scoping rules are internal defaults. The agent asks plain factual questions (fact types FT-01 to FT-07), maps the answers to scope decisions and shows each decision with a plain reason. Unanswered questions go to the client list and the default is marked "assumed" (DR-7). | Analysts answer facts about their system reliably; they should not have to learn or argue with scoping rules. | 2026-09-25 | accepted |
| D-06 | Question generation has three guards, all enforced by the server: every question names one element and one fact type; a separate call drops questions the documents already answer; duplicates are removed and each element has a cap (default 3). Questions go to the analyst first, then to the client (DR-6). | Stops the model from flooding the analyst with vague, repeated or already-answered questions. | 2026-09-25 | accepted |
| D-07 | Source precedence runs from analyst decision (highest) to analyst free text (lowest), as listed in DR-8. Internet exposure, environment, whether a component exists, ownership, entry-point authentication, and an older higher-precedence source are always escalated. Naming, sizes, counts and versions are auto-resolved with the loser kept (DR-8). | Conflicts that change the security picture need a human; cosmetic ones should not cost the analyst time. | 2026-09-25 | accepted |
| D-08 | Minimum input is a boundary statement, one document describing components and one describing behaviour. If a mandatory input is missing, the run stops and lists it. A diagram is optional. An unreadable file does not stop the run if the minimum is still met; it is marked failed and gets a resend question (DR-9). | Clear entry rules avoid half-built item definitions, while one bad file does not waste a whole run. | 2026-09-25 | accepted |
| D-09 | Data policy: the repo is public, so nothing client-derived goes into it. Past work is referred to only as TARA-1 to TARA-4, by input pattern. Evaluation items are synthetic. Real material is used only locally, with permission, in the git-ignored `/private-eval/` folder (DR-10). | Protects clients and the analyst legally while still letting the tool be tested on realistic patterns. | 2026-09-25 | accepted |
| D-10 | All model calls go through OpenRouter, using open-weight models of a size that could be self-hosted later. Model and provider are pinned per stage in `_config/models.json`, and every run records model, provider and prompt version. No MCP for now (DR-11). | Test results then carry over to a future self-hosted setup, and every result can be traced to the exact model that produced it. | 2026-09-25 | accepted |
| D-11 | `checkpoint-api` is the single source of truth for anything an analyst can see or change. Rules are enforced by the API per item and explained in the stage `CONTEXT.md` files. The server, not the model, computes groupings, counts, coverage and conflicts (DR-12, AD-1 to AD-4). | One store and server-side rules mean a model mistake is refused instead of silently saved. | 2026-09-25 | accepted |
| D-12 | Model-calling stages stay in Node; the store stays in Python. The JSON schemas in `src/schemas/` are the shared contract between them (AD-5). | Keeps the existing working code in each language and gives both sides one agreed format. | 2026-09-25 | accepted |
| D-13 | The boundary blob (`BoundaryState.merged_model`, `decisions`) is replaced by one table per kind of item. Finalize, freeze (409 after finalize) and the edit log are kept (AD-6). | The server cannot enforce rules on individual facts stored inside one JSON blob. | 2026-09-25 | accepted |
| D-14 | Network plumbing default (scoping rules S1 and S2): everything deployed in the cloud account(s) that host the item is inside the boundary, including load balancers, NAT and internet gateways and the container registry. Plumbing that only forwards traffic stays in scope as an element, but Asset Identification treats it as configuration only. Plumbing that acts on requests (authentication, filtering, TLS termination) is a full element. | Plumbing is part of the attack surface, so it must not disappear; but a forward-only NAT gateway should not produce the same asset rows as an API gateway. | 2026-09-25 | proposed |
| D-15 | The Web and Vehicle Item Definition variants never blend. A web TARA that touches vehicles models each vehicle-side counterpart as one external interactor (DR-1, S5, S14). | Prevents an item definition that mixes cloud and in-vehicle views, which neither TARA type can use. | 2026-09-25 | accepted |
| D-16 | Terminology: this tool uses Non-repudiation (NR) as the sixth CIAAAN property. Where the reference workbook says "Auditing", it maps to NR. | One name per property avoids two columns for the same thing. | 2026-09-25 | accepted |
| D-17 | Governance: `.meta/CLAUDE.md` is the current governance document and `.meta/specs/` is the only spec location. Claude Code writes specs and implements, following `.meta/CLAUDE-CODE-INSTRUCTIONS.md`. `.meta/WORKFLOW.md` (Claude and Qwen) and the Codex and Qwen protocol documents are superseded. | Proposed because the instructions document already has Claude Code implementing every task, and the Qwen workflow points to a spec folder that does not exist. The alternative is to keep Codex as implementer with Claude reviewing. | 2026-09-25 | proposed |
| D-18 | CP0 shows a system summary, the document register view, failed reads with a resend question, conflicts, gaps as questions, and the three groups (DR-4). | The analyst confirms what was read and how before anything is built on it. | 2026-09-25 | accepted |
| D-19 | CP1 shows the boundary statement (marked proposed if the agent wrote it), containers, zones, elements, links, trust boundaries, scope decisions with plain reasons, assumptions, responsibility split, stated controls and absences, stakeholders and open questions. Re-runs create a new version, analyst edits are locked overrides that are re-applied, and a diff is shown before acceptance (DR-5). | The analyst confirms scope and boundary in one place, and never loses an edit to a re-run. | 2026-09-25 | accepted |
| D-20 | Element model: containers (account, region, VPC, subnet, availability zone, namespace, cluster) are not elements; every element has one parent container; one element per independently deployed or configured unit; required attributes and data categories as in DR-13. | Right granularity is what makes scope decisions and later asset rows meaningful. | 2026-09-25 | accepted |
| D-21 | Link model: two link types (data flow and exposure), both with IF-## IDs and the mandatory attributes in DR-14. Authentication and encryption schemes are attributes, not protocols. The agent never invents a zone the documents do not show. | Links are where trust boundaries are crossed; they need the same rigour as elements. | 2026-09-25 | accepted |
| D-22 | Asset Identification rules: containers are never assets; `in_scope` produces all asset types, `interface` only the item's side, `out_of_scope` none. A missing entitlement check is Authorization, not Confidentiality, and no asset row may exist whose every consequence belongs to other rows (DR-15). | Prevents duplicate and mislabelled assets that would inflate every later stage. | 2026-09-25 | accepted |
| D-23 | Evaluation: every run is scored against a synthetic item with element recall (target 80% or more), no-hallucination precision (95% or more), scope agreement (85% or more) and link correctness (70% or more) (DR-16). | Replaces "the output feels moderate" with numbers that show whether a change helped. | 2026-09-25 | accepted |
| D-24 | Reading documents: source files (draw.io, Visio, Lucid exports, Excel, Word, config exports) are parsed directly without a model. Images and image-only PDF pages go to an image-capable model in two passes, cross-checked with OCR; image-read links are at most medium confidence. The register records the reading method per document and page (DR-17). | Parsing where possible is exact and cheap; images are where reading errors come from, so they get extra checks and lower confidence. | 2026-09-25 | accepted |
| D-25 | `vehicle_type` on assessments becomes optional. Applied in C3 (API) and C7 (frontend). | A web-based TARA has no vehicle type; forcing one invents data. Decided by the analyst at the A1 gate. | 2026-09-25 | accepted |
| D-26 | The workbooks in `frontend/database/` and `frontend/src/data/taraAssets.ts` stay in the repo. | The analyst confirmed they are open source. Decided at the A2 gate. | 2026-09-25 | accepted |

Entries D-01 to D-17 use the numbers given in the instructions. D-18 onwards are added so every Design Reference section is covered, plus decisions made at the A1 and A2 gates.

## Coverage check

| DR section | Covered by |
|---|---|
| DR-1 Flow | D-01, D-02, D-15 |
| DR-2 Discussion | D-03 |
| DR-3 Review by exception | D-04 |
| DR-4 CP0 content | D-18 |
| DR-5 CP1 content | D-19 |
| DR-6 Question generation | D-06 |
| DR-7 Scoping | D-05, D-14 |
| DR-8 Precedence | D-07 |
| DR-9 Minimum input | D-08 |
| DR-10 Data policy | D-09, D-26 |
| DR-11 Model policy | D-10 |
| DR-12 Architecture | D-11, D-12, D-13 |
| DR-13 Element model | D-20, D-25 |
| DR-14 Link model | D-21 |
| DR-15 Asset Identification | D-16, D-22 |
| DR-16 Evaluation | D-23 |
| DR-17 Reading documents | D-24 |
