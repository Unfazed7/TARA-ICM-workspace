# Spec 24: Stage Screens with Assumptions (C7, part 2)

**Status:** approved by the analyst for C7 (2026-10-04).
**Code:** `frontend/src/pages/Assessment.tsx` (new route `/assessment/:id`), `frontend/src/components/stages/*`, `frontend/src/lib/stagesApi.ts`, `frontend/src/types/stages.ts`.
**Decisions:** D-36, D-37, D-46 (theme replaced by D-51), D-51. **Design:** the analyst's redesign (Claude Design, 2026-10-20), applied in C15. Light only.

## Goal

Two working screens for stages 01 and 02: upload and execute, and the Item Definition diagram with the Assumptions panel.

## Success Criteria

```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json && npm run build
```

Plus a walk-through of item-01, recorded in `REBUILD-PROGRESS.md`.

## File Ownership

WILL add the files above and one route in `App.tsx`. The stage API calls live in their own `lib/stagesApi.ts`, not in the legacy `lib/api.ts`. Also edited: `pages/NewProject.tsx` and `components/dashboard/ActiveAssessmentTile.tsx` open `/assessment/:id`; `components/layout/ProtectedRoute.tsx` waits while the login loads, so a reload stays on the page. WON'T touch the old workspace or stages 03 to 10. C15 changes the theme tokens and shared controls for the whole app (D-51).

Note: `tsc` reports 46 errors, all in legacy files and present before C7; the new files have none.

## Screens

**Top bar** (floating pill): wordmark, stage tabs 01 Documents and 02 Item Definition (03 onwards in the menu, disabled), **Assumptions** with a "N need you" chip for this stage, and Settings. **Page header**, one row: project / page title, status on the right.

**01 Documents**
- Numbered sections; a section still missing required input has a yellow edge and a Required tag, then a green Done tag.
- "What is being assessed? *" box comes first.
- Two groups, "Documents describing the system's components/architecture *" and "Documents describing what the system does *". Each row has a type dropdown, Upload/Replace with the file name, and remove. "Add another document" adds a row.
- Other turns the type box into a text field: "OTHER: e.g. Security policy".
- The dropdown list opens over the content.
- The footer reads "Required: ..." until the minimum is met, then Execute is enabled.
- While running: the inputs are locked, and a two-step status refreshes every 3 s. When stopped: the plain error with the files and reasons, inputs kept, and "Execute again".

**02 Item Definition**
- Full-width diagram with a collapsible side panel on its left (Details, Assumptions tabs; a narrow rail when collapsed).
- React Flow, laid out by elkjs left to right, right-angle connections that never cross or overlap:
  - zones as bands, and containers as nested frames;
  - elements as boxes: solid when in scope, dashed with a primary tint for interfaces, grey when out of scope, rounded for actors;
  - links as arrows;
  - a legend.
- Clicking an element or link opens a details drawer showing:
  - asset type, where it sits, exposure (marked ASSUMED when it is) and scope;
  - why in scope, connections, and "What the documents say", which shows quotes with their document and location from the stored facts only;
  - "See N assumptions about this".
- The selected element turns dark; its connections turn blue and everything else fades.

**Assumptions** (opened from the top bar)
- Only the current stage's items, no stage switch. On 01 they open in their own panel; on 02 in the side panel.
- Cards grouped by `topic` (Exposure, Sign-in, Scope, Environment, Data, Naming, Reading notes).
- Needs-you cards come first, marked with a signal dot; information cards have an outline dot.
- A Stage 02 item built on a Stage 01 item shows as one card: "Found in Stage 01, applied in Stage 02".
- Opening a card shows what I found, why (quotes), what I assumed and what would change it, with Confirm and Dispute (a note is required).
- Its `affects` are highlighted on the diagram and the rest dimmed.
- Open questions show "Assumed X until answered" with an Answer box (spec 23).

**Settings** (gear button): "What I read". This is the document register (type, rank, date, used for, ignored and why) and the Stage 01 summary. No assumptions here.

## Validation Rules

Plain words only: no rule ids, scores or internal labels. Every "why" comes from stored sources. Text contrast must be 4.5:1 or better. Colour marks state only. Keyboard reachable. Motion is off under reduced motion. Works at 1280 and 1440 px, side panel open or closed.

## Error Conditions

API errors show inline in plain words. If there is no Stage 02 run yet, the screen says so and points to 01 Documents.

## Verification Steps

Run the success criteria. Then walk through item-01 against the fake stage programs and the real API.
