/**
 * Stage 01 — Item Definition Agent
 * Type: AI (Claude Vision)
 * Clause: ISO/SAE 21434 §15.4
 * Layer 2: stages/01-item-definition/CONTEXT.md
 *
 * PLACEHOLDER — Awaiting spec: .meta/specs/01-item-definition-agent.md
 * BLOCKED: Checkpoint API contract not yet defined
 */

'use strict';

async function runItemDefinition({ architecturePngPath, featuresXlsxPath, assessmentId }) {
  // TODO: Implement per spec 01-item-definition-agent.md
  // 1. Validate file size (max 20MB)
  // 2. Load tara-workspace/CLAUDE.md (Layer 0)
  // 3. Load stages/01-item-definition/CONTEXT.md (Layer 2)
  // 4. Call Claude API (Vision) with architecture diagram
  // 5. Use tool_use: submit_item_definition
  // 6. Write output to stages/01-item-definition/output/item-definition.json
  // 7. Log to audit trail
  // 8. POST to checkpoint API
  throw new Error('Stage 01 agent not yet implemented — awaiting spec');
}

module.exports = { runItemDefinition };
