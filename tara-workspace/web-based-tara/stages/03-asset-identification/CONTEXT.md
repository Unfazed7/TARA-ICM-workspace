# Stage 03: Asset Identification (Layer 2)

**Type:** AI
**Checkpoint:** light asset review (full review of the CIAAAN column)
**Spec:** pending, `.meta/specs/16-asset-identification.md` (C12)
**Load from `_config/`:** `web-asset-types.md`, `ciaaan-properties.md`

---

## Purpose

Derive the assets worth protecting, and their CIAAAN properties, from the finalized Item Definition.

## Input

From the API only: the Item Definition confirmed at CP1. Never client documents.

## Output (Layer 4)

- `output/asset-register.json`, valid against `src/schemas/stage-03-asset-register.schema.json` (the schema is extended in C12 with source element and reason fields).

## Process (summary; full rules in C12)

- Many elements are assets directly; containers never are. Business-function assets come from the function inventory. Credential and key assets come from secrets and key store data. In-transit assets come from links carrying sensitive data across a trust boundary.
- `in_scope` elements produce all asset types; `interface` elements produce only the item's side (the link, the external party's identity as used by the item, credentials the item holds); `out_of_scope` elements produce none but stay listed.
- Every asset and every CIAAAN property carries a plain reason.
- If the wrong party gets data because an entitlement check is missing, that is Authorization, not Confidentiality. No asset row may exist whose every consequence belongs to other rows.

## Checkpoint

Light review of the asset list; full review of the CIAAAN column, where every property shows its reason.

## What the next stage receives

Stage 04 (Damage Analysis) receives `asset-register.json`.
