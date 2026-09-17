# Stage 01 — Input Normalization (Layer 2)

**Type:** Deterministic (Asset List mode) OR AI (Architecture Diagram mode)  
**Checkpoint:** None — output is structural, not analytical  
**Output must be identical regardless of input mode**

---

## Purpose

Accept either input type and produce a normalized `asset-register.json` with CIAAAN properties. All downstream stages read only from this file — they never know which input mode was used.

## Input Modes

### Mode A: Asset List (CSV)

Input: `references/asset-list.csv`  
Headers: `Asset ID, Asset Title, Asset Type, Description, C, I, A, Au, Az, NR`

Process:
1. Read CSV
2. Validate: no empty Asset IDs, no invalid asset types, CIAAAN values must be Y/N only
3. Transform: map C/I/A/Au/Az/NR Y/N flags to CIAAAN boolean object
4. Assign sequential AS_## IDs if not already present (preserve existing IDs if present)
5. Write asset-register.json

No AI call required. Fully deterministic.

### Mode B: Architecture Diagram (PNG/JSON)

Input: `references/architecture.png` (max 20MB) OR `references/architecture.json`  
Optional: `references/features.xlsx`

Process:
1. Validate file size (reject if PNG > 20MB)
2. Load Layer 3: `_config/web-asset-types.md`, `_config/ciaaan-properties.md`
3. Call Claude API (Vision for PNG, standard for JSON) with tool_use: `submit_asset_register`
4. AI extracts: nodes, data flows, component types
5. AI derives: assets per node, CIAAAN profile per asset type
6. AI writes asset-register.json via tool_use

### Mode Detection

Orchestrator checks for input files in this order:
1. If `references/asset-list.csv` exists → Mode A (no AI call)
2. If `references/architecture.png` OR `references/architecture.json` exists → Mode B (AI call)
3. If both exist → Mode A takes precedence (asset list is more authoritative)
4. If neither exists → fail with clear error

## Output: asset-register.json

```json
[{
  "asset_id": "AS_01",
  "asset_title": "string",
  "asset_type": "auth_credential|api_endpoint|data_store|cloud_service|function|communication_path|audit_log",
  "asset_description": "string (1-2 sentences)",
  "input_mode": "asset-list|architecture-diagram",
  "ciaaan": {
    "confidentiality": true,
    "integrity": false,
    "availability": false,
    "authenticity": true,
    "authorization": true,
    "non_repudiation": false
  },
  "ciaaan_justification": "string"
}]
```

## Validation Rules

- `asset_id` must follow AS_## format; unique within array
- `asset_type` must be from allowed enum
- At least one CIAAAN property must be true per asset
- `ciaaan_justification` must be non-empty
- Total assets must be > 0

## Downstream Impact

Every DS_## in Stage 02 references an AS_## from this output.  
Asset IDs set here propagate through ALL subsequent outputs.  
Incorrect asset_ids here = orphan IDs everywhere downstream.
