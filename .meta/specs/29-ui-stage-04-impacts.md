# Spec 29: 04 Impacts, Impact Analysis (C16, part 1)

**Status:** implemented (2026-10-31) from the design in `.meta/design/04-06/Impact.dc.html`.
**Code:** `frontend/src/components/stages/ImpactsStage.tsx`, `impacts/`, `review/` (shared with specs 30 and 31), `styles/impacts-stage.css`; `checkpoint_api/ui_stages.py`, `ui_stage_edits.py`, `routers/ui_stages.py`, `engine_bridge.py`, `node_helpers/engines.js`.
**Decisions:** D-61 to D-66. Builds on specs 22, 27 and 28.

## Goal

One row per damage scenario with the impact ratings the pipeline gave it, where the analyst reviews and corrects them.

## Rows

- Folder 04 gives the rows (asset reference, property, damage scenario). Folder 07 rates each (threat, damage scenario) pair; a scenario shows the highest level across its pairs for each category, a yellow dot where its pairs disagree, and the "why" of each pair.
- Seven categories as designed: tool user Safety, Financial, Operational, Privacy; other stakeholders Legal, Financial, Business. Safety and the tool user's Financial are fixed by rule (lock, rule text) and show what folder 07 wrote.
- Overall impact rating is `computeImpactRatingValue()`; the distribution bar, the filter "Major and Severe" and the points view (1 to 4) follow from it.
- Before folder 07 has run the rating cells are empty; during a build a blue banner says so.

## Edits

- A level chosen from a chip menu is saved with the reason "Changed on the grid"; from the panel the analyst picks a level and writes a reason. It is written to every pair of the scenario, folder 08 is re-run, and folders 09 and 10 are marked out of date (D-62).
- Comments and assumptions as on 03; Finish never refuses (D-65).

## Differences from the design

- The app's own top bar and page header replace the design's; seven pills show only from 1360px wide (the menu lists them below).
- The attack feasibility has the pipeline's five levels and the risk score runs 0 to 15 (see D-61); the legends say so.
- A third change path: a cell can be confirmed or changed from the panel (a level and a reason of 10 characters or more), as on 03.
- Thread times are real, not "yesterday"; the composer is focused after a double-click; the panel is `min(400px, 100%)` wide on phones.
- Evidence quotes are not shown: the folders carry no source quotes.

## Verification

`pytest tests/test_ui_stages.py`; Playwright walk-through and the pixel comparison against the design (`frontend/tests/visual/04-06/`, git-ignored): table 4.7%, comment-open 6.0%, change-proposed 4.6%.
