# Spec 23: Data Changes for the Stage Screens (C7, part 1)

**Status:** approved by the analyst for C7 (2026-10-04).
**Code:** `routers/pipeline_v2.py`, `stage_models.py` (migration `0003`), `stage_store.py`, `routers/stages.py`, Stage 01 `lib/register.js` and `lib/minimum-input.js`, `_engines/fact-reconcile.js`, `_engines/item-builder.js`, `_engines/scope-rules.js`, Stage 02 `lib/*`, `src/schemas/`.
**Decisions:** D-43, D-44, D-46.

## Goal

Give the screens what the wireframes need: document groups, the asset type name, a topic on every Assumption, merged names that need the analyst, and answers to open questions.

## Success Criteria

```bash
npm test && cd checkpoint-api && python -m pytest
```

## File Ownership

WILL touch the files above, fixtures and tests. WON'T touch stages 03 to 10, legacy routes, the frontend (spec 24).

## Input/Output

1. **Document group.** `POST /documents` takes `category` (`components` or `behaviour`) and `type_label` (the dropdown words, or the analyst's own words for Other). The manifest and `GET /documents` carry both. Label to type, code-owned:

| Group | Label | doc_type |
|---|---|---|
| components | Architecture diagram, Component diagram | diagram |
| components | Infrastructure or sizing document | infra |
| components | Cloud configuration export | config_export |
| components | Existing item definition | existing_item_definition |
| components | Asset list | asset_list |
| behaviour | Functional description | functional |
| behaviour | SRS, Spec book | srs |
| behaviour | API specification | api_spec |
| behaviour | User manual | manual |
| behaviour | Client answers (Q&A) | qa |
| either | Other (typed) | other, with `doc_type_label` = the typed words |

2. **Minimum input.** Met when the boundary is set and each group has at least one readable document. Other counts towards the group it was added in. `GET /pipeline` adds `missing: [plain sentences]`.
3. **Asset type.** The Stage 02 element field `kind` becomes `asset_type` in the schema, table (column rename), store, engines, prompts, `_config` tables, fixtures and tests. Containers, zones and Rationale keep `kind`. Stage 03's `asset_type` vocabulary is separate and on hold.
4. **Topic.** Every Rationale item gets `topic`: `exposure`, `sign_in`, `scope`, `environment`, `data`, `naming` or `reading`. Code sets it from the template that wrote the item; it is never chosen by a model. Stored in a column.
5. **Naming merges need the analyst.** Same-name and alias merges become `needs_attention`. The schema rule "auto-resolved means information" is relaxed for naming only. Size, count and version stay information.
6. **Answers.** `PUT /stages/02/questions/{question_id}/answer {answer}` stores the analyst's answer with who and when. Shown in the Stage 02 output on that question (status answered). Kept across re-runs while the question keeps its id. Feeding answers into the Stage 02 build comes later.

## Process

Migration `0003` renames the element columns, adds `rationale_items.topic` and the `question_answers` table. Document group and label live in each assessment's `manifest.json`. Readers keep accepting old manifests (group guessed from the type).

## Validation Rules

`category` and labels from the table only; Other needs 3 to 60 characters. Answer 3 to 2000 characters, analyst only (the service login gets 403).

## Error Conditions

Unknown label or group: 422 with the allowed list. Answer to an unknown question: 404.

## Verification Steps

Run the success criteria. The item-01 expected files are re-stored, and read back with `asset_type` and `topic`.
