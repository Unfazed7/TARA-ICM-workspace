# Spec 12a: Document Register and Facts (Stage 01)

**Status:** Revised after analyst review round 1 (B1 gate)
**Schemas:** `src/schemas/stage-01-document-register.schema.json`, `src/schemas/stage-01-facts.schema.json`
**Decisions:** D-02, D-07, D-08, D-24

## Goal

Define what Stage 01 records per document and per fact, so every statement traces to a document location and quote.

## Success Criteria

```bash
node --test tests/schemas.test.js   # valid Stage 01 fixtures pass, invalid ones fail
```

## File Ownership

WILL touch: the two schemas, `tests/fixtures/valid|invalid/stage-01-*`, `tests/schemas.test.js`. WON'T touch: agents, API (C3, C4).

## Input/Output

- **Document** (`DOC-##`): title, client reference as printed, date on document, date received, owner, environment described, type (`other` needs a `doc_type_label`), SHA-256 hash, read status with reason, reading method with per-page methods, unread parts, reader version, precedence rank, rank override decision (`AD-###`), used for, ignored and why.
- **Source reference:** document id, location, short quote (at most 300 characters).
- **Fact** (`FCT-###`): subject, fact type, value, source references, confidence, group (set by the server), status. Facts never carry an element id: CP0 freezes them, and the element points to its facts instead.
- **Conflict** (`CNF-###`): facts involved (two or more), kind (`other` needs a `description`), proposed resolution, auto-resolved flag, losing facts kept.

## Precedence rank by document type

| Rank | Document type |
|---|---|
| 1 | (analyst decision, stored as `AD-###`, never a document) |
| 2 | `config_export` |
| 3 | `qa` (written client answers) |
| 4 | `existing_item_definition` |
| 5 | `diagram` |
| 6 | `infra` |
| 7 | `functional`, `srs`, `api_spec`, `asset_list` (rows are hints) |
| 8 | `manual`, `other` |
| 9 | analyst free text (not a document type; entered at a checkpoint) |

The analyst can change a document's rank at CP0. The change is an analyst decision, and its id goes in `rank_override_decision_id`; without it, the rank must match the table.

**Tie-break within a rank: newer wins.** "Newer" uses `date_on_document`, falling back to `date_received` (always present).

## Process

1. Stage 01 writes one Document per file and one Fact per statement.
2. The reconciliation engine (C5) writes Conflicts; the server recomputes groups (D-11).
3. `other` conflicts are logged to `output/new-conflict-kinds.log` so a recurring one can become a named kind.
4. Only facts `confirmed` at CP0 reach Stage 02.

## Validation Rules

1. A fact has at least one source reference.
2. A partial or failed read has a reason.
3. Only naming, instance size, count and version conflicts auto-resolve, keeping at least one losing fact. All other kinds, `other` included, never auto-resolve.
4. `other` documents have a label; `other` conflicts have a description.
5. Rank matches the table unless an override decision is named.

## Error Conditions

Refusals are in spec 12d (R-01, R-02).

## Verification Steps

```bash
node --test tests/schemas.test.js
```
