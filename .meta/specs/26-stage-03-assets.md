# Spec 26: Stage 03 Asset Identification (C12, part 1: derivation)

**Status:** implemented (2026-10-29), with an asset-level `reason` added to the schema. Analyst choices: table first, the AI proposes changes; asset types with no row and optional properties are added only by the model with a reason.
**Code:** `stages/03-asset-identification/agent.js` and `lib/`, `_engines/asset-rules.js` (new), `_config/asset-rules.md` (new), `src/schemas/stage-03-assets.schema.json` (new).
**Decisions:** D-36, D-37, D-46, D-52. **Read first:** DR-15, answers G1 to G4.

## Goal

Derive the assets worth protecting, with their CIAAAN properties and a plain reason for each, from the stored Item Definition only.

## Success Criteria

```bash
npm test
```

On item-01: every asset traces to an element, function, data item or link; no asset comes from an out-of-scope element; the Authorization-not-Confidentiality case holds.

## File Ownership

WILL add the files above and tests. WON'T touch Stages 01 and 02, or Stages 04 to 10. The old `stage-03-asset-register.schema.json` stays for the on-hold stages until C13.

## Input/Output

**Input:** the stored Stage 02 output: elements, functions, links, scope decisions, zones.

**Output:** `assets.json`, `rationale.json`. Each asset has:
- `asset_id`, with the reference prefixes: `EXT-` external identity, `NET-` network, `INF-` infrastructure, `WL-` workload, `DS-` data, `IAM-` credential or key, `API-` business function, `COMM-` data in transit. For example `DS-03`.
- `name` and `description`, in plain words.
- `source`: one of element, function, data item (element and item) or link, with its ids and its scope status.
- `properties`: all six (`confidentiality`, `integrity`, `availability`, `authenticity`, `authorization`, `non_repudiation`). Each has `applies`, `reason` and `origin` (`default`, `model` or `analyst`). At least one applies.
- `fact_ids`.

## Process

1. **Candidates, by code** (DR-15, G1, G2):
   - Elements, by asset type, from the rules table in `_config/asset-rules.md`, which is read on every run like `scoping-facts.md`.
   - Functions become `API-` assets.
   - Data items of secrets stores and key stores (credentials, keys, certificates) become `IAM-` assets.
   - Links that carry sensitive data categories across a trust boundary become `COMM-` assets.
   - Containers and third-party internals never produce assets.
   - `interface` elements produce only the item's side: the link, the external party's identity (Au, NR) and credentials the item holds.
   - `out_of_scope` elements produce no assets.
2. **Default properties by code**, from the same table: Default, plus "If data" properties from Stage 02's data categories. "Model may add" properties start off.
3. **The model, in one call, writes:**
   - a plain description and a reason per applied property;
   - proposed changes to properties, each with a reason;
   - asset rows that duplicate another row;
   - assets and properties for asset types with no table row, each with a reason.

   It cannot add assets that have no source.
4. **Code checks the reply:**
   - Confidentiality on a workload stays off unless the workload holds data that no `DS-` row covers.
   - A reason that describes a missing entitlement check moves the property from Confidentiality to Authorization.
   - A row whose every consequence another row owns is removed.
5. **Rationale items** (topic `assets`):
   - every change the model makes to a default property: needs attention;
   - every removed row: information;
   - every asset from an asset type with no table row: needs attention;
   - every client asset-list hint that maps to nothing: needs attention.

## Validation Rules

- The schema check passes.
- Ids are unique within each prefix.
- Every asset's source exists in the stored Stage 02 run.
- Every applied property has a reason of at least 10 characters with no ids in it.

## Error Conditions

- No stored Stage 02 output: stop with "Stage 02 has no stored result yet."
- The model fails: assets keep their default properties and template reasons, and the run gets a gap item that needs attention.

## Verification Steps

- Fake-model test on the item-01 expected output, checked against hand-made expected assets.
- Unit tests for the scope rule, the Confidentiality-to-Authorization rule and the duplicate-row rule.
