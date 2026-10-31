# Spec 30: 05 Threats, Threat Analysis (C16, part 2)

**Status:** implemented (2026-10-31) from the design in `.meta/design/04-06/Threat.dc.html`.
**Code:** `frontend/src/components/stages/ThreatsStage.tsx`, `threats/` (table, attack-path sheet, hook), `review/`, `styles/threats-stage.css`; the same backend files as spec 29.
**Decisions:** D-61 to D-66. Builds on spec 29.

## Goal

One row per threat with its STRIDE category, the four CVSS factors, the CVSS number and the attack feasibility.

## Rows

- Folder 05 gives the rows; folder 06 gives the attack path. The factor words (Network, Low, None...) map to the engine's letter codes; the "why" of a factor is folder 06's justification.
- CVSS is 8.22 x AV x AC x PR x UI with the engine's weights (the points view shows the three-decimal value); the feasibility chip has the five pipeline levels. The filter is "High and Very high".
- The attack-path button opens the design's sheet: the attack goal is the damage scenario, then the threat, then "AND, all steps in order" with folder 06's five steps, and the feasibility, CVSS and factors beside them.

## Edits

- STRIDE and each factor change like a rating on 04. A factor's feasibility is recalculated by the engine and folder 08 is re-run; a changed STRIDE category marks folders 06, 07, 09 and 10 out of date and the screens show the banner with Rebuild (D-62).

## Differences from the design

- The app's own top bar and page header replace the design's; seven pills show only from 1360px wide (the menu lists them below).
- The attack feasibility has the pipeline's five levels and the risk score runs 0 to 15 (see D-61); the legends say so.
- A third change path: a cell can be confirmed or changed from the panel (a level and a reason of 10 characters or more), as on 03.
- Thread times are real, not "yesterday"; the composer is focused after a double-click; the panel is `min(400px, 100%)` wide on phones.
- Evidence quotes are not shown: the folders carry no source quotes.

## Verification

`pytest tests/test_ui_stages.py`; Playwright walk-through and the pixel comparison: table 2.9%, comment-open 4.7%, change-proposed 3.7%.
