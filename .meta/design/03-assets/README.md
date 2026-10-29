# 03 Assets: design reference

The analyst's design for the Stage 03 Asset Analysis screen, kept unchanged as the reference the app is built against
(spec 28, decision D-56). Source canvas: https://claude.ai/artifact/55QKiw1d3cJy89H7X3W9VY

- `Main.dc.html`: artboard "03 Assets · asset list" (opens in the plain table state).
- `Comments.dc.html`: the same page opening in the `change-proposed` state (a cell selected, a comment thread and a proposed change).
- `support.js`: the canvas runtime that renders the two pages (React and the Design Component runtime in one file). It is not part of the design.

View it: `cd .meta/design/03-assets && python3 -m http.server 8765`, then open `http://localhost:8765/Main.dc.html` and `/Comments.dc.html`.
The pages load Geist from Google Fonts; without network access they fall back to the system font.

This is a reference mockup. The app replicates its values in its own components (`frontend/src/components/stages/AssetsStage.tsx`); nothing here is built or linted.
