# Spec 12a: Document Register and Facts (Stage 01)

**Status:** Draft for analyst review (B1 gate)
**Schemas:** `src/schemas/stage-01-document-register.schema.json`, `src/schemas/stage-01-facts.schema.json`
**Decisions:** D-02, D-07, D-08, D-24

## Goal

Define what Stage 01 records about each client document and each fact read from it, so every later statement traces back to a document location and quote.

## Success Criteria

```bash
node --test tests/schemas.test.js   # valid Stage 01 fixtures pass, invalid ones fail
```

## File Ownership

WILL touch: the two schemas above, their fixtures in `tests/fixtures/valid|invalid/stage-01-*`, `tests/schemas.test.js`.
WON'T touch: agents, API code (C3, C4).

## Input/Output

- **Document** (`DOC-##`): title, client doc reference and version as printed, date on document, date received, owner (client, supplier, assessor), environment described (prod, staging, dev, unknown), type, SHA-256 hash, read status (parsed, partial, failed) with reason, reading method (parsed, text layer, image model, mixed) with per-page methods for PDFs, unread parts, reader version, precedence rank (2 to 9, from D-07), used for, ignored and why.
- **Source reference:** document id, location (page, sheet, section or diagram region), short quote (at most 300 characters).
- **Fact** (`FCT-###`): subject, optional element id (added once Stage 02 exists), fact type, value, one or more source references, confidence (high, medium, low), group (agreed, single source, needs you; set by the server), status (proposed, confirmed, rejected, overridden).
- **Conflict** (`CNF-###`): the facts involved (two or more), kind, proposed resolution, auto-resolved flag, losing facts kept.

## Process

1. Stage 01 writes one Document per file and one Fact per statement, each Fact with its source references.
2. The reconciliation engine (C5) writes Conflicts and proposes groups; the server recomputes groups itself (D-13).
3. At CP0 the analyst confirms, rejects or overrides facts; only `confirmed` facts reach Stage 02.

## Validation Rules

1. A fact has at least one source reference.
2. A partial or failed read has a reason.
3. A conflict is auto-resolved only for naming, instance size, count or version, and then keeps at least one losing fact.
4. Conflicts about internet exposure, environment, component existence, ownership, entry-point authentication, or an older higher-precedence source are never auto-resolved.
5. IDs are unique within their list; a file hash appears once.

## Error Conditions

Refusals and their messages are in spec 12d (R-01, R-02).

## Verification Steps

```bash
node --test tests/schemas.test.js
node scripts/validate-all.js tests/fixtures/valid   # existing fixtures unaffected
```
