# Spec 12e: Checkpoint and Re-run Rules

**Status:** Revised after analyst review round 1 (B1 gate), split from 12d
**Decisions:** D-04, D-11, D-19

## Goal

List what the API refuses about checkpoint state and re-runs, so a checkpoint can only be confirmed by the analyst, in order, and with nothing left unexplained.

## Success Criteria

Every rule below has an API test written in C3.

## File Ownership

WILL touch (C3): `checkpoint-api/` checkpoint routes and tests.

## Response format (all refusals, 12d and 12e)

A refusal returns `{rule, message, details, item}`. `details` names the ids involved, so the pipeline can fix and retry and the analyst can see what went wrong. HTTP status: 403 for R-09; 409 for checkpoint-state rules (R-10, R-11, R-14, R-16, R-17); 422 for all item rules in 12d.

## Refusal rules

| ID | Refused when | Message | `details` |
|---|---|---|---|
| R-09 | A confirm call comes from anyone other than the analyst | "Only the analyst can confirm this checkpoint." | checkpoint, version |
| R-10 | Confirming while a "Needs you" card is unanswered and not sent to the client | "This checkpoint still has unanswered cards. Answer them or send them to the client first." | open card ids |
| R-11 | Any write to a confirmed checkpoint version | "This checkpoint is confirmed and can no longer change. Start a new version to make changes." | checkpoint, version |
| R-14 | Confirming CP1 while CP0 is not confirmed | "The reading review must be confirmed before the item definition can be confirmed." | CP0 version |
| R-16 | Confirming while a failed spot check has not been re-reviewed | "A spot-checked item was wrong, so the agreed items must be reviewed again before confirming." | failed spot-check item ids |
| R-17 | Accepting a re-run version while a locked analyst decision points to something that no longer exists | "One of your locked decisions refers to something that is no longer in the new version. Re-apply it to another item or retire it." | analyst decision ids, missing target ids |

## Process

1. A spot check that finds a wrong item reopens the whole "Agreed" group; R-16 holds until every reopened item is reviewed.
2. A CP1 version stores `based_on_cp0_version`; attaching a new document starts a new CP0 version, and CP1 must be rebuilt on it before it can be confirmed.
3. On a re-run, locked decisions are re-applied; any whose target is gone are listed to the analyst (R-17), never dropped.

## Validation Rules

Confirm endpoints accept only the analyst role; model-facing tokens never have it.

## Error Conditions

A confirm that breaks several rules returns every broken rule.

## Verification Steps

```bash
cd checkpoint-api && python -m pytest
```
