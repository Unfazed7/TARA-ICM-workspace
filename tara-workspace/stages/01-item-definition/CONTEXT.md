# Stage 01 — Item Definition (Layer 2)

**Type:** AI (Claude Vision)  
**Clause:** ISO 21434 §15.4  
**Checkpoint:** Required

---

## Purpose

Extract the system-under-assessment boundary from architecture diagrams and feature lists. Produce a structured item-definition.json that anchors all subsequent stages.

## Input

- `references/architecture.png` (max 20MB) — system architecture diagram
- `references/features.xlsx` (optional) — feature list for ECU/service mapping

## Output

`output/item-definition.json` — see schema in `.meta/specs/00-json-schema-contracts.md`

## Layer 3 Files Loaded

None. Stage 01 operates on raw input only.

## Process

1. Analyze architecture diagram visually
2. Identify all nodes (ECUs, APIs, cloud services, gateways, user devices)
3. Identify all edges (connections, protocols, data flows)
4. Determine network topology type
5. Determine operational domains (vehicle, cloud, user_device)
6. Define item boundary (which nodes are in-scope)
7. Map features to nodes (if features.xlsx provided)
8. Submit via tool_use → `submit_item_definition`

## Web-Specific Node Types

For web-based automotive systems, expected node types:
- `backend_service` — REST APIs, microservices, Azure Functions
- `gateway` — API Management, load balancers, reverse proxies
- `data_store` — databases, blob storage, caches
- `ecu` — vehicle-side hardware that connects to the web service (e.g., TCU)
- `user_device` — browser, mobile app, diagnostic tool

## Validation Rules

- `item_boundary` must not be empty
- `item_boundary` entries must match node_ids in `network_topology.nodes`
- No self-loop edges (`from === to`)
- At least 2 nodes required
- File size check: reject if architecture.png > 20MB before API call

## Error Conditions

| Condition | Action |
|-----------|--------|
| architecture.png > 20MB | Reject with clear message: "File too large. Max 20MB. Please reduce image resolution." |
| No nodes detected | Fail with: "No system components identified. Ensure diagram shows labeled components." |
| Unrecognized protocol | Map to nearest enum value; log assumption in item_description |

## Checkpoint

After output is written, orchestrator POSTs to checkpoint API.  
Human reviews: item boundary, node list, topology type.  
On rejection: re-run with feedback appended to prompt.
