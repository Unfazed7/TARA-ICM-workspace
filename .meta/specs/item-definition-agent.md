> **SUPERSEDED** on 2026-09-25 by .meta/specs/12b-item-definition-model.md and .meta/specs/12c-questions-scope-and-analyst-decisions.md. Kept for history. Do not use for new work.

# Spec — Item Definition Agent (CP1 Boundary Proposal)

**Module:** `tara-workspace/stages/01-item-definition/agent.js`
**Author:** Claude
**Status:** Ready for implementation
**Type:** AI Vision + Reasoning (three calls: 1A extract, 1A2 reconcile, 1B boundary)
**Clause:** ISO/SAE 21434 §15.3 (item definition)
**Precedes:** Stage 01 Input Normalization — CP1 must reach `phase=final` (via `checkpoint-api`'s `/boundary/*` routes) before Stage 01 runs. This agent does **not** call the checkpoint API itself; it returns data, the caller (orchestrator / `scripts/demo-run.js`) seeds it.

---

## Goal

Given one or more architecture inputs (diagram PNG, network topology) and an analyst-written boundary statement, extract candidate system elements/links, reconcile them across sources into one merged model, and classify each element's scope (`in_scope` / `out_of_scope` / `interface` / `ambiguous`) against the boundary statement — producing the exact payload `checkpoint-api`'s `POST /boundary/seed` already expects (see `checkpoint_api/schemas.py::BoundarySeed`).

---

## Success Criteria

```bash
node -e "
const agent = require('./tara-workspace/stages/01-item-definition/agent.js');
agent.runToCheckpoint1(
  [{ filePath: 'tests/fixtures/inputs/architecture.png', sourceType: 'architecture_diagram' }],
  'The item is the telematics function: TCU and its gateway path.',
  '.demo-output/smoke'
).then(r => {
  if (!r.mergedModel.elements.length) throw new Error('no elements');
  if (!r.proposal.decisions.length) throw new Error('no decisions');
  console.log('OK', r.mergedModel.elements.length, 'elements');
});
"
```
Requires `ANTHROPIC_API_KEY` (or `LLM_API_KEY`, via `llm-client.js`).

---

## File Ownership

**WILL create/modify:** `tara-workspace/stages/01-item-definition/agent.js`, `tara-workspace/stages/01-item-definition/references/*.md`, `tests/agents/item-definition.test.js`.
**WILL NOT modify:** `checkpoint-api/**`, `scripts/demo-run.js`, `frontend/**`, `tests/fixtures/merged-model.sample.json`, `tests/fixtures/boundary-final.sample.json` (these already define the frozen output shape).

---

## Input / Output

**Input:** `inputs: [{filePath, sourceType}]` where `sourceType` ∈ `architecture_diagram | network_topology | feature_function_list | free_text_description`; `boundaryStatement: string`; `outDir: string`.

**Output (return value of `runToCheckpoint1`):**
```json
{
  "mergedModel": { "model_id": "MM-...", "item_name": "...", "sources_used": [...], "elements": [...], "links": [...] },
  "proposal": { "decisions": [ { "element_id", "status", "rationale", "escalation_reason", "decided_by": "agent" } ] },
  "conflicts": { "model_ref": "...", "conflicts": [] },
  "coverage": { "sources_provided": [...], "sources_absent": [...], "consequences": [...], "recommendation": "..." }
}
```
Element/decision shapes must match `tests/fixtures/merged-model.sample.json` and `boundary-final.sample.json` exactly (these are the contract, not illustrations). `decisions[].element_id` must reference an `elements[].element_id` in the same result. Also written to `<outDir>/item-definition-proposal.json`.

`resumeAfterCheckpoint1(outDir, itemName, finalDecisions = null)`: called after CP1 reaches `phase=final`. If `finalDecisions` is `null`, reads `<outDir>/boundary-final.json` (caller writes the finalized boundary there after fetching it from `GET /boundary`). Filters `mergedModel.elements` to `in_scope`/`interface` only, writes `<outDir>/item-definition.json` — the seed for Stage 01.

---

## Process

1. **Call 1A** (per input, if `architecture_diagram`): vision-extract candidate elements/links via tool use; tag `origin: "stated"`, `confidence`, `source_refs: [<sourceType>]`.
2. **Call 1A2** (reconcile, always, even with one source): merge elements across sources, dedupe by name+type, assign `element_id = COMP-{NNN}` sequentially, mark cross-source disagreements in `conflicts.conflicts[]`.
3. **Call 1B** (boundary reasoning): given `boundaryStatement` + merged elements, classify each element. Elements the statement doesn't clearly place get `status: "ambiguous"` with `escalation_reason` — never guess to force resolution.
4. Compute `coverage` from which `sourceType`s were supplied vs. the full set (`architecture_diagram, network_topology, feature_function_list, free_text_description`).
5. Write `<outDir>/item-definition-proposal.json`, return the object above.

---

## Validation Rules

1. `element_id` unique, pattern `^COMP-\d{3,}$`.
2. Every `decisions[].element_id` exists in `mergedModel.elements`.
3. `status` ∈ `in_scope|out_of_scope|interface|ambiguous`; `ambiguous` requires non-null `escalation_reason` ∈ `low_extraction_confidence|unresolved_conflict|derived_element|boundary_genuinely_unclear`.
4. `rationale` ≥ 5 characters, no attacker-language.
5. At least one element and one decision in output; `decided_by` always `"agent"` here (analyst edits happen later, via `checkpoint-api`, not this agent).

---

## Error Conditions

| Condition | Behavior |
|---|---|
| No `boundaryStatement` | `throw Error('boundaryStatement is required')` |
| No `inputs` | `throw Error('at least one input source is required')` |
| Unreadable file | `throw` with file path |
| Claude returns free text, not tool_use | Retry once (same pattern as Stage 02); throw on 2nd failure |
| `resumeAfterCheckpoint1` called before `<outDir>/boundary-final.json` exists and no `finalDecisions` passed | `throw Error('boundary not finalized: pass finalDecisions or write boundary-final.json')` |

---

## Verification Steps

```bash
npm test -- --testPathPattern=item-definition
# Must cover: single-source extraction, multi-source reconcile with a conflict,
# ambiguous-status requires escalation_reason, resumeAfterCheckpoint1 filters out out_of_scope
```
