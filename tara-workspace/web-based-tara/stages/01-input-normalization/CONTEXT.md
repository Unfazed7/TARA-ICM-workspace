# Stage 01: Input Normalization (Layer 2)

**Type:** AI plus deterministic reconciliation
**Review:** Rationale section on the stage page, never blocking (D-36, D-37)
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

- `output/rationale.json`: one item per conflict, ambiguity, gap and assumption (see Rationale below).

The stored version lives in `checkpoint-api` once seeded.

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
5. **If one file cannot be read but the minimum is still met,** continue. Mark the file "failed" with the reason in the register, list it in the Rationale, and add a resend question.
6. **Reconcile** (deterministic engine, `_engines/fact-reconcile.js`, built in C5): match facts that describe the same thing, detect conflicts, apply source precedence, label each fact Agreed, Single source or Needs you, and write a Rationale item for every conflict.

## Source precedence (highest wins)

Each document gets the rank for its type (table in spec 12a); the analyst can change a document's rank later, as a recorded analyst decision. Within a rank, the newer document wins (date on the document, else date received).

1. Analyst decision (recorded on a stage page)
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

**Conflicts that fit none of the named kinds** are recorded as `other` with a short description of what disagrees. They are never auto-resolved and are logged to `output/new-conflict-kinds.log` for human review. A document of type `other` needs a short label.

## Rules the API enforces

The API refuses, item by item, and says why:
- a fact without at least one source reference;
- a source reference to a document that is not in the register;

The server, not the model, computes groups, counts, coverage and conflicts.

## Rationale (D-37)

The pipeline never waits for the analyst. Instead, every point where the agent had to judge goes into `output/rationale.json`, shown on the Input Normalization page below the output:

| Kind | When |
|---|---|
| `conflict` | Two documents disagree. Auto-resolved kinds (naming, sizes, counts, versions) are listed too, marked auto-resolved |
| `ambiguity` | A read that can mean two things: an unclear label, an arrow whose end is unclear, a low-confidence image read |
| `gap` | Something the documents should say but do not, including a failed read (with a request to resend the file) |
| `assumption` | A default the stage applied to keep going |

Each item has the four parts: **What I concluded** (or both options for a conflict), **Why** (sources with a short quote), **What I assumed** (the default applied), **What would change it**. It also lists the ids it affects and a review status the analyst sets whenever they like: `unreviewed`, `confirmed`, or `disputed` with a note. A dispute is recorded; nothing re-runs.

Defaults when sources disagree follow `_config/source-precedence.md` (higher rank wins; disputed internet exposure assumes the more exposed option, D-33). The exact default per conflict kind is fixed in the Rationale spec (task B5).

The groups Agreed, Single source and Needs you are kept as labels to order the list: Needs you items first. The page above the Rationale shows a one-paragraph summary of the system as understood, the document register and the facts.

**Writing in the Rationale:** conclusion first, then reason, then source. One idea per sentence. No rule IDs, scores or internal labels. When the analyst asks "why?", answer only from stored sources and decisions; if nothing is stored, say it is an open question.

## What the next stage receives

Stage 02 starts automatically when Stage 01 finishes (D-36). It receives, from the API, the Stage 01 facts that are not rejected, the conflicts with the defaults applied, and any analyst decisions recorded so far. It never receives or re-reads client documents.
