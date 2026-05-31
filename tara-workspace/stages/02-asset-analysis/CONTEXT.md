# Stage 02 — Asset Analysis (Layer 2)

**Type:** AI (Claude standard)  
**Clause:** ISO 21434 §15.5  
**Checkpoint:** Required

---

## Purpose

Identify all cybersecurity-relevant assets within the item boundary. Assign CIA (Confidentiality, Integrity, Availability) ratings with justification.

## Input

`stages/01-item-definition/output/item-definition.json`

## Output

`output/asset-register.json` — array of asset objects. See schema in `.meta/specs/00-json-schema-contracts.md`.

## Layer 3 Files Loaded

- `_config/web-asset-types.md` — asset taxonomy and CIA rating guidance

## Process

1. Read item-definition.json — understand all nodes, edges, protocols
2. For each node in the item boundary:
   - Identify assets hosted by or associated with that node
   - Classify asset type (using web-asset-types.md taxonomy)
   - Rate CIA: confidentiality, integrity, availability (negligible/low/medium/high/critical)
   - Write 1-2 sentence justification
3. For each edge in the item boundary:
   - Identify communication path assets (the channel itself)
   - Rate CIA based on data sensitivity and authentication status
4. Submit via tool_use → `submit_asset_register`

## Minimum Asset Count

A thorough analysis should produce 8–15+ assets for a typical web-automotive system.  
If fewer than 8 assets: review web-asset-types.md for missed categories.

## CIA Rating Rules

- At least one CIA rating per asset must NOT be "negligible"
- Auth credentials: confidentiality = critical always
- Audit logs: integrity = high always (repudiation risk)
- Core API endpoints: availability = medium or higher
- Justify every rating — do not leave `cia_justification` generic

## Validation Rules

- `asset_id` must follow AST-001 format, unique within array
- `source_node` must reference a node_id from Stage 01 output
- Array must not be empty
- `cia_justification` must be non-empty, specific to the asset

## Checkpoint

After output is written, orchestrator POSTs to checkpoint API.  
Human reviews: asset list completeness, CIA ratings, justifications.  
On rejection: re-run with feedback (e.g., "Add assets for authentication system").
