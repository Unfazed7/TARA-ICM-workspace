# Spec 12d: Refusal Rules for Stored Items

**Status:** Revised after analyst review round 1 (B1 gate)
**Decisions:** D-11, D-13
**See also:** spec 12e for checkpoint and re-run rules.

## Goal

List every item the API refuses to store, its exact message, and how each rule is proved.

## Success Criteria

R-01, R-03, R-05, R-08 and R-15 are proved by invalid fixtures in `tests/schemas.test.js`; the others by API tests written in C3.

## File Ownership

WILL touch (C3): `checkpoint-api/` models, routers and tests. Messages are copied exactly.

## Input/Output

Response format and HTTP status codes: spec 12e. Bulk seeds store valid items and return refused ones; nothing refused is stored.

## Refusal rules

| ID | Refused when | Message | `details` |
|---|---|---|---|
| R-01 | A fact has no source reference | "This fact has no source. Add at least one document reference with a location and a short quote." | fact id |
| R-02 | A source points to a document not in the register | "This source points to a document that is not in the document register." | document id |
| R-03 | An element has no supporting fact | "This element has no supporting fact. Every element must come from at least one confirmed fact." | element id |
| R-04 | A link's source or destination does not exist | "This link connects to an element that does not exist." | missing element id |
| R-05 | A question has no target or no fact type, or a `generic` one has no topic | "This question must name one element or link and one fact type." | question id |
| R-06 | A question repeats (target, fact type), or (target, topic) for `generic` | "This question is already asked for this element or link." | existing question id |
| R-07 | The target already has its maximum of visible questions | "This element already has 3 questions. Merge this into one of them or drop it." (the number follows the configured cap) | target id, existing question ids |
| R-08 | A scope decision has no reason | "This scope decision needs a reason the analyst can read." | element id |
| R-12 | Stage 02 writes anything based on a fact not confirmed at CP0 | "This refers to a fact that was not confirmed at the reading review." | fact id |
| R-13 | An element in an external zone has a parent container, or an element in any other zone has none | "This element's container does not match its zone. Elements outside the item's accounts have no container; elements inside have exactly one." | element id, zone id |
| R-15 | A scope decision is marked assumed but names no question | "This assumed scope decision must name the question that would settle it." | element id |

Schema checks behind these rules (read reasons, labels, ranks, auto-resolved conflicts, protocols, authentication on exposed elements) are listed in specs 12a and 12b.

## Process

The API checks each item against the schemas, then the rules above, before storing.

## Validation Rules

Messages are plain words; rule ids go in `rule`, never in the message.

## Error Conditions

An item that breaks several rules returns every broken rule.

## Verification Steps

```bash
node --test tests/schemas.test.js
cd checkpoint-api && python -m pytest
```
