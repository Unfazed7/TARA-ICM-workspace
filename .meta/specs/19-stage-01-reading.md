# Spec 19: Stage 01 Reading (Document Register and Raw Facts)

**Status:** approved by the analyst for C4 (2026-10-02).
**Code:** `tara-workspace/web-based-tara/stages/01-input-normalization/` (`agent.js`, `lib/`, `prompts/`)
**Decisions:** D-08, D-24, D-40, D-43
**See also:** 12a (register and fact fields), 13a and 13b (Rationale), 17 (model client), 18 (store).

## Goal

Read every client document once, the cheapest reliable way, and turn it into a document register and per-document facts, each with a checked quote.

## Success Criteria

```bash
node --test tests/stage-01/stage01-reading.test.js   # no API key needed: model replies are faked
```

## File Ownership

WILL touch: the Stage 01 folder, `_config/models.json` (prompt versions), `_config/redaction.json`, item-01 `inputs/manifest.json`, `package.json`. WON'T touch: reconciliation (C5), the API.

## Input/Output

**Input folder:** the files, `boundary.txt`, `manifest.json` (`[{file, doc_type, date_received}]`). The analyst chooses each type at upload (D-43). A file without a type gets one guessed from its extension and an information Rationale item.

**Output** (`--out`, git-ignored by default): `document-register.json`, `facts.raw.json` (`{facts, conflicts: []}`, one source per fact), `rationale.json`, `dropped-facts.json`, and `redaction-map.json` when hiding is on. `--seed` stores the run through spec 18 with the service login.

| Format | Read by | Location in sources |
|---|---|---|
| draw.io | code (shapes, geometry containment, arrows) | `page N, shape 'X'`, `page N, arrow from 'A' to 'B'` |
| Markdown, text | code splits by heading, model extracts | section |
| HTML, Word | code (Word converted to HTML), model extracts | section, `table N, row M` |
| Excel | code (header names each value), model extracts | `sheet 'S', row N` |
| PDF | text layer; pages with under 80 characters go to the model as a one-page PDF | `page N` |
| PNG, JPEG | model, two passes (labels, then containment and arrows) | `image, ...` |

An image with the same base name as a parsed diagram is a copy: labels are cross-checked only, no facts.

## Process

1. Minimum input (DR-9) before reading; stop with the missing items listed (exit code 2). Checked again after reading, without failed files.
2. Register: id by order, SHA-256, rank from the 12a table, read status and method per page.
3. One model call per document, chunks of about 40,000 characters with one piece of overlap. Strict JSON output. Code assigns ids.
4. **Quote check:** a fact is kept only if its quote is in the text sent (case, spacing and emphasis ignored; `...` parts in order). Others go to `dropped-facts.json`.
5. Environment is kept only with a checked quote, else `unknown` plus a Rationale gap.
6. Hiding (off by default): account ids, IPs, buckets, hostnames and listed names become tokens before sending and are restored after. Images and scanned pages are not sent while hiding is on.

## Validation Rules

1. Image-read and scanned-page facts are at most medium confidence (their quotes cannot be checked).
2. A refusal or read error marks the file `failed` with the reason and adds a Rationale gap asking for it again; the run continues.
3. Rationale attention is set by code: failed or partial reads, unknown environment and image ambiguities need attention; a guessed type is information.

## Error Conditions

No OCR cross-check of image labels yet (no OCR engine); Visio and Lucid not read yet (D-43).

## Verification Steps

```bash
npm test
node tara-workspace/web-based-tara/stages/01-input-normalization/agent.js --input tests/fixtures/synthetic/item-01/inputs --out /tmp/item01-run
```
