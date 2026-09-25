# Spec 12d: Refusal Rules

**Status:** Draft for analyst review (B1 gate)
**Decisions:** D-11, D-13

## Goal

List every write the API refuses, its exact message, and how each rule is proved.

## Success Criteria

Every rule has an invalid fixture (listed in `tests/schemas.test.js`) or an API test written in C3.

## File Ownership

WILL touch (C3): `checkpoint-api/` models, routers and tests. Messages below are copied into the API exactly.

## Input/Output

Refusals return HTTP 422 (R-09: 403, R-11: 409) with `{rule, message, item}`. Bulk seeds store valid items and return refused ones with messages; nothing refused is stored.

## Refusal rules

| ID | Refused when | Message | Proved by |
|---|---|---|---|
| R-01 | A fact has no source reference | "This fact has no source. Add at least one document reference with a location and a short quote." | fixture |
| R-02 | A source reference points to a document not in the register | "This source points to a document that is not in the document register." | C3 API test |
| R-03 | An element has no supporting fact | "This element has no supporting fact. Every element must come from at least one confirmed fact." | fixture |
| R-04 | A link's source or destination element does not exist | "This link connects to an element that does not exist." | C3 API test |
| R-05 | A question has no element or no fact type | "This question must name one element and one fact type." | fixture |
| R-06 | A question repeats an (element, fact type) pair | "This question is already asked for this element." | C3 API test |
| R-07 | An element already has the maximum number of questions (default 3) | "This element already has the maximum number of questions." | C3 API test |
| R-08 | A scope decision has no reason | "This scope decision needs a reason the analyst can read." | fixture |
| R-09 | A confirm call comes from anyone other than the analyst | "Only the analyst can confirm this checkpoint." | C3 API test |
| R-10 | Confirming while a "Needs you" card is unanswered and not sent to the client | "This checkpoint still has unanswered cards. Answer them or send them to the client first." | C3 API test |
| R-11 | Any write to a confirmed checkpoint version | "This checkpoint is confirmed and can no longer change. Start a new version to make changes." | C3 API test (409) |
| R-12 | Stage 02 writes anything based on a fact not confirmed at CP0 | "This refers to a fact that was not confirmed at the reading review." | C3 API test |

Supporting schema checks (read reasons, auto-resolved conflicts, protocols, authentication on exposed elements) are listed in specs 12a and 12b and have their own invalid fixtures.

## Process

The API checks each item against the schemas, then the rules above, before storing.

## Validation Rules

Messages are plain words; rule IDs go in the `rule` field, never in the message.

## Error Conditions

A request that breaks several rules returns every broken rule, not only the first.

## Verification Steps

```bash
node --test tests/schemas.test.js            # fixture-proved rules
cd checkpoint-api && python -m pytest        # API-proved rules (from C3)
```
