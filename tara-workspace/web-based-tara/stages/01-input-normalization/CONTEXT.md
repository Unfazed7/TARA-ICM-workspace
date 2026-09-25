# Stage 01: Input Normalization (Layer 2)

**Type:** AI plus deterministic reconciliation
**Checkpoint:** CP0 Reading review (analyst only)
**Spec:** `.meta/specs/12a-document-register-and-facts.md` (written in B1)
**Load from `_config/`:** `source-precedence.md`, `analyst-language.md`

---

## Purpose

Read every client document once and turn it into facts, each with a source reference, plus a document register. This is the only stage that reads client documents. Nothing is built here: no elements, no scope, no assets.

## Input

- The client documents: diagrams, Q&A documents, functional documents, API specifications, infrastructure or sizing documents, user manuals, SRS, configuration exports, existing item definitions, asset lists.
- The analyst's boundary statement (or at least the item name plus one sentence).

## Output (Layer 4, raw machine output)

- `output/document-register.json`: one entry per document with title, version and date as printed, date received, owner, environment described (prod, staging, dev or unknown), type, SHA-256 hash, read status (parsed, partial or failed) with reason, precedence rank, what it was used for, and what was ignored and why. Reading method is recorded per document and per page.
- `output/facts.json`: one entry per fact with subject, fact type, value, one or more source references (document, location, short quote) and confidence.

The confirmed version of both lives in `checkpoint-api` once seeded.

## Process

1. **Check minimum input before anything else.** Required: a boundary statement (or item name plus one sentence); at least one document describing components (diagram, infrastructure or sizing document, configuration export, or an architecture section); at least one document describing behaviour (functional document, API specification, user manual, SRS or Q&A). If any is missing, stop and list exactly what is missing. A diagram is not mandatory; when there is none, record that in the register so Stage 02 marks every link "inferred from text".
2. **Build the document register.** Hash each file, detect its type and the environment it describes, record its read status.
3. **Read each document the cheapest reliable way.**
   - Parse source files directly, with no model: draw.io XML (decompress if needed), Visio page XML, Lucid exports, Excel sheets, Word text and tables, known configuration export formats.
   - PDFs: use the text layer first; pages with little or no text go to the image-capable model. Record the method per page.
   - PNG or JPEG diagrams, and diagram pages in PDFs, go to the image-capable model in two passes: first an inventory of labelled items with their regions, then containment and arrows.
   - Cross-check image-read labels with OCR. Image-read links get confidence no higher than medium. Unclear endpoints and unlabelled icons become questions, not facts.
   - A drawn box is a zone only if it is labelled as one or confirmed by text. Managed services drawn as a sidebar with one generic arrow produce no per-service links.
4. **Extract facts per document**, one model call per document (large documents split by page range with overlap, keeping page references). Every fact carries at least one source reference.
5. **If one file cannot be read but the minimum is still met,** continue. Mark the file "failed" with the reason in the register, show it at CP0, and add a resend question.
6. **Reconcile** (deterministic engine, `_engines/fact-reconcile.js`, built in C5): match facts that describe the same thing, detect conflicts, apply source precedence, and group everything for CP0.

## Source precedence (highest wins)

1. Analyst decision at a checkpoint
2. Cloud configuration export
3. Written client answers (newest first)
4. Existing client item definition
5. Architecture diagram
6. Infrastructure or sizing document
7. Functional documentation, SRS, API specification
8. User manual
9. Analyst free text

**Always sent to the analyst, never auto-resolved:** internet exposure or ingress path; which environment a document describes; whether a component exists; who owns or operates a component; the authentication mechanism on an entry point; a higher-precedence source that is older than the lower one.

**Auto-resolved, with the losing value kept in the conflict log:** naming differences, instance sizes, counts, versions.

## Rules the API enforces

The API refuses, item by item, and says why:
- a fact without at least one source reference;
- a source reference to a document that is not in the register;
- any confirm call that does not come from the analyst;
- confirming CP0 while a "Needs you" card is unanswered (unless the analyst marked it "send to client");
- any write to a confirmed CP0 version.

The server, not the model, computes groups, counts, coverage and conflicts.

## Checkpoint: CP0 Reading review

Review by exception. The server sorts every fact into three groups:

| Group | Contents | Analyst action |
|---|---|---|
| Agreed | Stated by two or more documents with no conflict | None required; shown collapsed as a count |
| Single source | Stated by one document only | Skim; accept all with one click, or open any item |
| Needs you | Conflicts, gaps, assumptions, low-confidence reads | Must answer each card |

- Target: 10 to 25 "Needs you" cards. If more than about 20% of elements would be flagged, the run reports that the documents are too weak and produces the client question list instead.
- Every "Needs you" card has four parts: **What I concluded** (or both options for a conflict), **Why** (sources with a short quote), **What I assumed** (the default if unanswered), **What would change it** (the one fact that would flip it).
- Spot check: the server picks 3 to 5 random "Agreed" items for the analyst to verify. If any is wrong, the whole "Agreed" group is reopened.
- CP0 also shows a one-paragraph summary of the system as understood, the document register view, failed or partial reads with a resend question each, and gaps as questions.

**Writing to the analyst:** conclusion first, then reason, then source. One idea per sentence. One question per card. No rule IDs, scores or internal labels. When the analyst asks "why?", answer only from stored sources and decisions; if nothing is stored, say it is an open question.

## What the next stage receives

Stage 02 receives, from the API, only the facts confirmed at CP0 and the analyst's answers and decisions. It never receives or re-reads client documents.
