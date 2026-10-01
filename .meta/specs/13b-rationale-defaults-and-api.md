# Spec 13b: Rationale Defaults, Attention and API

**Status:** approved by the analyst (B5 gate, round 1, with the general principle added).
**Decisions:** D-07, D-08, D-28, D-33, D-36, D-37
**See also:** spec 13a for the item fields.

## Goal

Fix the default a stage applies for each kind of open point, which items need attention, and how the analyst reviews them, so the same input always gives the same Rationale.

## Success Criteria

API tests in C3 cover both endpoints and the analyst-only rule; agent tests in C4 and C8 check defaults on item-01.

## File Ownership

WILL touch (later tasks): `checkpoint-api/` (C3), stage agents (C4, C8), stage pages (C7).

## Input/Output

**Principle (D-37):** when sources disagree, assume the option that means more security work, never less:

| Aspect in dispute | Assume |
|---|---|
| Exposure | More exposed |
| Authentication or encryption | Weaker, or none if one source says none |
| Data | More sensitive |
| Rights | More privilege |
| Existence or scope | The component exists and is in scope |
| Environment | Production; ask whether other environments share anything |

**Named conflict kinds (common cases of the principle):**

| Conflict kind | Default | Attention |
|---|---|---|
| `internet_exposure` | More exposed (D-33) | needs attention |
| `environment` | Production assessed; other environments' statements assumed to hold | needs attention |
| `component_existence` | It exists | needs attention |
| `ownership` | The item's team runs it (stays in scope) | needs attention |
| `entry_point_authentication` | The weaker one | needs attention |
| `older_higher_precedence` | Principle if a security aspect is touched, else higher rank | needs attention |
| `naming`, `instance_size`, `count`, `version` | Higher rank, newer within a rank; loser kept | information |

**Any other disagreement (`other`):** code checks which aspect it touches. If it is one of the aspects above, the principle decides. If code cannot tell which side is more cautious, the higher-ranked source is used and the item is always `needs_attention`, shows both sides and says "I could not tell which option is safer." It is never `information`. Every `other` conflict is logged to `output/new-conflict-kinds.log`; when the analyst settles one, a human may add it as a named kind with its default. The model never chooses a default.

**Gaps and ambiguities:** the default is the question's `default_if_unanswered` (spec 12c), chosen as the more cautious reading. An unlabelled arrow gives protocol "not known". An element seen in one source only is kept.

**Attention rule (code, never the model):** `needs_attention` when the item touches internet exposure, authentication, scope, environment, access to keys, credentials or audit records, or a component's existence. Otherwise `information`.

**Order on the page:** needs attention first, then information; within each, in the order the stage wrote them.

**API:**
- `GET /api/v1/assessments/{id}/stages/{n}/rationale`: items, with counts per attention level and per review status.
- `PATCH /api/v1/assessments/{id}/stages/{n}/rationale/{rationale_id}` with `{status, note}`: analyst role only; sets `by` and `at`.

## Process

1. The stage applies the default, records it in `assumed`, and continues.
2. Code sets `attention` from the rule above.
3. The analyst reviews whenever they like; a dispute is stored and shown, and nothing re-runs (D-36).

## Validation Rules

1. Only the analyst role can call PATCH; model-facing tokens get 403.
2. PATCH to `disputed` without a note is refused (422).

## Error Conditions

Unknown `rationale_id`: 404. Unknown status: 422.

## Verification Steps

```bash
cd checkpoint-api && python -m pytest tests/test_rationale.py   # written in C3
```
