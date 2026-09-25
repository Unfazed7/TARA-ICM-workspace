# Spec 12c: Questions, Scope Decisions, Analyst Decisions and Checkpoints

**Status:** Draft for analyst review (B1 gate)
**Schemas:** `src/schemas/stage-02-questions.schema.json`; scope decisions live in `src/schemas/stage-02-item-definition.schema.json`. Analyst decisions and checkpoints exist only in the API (C3).
**Decisions:** D-03, D-04, D-05, D-06, D-19

## Goal

Define the records that carry the discussion with the analyst: questions, scope decisions, analyst decisions and checkpoint versions.

## Success Criteria

```bash
node --test tests/schemas.test.js   # questions fixtures pass or fail as expected
```

## File Ownership

WILL touch: the questions schema and its fixtures, `tests/schemas.test.js`.
WON'T touch: API tables (C3), screens (C7, C9).

## Input/Output

- **Question** (`Q-###`): element id, fact type (FT-01 to FT-07, or `generic`), plain text, why it matters, default if unanswered, origin (starter, generated), answer, answered by (analyst, client), status (open, answered, sent to client, dropped because the documents answer it).
- **Scope decision** (`SD-###`): element id, status (in scope, interface, out of scope, ambiguous), plain reason, facts and questions it rests on, assumed flag. One per element.
- **Analyst decision** (`AD-###`): target (any entity id), action, value before, value after, rationale, actor, timestamp, locked flag. Locked decisions are re-applied on every re-run (D-19).
- **Checkpoint:** assessment id, kind (CP0, CP1), version, status (open, confirmed), confirmed by, confirmed at.

## Process

1. Stage 02 proposes questions (starter fact types per element kind, plus generated ones).
2. A separate model call drops questions the confirmed facts already answer (status `dropped_answered_by_docs`).
3. The server removes duplicates per (element, fact type) and caps questions per element (default 3).
4. The analyst answers, or marks a question "send to client"; the default is then recorded as an assumption.
5. Scope decisions use answers when known, otherwise the default with `assumed: true` and the linked question.
6. Only the analyst confirms a checkpoint; confirming freezes that version.

## Validation Rules

1. A question has an element id and a fact type.
2. An answered question has an answer and who gave it.
3. A scope decision has a reason of at least 10 characters.
4. Each element has at most one scope decision.

## Error Conditions

Refusals and their messages are in spec 12d (R-05 to R-10).

## Verification Steps

```bash
node --test tests/schemas.test.js
```
