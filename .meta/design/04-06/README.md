# 04 Impacts, 05 Threats, 06 TARA: design reference

The analyst's designs for the Impact Analysis, Threat Analysis and TARA screens, kept as the reference the app is built
against (specs 29 to 31). They came packed in one file, `TARA_Stage_03_Assets.html`, as boards "04 Impacts · damage
scenarios", "05 Threats · threat scenarios" and "06 TARA · risks and treatment". The pages are unpacked here unchanged
except that the packed script and font ids point at `support.js` and `fonts/`.

- `Impact.dc.html`, `Threat.dc.html`, `Tara.dc.html`: one page each (default state `table`; `startWith` also takes
  `comment-open` and `change-proposed`).
- `support.js`: the canvas runtime (React, ReactDOM and the Design Component runtime in one file). Not part of the design.
- `fonts/`: the Geist files the pages embed.

View: `cd .meta/design/04-06 && python3 -m http.server 8766`, then open `http://localhost:8766/Impact.dc.html` (and
`Threat.dc.html`, `Tara.dc.html`).

Reference mockups only: the app replicates their look and interaction in its own components; the numbers come from the
pipeline. Nothing here is built or linted.
