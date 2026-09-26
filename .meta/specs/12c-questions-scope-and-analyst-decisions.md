# Spec 12c: Questions, Scope Decisions, Analyst Decisions and Checkpoints

**Status:** Revised after analyst review round 1 (B1 gate)
**Schemas:** `src/schemas/stage-02-questions.schema.json`; scope decisions in `src/schemas/stage-02-item-definition.schema.json`. Analyst decisions and checkpoints live only in the API (C3).
**Decisions:** D-03, D-04, D-05, D-06, D-19

## Goal

Define the records that carry the discussion with the analyst.

## Success Criteria

```bash
node --test tests/schemas.test.js
```

## File Ownership

WILL touch: the questions schema and fixtures, `tests/schemas.test.js`. WON'T touch: API (C3), screens (C7, C9).

## Input/Output

- **Question** (`Q-###`): target (an element `EL-###` or a link `IF-##`), fact type (FT-01 to FT-07, or `generic`), topic (required for `generic`, a few words), plain text, why it matters, default if unanswered, origin (starter, generated), answer and who gave it, status (open, answered, sent to client, dropped because the documents answer it).
- **Scope decision** (`SD-###`): element, status (in scope, interface, out of scope, ambiguous), plain reason, facts and questions it rests on, assumed flag. One per element. An assumed decision names the question that would settle it.
- **Analyst decision** (`AD-###`): target (any id), action, before, after, rationale, actor, timestamp, locked flag. Locked decisions are re-applied on every re-run.
- **Checkpoint:** assessment, kind (CP0, CP1), version, status (open, confirmed), confirmed by, confirmed at. A CP1 also records `based_on_cp0_version`, so it is always clear which reading review the Item Definition was built from.

## Process

1. Stage 02 proposes questions: starter fact types per element kind, plus generated ones. Link gaps (unknown authentication or encryption) are questions on the link.
2. A separate model call drops questions the confirmed facts already answer.
3. The server removes duplicates per (target, fact type), or per (target, topic) for `generic` questions.
4. The server caps questions per target. The cap is configurable, default 3. Elements of `unknown_kind` get up to 7 (the full fact set). Only questions the analyst will see count; dropped ones do not. `generic` questions count toward the cap.
5. The analyst answers, or marks a question "send to client"; the default is then recorded as an assumption.
6. On a re-run, locked analyst decisions are re-applied. A locked decision whose target no longer exists is reported to the analyst, never dropped (R-17).
7. Only the analyst confirms a checkpoint; confirming freezes that version.

## Validation Rules

1. A question has a target (element or link) and a fact type; `generic` also needs a topic.
2. An answered question has an answer and who gave it.
3. A scope decision has a reason of at least 10 characters; an assumed one names at least one question.
4. Each element has at most one scope decision.

## Error Conditions

Refusals are in specs 12d (R-05 to R-08, R-15) and 12e (R-09 to R-11, R-14, R-16, R-17).

## Verification Steps

```bash
node --test tests/schemas.test.js
```
