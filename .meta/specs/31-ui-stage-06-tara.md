# Spec 31: 06 TARA, risks and treatment (C16, part 3)

**Status:** implemented (2026-10-31) from the design in `.meta/design/04-06/Tara.dc.html`.
**Code:** `frontend/src/components/stages/TaraStage.tsx`, `tara/`, `review/`, `styles/tara-stage.css`; the same backend files as spec 29.
**Decisions:** D-61 to D-66. Builds on specs 29 and 30.

## Goal

One row per risk with where it comes from, how it was scored, how it is treated and what goal it must reach.

## Rows

- Folder 08 gives the rows; each is joined to its damage scenario and impact, its threat and attack feasibility, folder 09's treatment and folder 10's residual risk.
- Columns as designed: asset, property, damage scenario and impact, threat scenario and feasibility, risk score and level, treatment, cybersecurity goal. The score is impact value x feasibility value (0 to 15), coloured by its five levels. The filter is "High and Critical".
- The goal column shows the goal id and statement; a Reduce without a goal reads "No goal written yet" in the design's warning style; Accept reads "Not needed, risk accepted"; Avoid shows the action.
- The residual risk is in the panel (the risk after the controls and why), not a column.
- The risk matrix of the design is a legend of the pipeline's formula and thresholds.

## Edits

- The treatment chip offers Reduce, Accept, Share and Avoid. Choosing one opens the change form: Accept is offered only for informational and low risks; Reduce needs a goal; Avoid needs the action; every change needs a reason (D-63). Folder 10 is marked out of date.
- Finish shows the warning dialog for open assumptions and Reduce rows with no goal; "Finish anyway" records the finish.

## Differences from the design

- The app's own top bar and page header replace the design's; seven pills show only from 1360px wide (the menu lists them below).
- The attack feasibility has the pipeline's five levels and the risk score runs 0 to 15 (see D-61); the legends say so.
- A third change path: a cell can be confirmed or changed from the panel (a level and a reason of 10 characters or more), as on 03.
- Thread times are real, not "yesterday"; the composer is focused after a double-click; the panel is `min(400px, 100%)` wide on phones.
- Evidence quotes are not shown: the folders carry no source quotes.
- A treatment change is made in the panel with a reason, where the design switches instantly: the pipeline's rules need more than a name.

## Verification

`pytest tests/test_ui_stages.py`; Playwright walk-through and the pixel comparison: table 7.7%, comment-open 8.1%, change-proposed 5.1% (the difference is mostly the risk scores and levels, which are the pipeline's).
