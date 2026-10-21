# Spec 25: Item Definition Exports (C10)

**Status:** draft, waiting for the analyst (2026-10-04).
**Code:** `tara-workspace/web-based-tara/_engines/export-item-definition.js` (new), `scripts/export-item-definition.js` (new, command line), `checkpoint-api/checkpoint_api/routers/stages.py`, `frontend/src/components/stages/WhatIRead.tsx`, `frontend/src/lib/stagesApi.ts`.
**Decisions:** D-46, D-47. **Read first:** DR-5, item-01 expected output.

## Goal

Hand the finished Item Definition over as two files: an Excel workbook in the reference layout and a draw.io diagram. Both are downloaded from Settings.

## Success Criteria

```bash
npm test && cd checkpoint-api && python -m pytest && cd ../frontend && npm run build
```

Plus: the item-01 export opens cleanly, and every IF-## in the Excel file appears in the diagram.

## File Ownership

WILL add the builder, the command line, two endpoints, two buttons and tests. WON'T change the stored data, the Stage 01 or 02 programs, or the screens other than Settings.

## Input/Output

**Input:** the current stored Stage 02 output, and the Stage 01 and 02 Rationale with their reviews. Nothing is read from the documents.

**Draft mark.** When at least one Assumption still needs the analyst (needs attention and not reviewed), both files say "Draft: N assumptions still need you". In the workbook it is the first row of each sheet; in draw.io it is a note at the top. Export is never blocked.

**1. Excel workbook** `<assessment name> item definition.xlsx`

Sheet **Assumptions & Scope**:
- **General assumptions:** the Assumptions the analyst confirmed, from Stage 01 and Stage 02, grouped by topic. Each row has the title, what was assumed, and what would change it. A Stage 02 item built on a Stage 01 item is listed once. Unreviewed and disputed ones are left out.
- **Scope**, three blocks:
  - **IN SCOPE:** component, asset type, reason.
  - **OUT OF SCOPE:** component, asset type, reason.
  - **BOUNDARY:** the boundary statement (marked "proposed" if the program wrote it), then interface components with their reasons, then any components whose scope is not decided.

Sheet **Item Definition**:
- **Step 1, Diagram:** a note pointing to the draw.io file with the same name.
- **Step 2, Data Flow Inventory:** one row per connection, ordered by IF number.

| Column | From |
|---|---|
| DATA SOURCE | source component name |
| DATA DESTINATION | destination component name |
| INTERFACE | IF-## |
| PROTOCOL | protocol |
| USAGE/FUNCTION AT DESTINATION | usage at destination |
| DETAILS | data carried; sign-in; encryption; one or both ways; crosses a trust boundary |
| Remark | remark |

- **Step 3, Assets:** the reference headings with no rows and the note "Filled after Stage 03 (asset identification)".

**2. draw.io file** `<assessment name> item definition.drawio`
- One page. Zones and containers are frames, nested as on the screen; each component sits inside its parent.
- Styles follow the screen legend: in scope solid, interface dashed, out of scope grey, people and outside systems rounded.
- Each connection is an arrow labelled with its IF-## (both ends arrowed when it goes both ways).
- Laid out in a simple grid in screen order (outside zones left and right, the account in the middle), so nothing overlaps when it opens. The analyst can rearrange it in draw.io.

## Process

`GET /assessments/{id}/exports/item-definition.xlsx` and `.../item-definition.drawio` read the stored output and Rationale, pass them as JSON to the command line program, and return the file as a download. The two buttons ("Download Excel", "Download draw.io") sit in Settings under "What I read", with "Draft: N still need you" beside them when it applies.

## Validation Rules

Analyst only; the pipeline service login gets 403. Text cells are written as text, never as formulas (a cell starting with `=`, `+`, `-` or `@` gets a leading apostrophe). File names keep letters, digits, spaces and dashes only.

## Error Conditions

No Stage 02 output yet: 404 "There is no item definition to export yet." Builder failure: 500 with the program's plain message.

## Verification Steps

1. Node tests on item-01 (expected output plus fixture Rationale): both sheets exist; Step 2 has one row per link; each component is in exactly one scope block; only confirmed Assumptions appear; the draft row appears when something still needs the analyst; a cell starting with `=` stays text.
2. Parse the draw.io XML: every IF-## from the workbook is an arrow label; every component's parent is its container or zone.
3. pytest: both endpoints for the analyst, 404 with no output, 403 for the service login.
4. Run the app on item-01 with the fake stage programs and download both files from Settings.
