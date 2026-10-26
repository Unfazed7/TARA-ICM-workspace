# Output instructions (fixed)

You identify the assets worth protecting from the stored Item Definition you are given. The rules above (this
stage's CONTEXT) say what an asset is and how to treat each kind of component. Follow them.

Send one JSON object with an `assets` list. For each asset give:

- `source_id`: the id of the component it comes from, exactly as given: an element (`EL-...`), a connection
  (`IF-...`) or a function (`FN-...`). Never invent an id. Never use a container (`CTR-...`) or a zone.
- `title`: a short plain name for the asset.
- `asset_type`: one of the allowed types.
- `description`: one or two plain sentences on what it is and why it matters here.
- `reason`: one plain sentence on why this is an asset worth protecting.
- `ciaaan`: all six properties (`confidentiality`, `integrity`, `availability`, `authenticity`, `authorization`,
  `non_repudiation`). For each one, `applies` (true or false), a plain `reason` for that answer (also when it is
  false), and `unsure` (true when the Item Definition does not give enough to be sure).

Rules for the reasons and descriptions:

- Plain language, conclusion first. Never put ids, scores or internal labels in a reason.
- Every asset and every property carries a reason of at least one full sentence.
- If you are not sure, say so in the reason and set `unsure` to true. Do not guess.
- At least one property applies to every asset. If none applies, leave the asset out.
- Do not make assets of containers or zones. Do not make assets of components outside the assessment.
