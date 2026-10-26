# Spec 28: Stage 03 Assets Screen (C12, part 3)

**Status:** draft, waiting for the analyst (2026-10-26). Layout to be confirmed against the analyst's design (D-51) before building.
**Code:** `frontend/src/components/stages/AssetsStage.tsx` (new), `pages/Assessment.tsx` (enable tab 03), `lib/stagesApi.ts`, `types/stages.ts`.
**Decisions:** D-46, D-51, D-52. Builds on specs 24 and 27. **Read first:** G3.

## Goal

The 03 Assets tab: a light confirm-and-adjust of the asset list, and a full review of the CIAAAN column, where every property shows its reason (G3).

## Success Criteria

```bash
cd frontend && npm run build
```

Plus a walk-through on item-01, recorded in `REBUILD-PROGRESS.md`.

## File Ownership

WILL add the files above and enable tab 03. WON'T change the 01 and 02 tabs, the theme or the legacy pages.

## Screen

**Header:** the asset counts by family, the date of the Stage 02 run it was built from, and a banner when Stage 02 has changed since then.

**Asset table:**
- One row per asset, grouped by family (external, network, infrastructure, workload, data, credentials and keys, business functions, data in transit).
- Columns: id, name, source (clickable: it opens the component or connection on 02), and six CIAAAN cells.
- A cell is filled when the property applies and empty when it does not. A small mark shows a property the model changed from the default, or one the analyst changed.

**Property review:**
- Clicking a cell opens a side panel with the property, the plain reason, where it came from (default, model or analyst), and the supporting facts with their quotes.
- The panel has Keep and Change. Change needs a reason.

**Row actions:**
- Confirm, or Remove with a note.
- "Confirm all unchanged rows" for the light review of the list.

**Assumptions:** Stage 03 Rationale items appear in the existing Assumptions panel, in a new "Assets" topic group. Opening one highlights its asset rows.

## Validation Rules

- Change and Remove need a note.
- The page never shows internal rule ids or schema field names.
- Every property shown carries its reason.

## Error Conditions

- No Stage 03 run yet: "Assets are built after the item definition." with a link to 01 Documents.
- An API error: shown in plain words in place of the content.

## Verification Steps

- `npm run build` passes, and `tsc` shows no new errors.
- A Playwright walk-through with the fake stage programs:
  - open 03;
  - open a property and change it with a reason;
  - remove a row;
  - see the Assets group in Assumptions.
