/**
 * TARA Aegis Orchestrator
 * Runs the 10-stage web TARA pipeline for a single assessment.
 * Layer 1: tara-workspace/CONTEXT.md
 *
 * PLACEHOLDER — Awaiting spec: .meta/specs/09-orchestrator.md
 * BLOCKED: Checkpoint API contract not yet defined
 */

'use strict';

async function runTARA({ architecturePngPath, featuresXlsxPath, assessmentId, config }) {
  // TODO: Implement per spec 09-orchestrator.md
  // Stage sequence (see .meta/CLAUDE-CODE-INSTRUCTIONS.md DR-1):
  //   01-input-normalization   (AI + deterministic reconciliation) -> CP0 Reading review
  //   02-item-definition       (AI + deterministic grouping)       -> CP1 Item Definition review
  //   03-asset-identification  (AI)                                -> light asset review
  //   04-damage-analysis       (AI)
  //   05-threat-identification (AI)
  //   06-attack-path-modelling (AI + engine)
  //   07-impact-analysis       (AI)
  //   08-risk-scoring          (deterministic)
  //   09-risk-treatment        (AI)
  //   10-residual-risk         (deterministic)
  //   → assemble tara-final-package.json
  //   → generate Excel report
  throw new Error('Orchestrator not yet implemented — awaiting spec');
}

module.exports = { runTARA };
