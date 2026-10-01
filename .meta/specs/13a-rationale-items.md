# Spec 13a: Rationale Items

**Status:** approved by the analyst (B5 gate, round 1).
**Schema:** `src/schemas/rationale.schema.json`
**Decisions:** D-03, D-36, D-37. Prototype: `.meta/prototypes/rationale-item-01.md` (approved round 1).
**See also:** spec 13b for defaults, ordering and the API.

## Goal

Define the Rationale item every stage writes below its output: one per conflict, ambiguity, gap and assumption. It explains the stage's judgement and never blocks the pipeline.

## Success Criteria

```bash
node --test tests/schemas.test.js   # valid rationale fixture passes, 6 invalid ones fail
```

## File Ownership

WILL touch: the schema above, `tests/fixtures/valid/rationale.json`, `tests/fixtures/invalid/rationale-bad-*.json`, `tests/schemas.test.js`. WON'T touch: agents (C4, C8), API (C3), screens (C7).

## Input/Output

Each stage writes `output/rationale.json`, an array of items:

| Field | Meaning |
|---|---|
| `rationale_id` | `RAT-###`; Stage 01 uses 101 onwards, Stage 02 201 onwards |
| `stage` | `01`, `02` |
| `kind` | `conflict`, `ambiguity`, `gap`, `assumption` |
| `attention` | `needs_attention` or `information` (rules in 13b; set by code, not the model) |
| `title` | One line, conclusion first |
| `concluded`, `assumed`, `would_change` | Three of the four parts, plain language (`_config/analyst-language.md`) |
| `why` | `sources` (document, location, quote) and/or `based_on_rationale_ids` (an earlier item, e.g. a Stage 02 item resting on a Stage 01 conflict); optional `note` |
| `question_id` | At most one open question this item would settle |
| `conflict_id`, `auto_resolved` | Required for `conflict` |
| `affects` | Ids it touches (facts, conflicts, documents, elements, links, containers, zones, functions, assumptions, questions, scope decisions) |
| `review` | `status` (`unreviewed`, `confirmed`, `disputed`), `note`, `by`, `at` |

## Process

1. Each stage writes its items after its output is complete.
2. Every open question appears in exactly one item.
3. A Stage 02 item that only restates a Stage 01 conflict is `information` and points back with `based_on_rationale_ids`.
4. The analyst sets `review` at any time; nothing re-runs (D-36).

## Validation Rules

1. `why` has at least one source or one earlier item.
2. A conflict has `conflict_id` and `auto_resolved`; an auto-resolved conflict is `information`.
3. A `disputed` review has a note; any reviewed item has `by` and `at`.
4. `affects` is never empty.
5. No rule IDs, scores or internal field names in text fields (checked by test in C4 and C8).

## Error Conditions

Invalid items are refused by the API with the 12d response format; the stage logs them and continues.

## Verification Steps

```bash
node --test tests/schemas.test.js
```
