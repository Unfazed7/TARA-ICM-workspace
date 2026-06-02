/**
 * TARA Aegis Orchestrator
 * Runs the 7-stage TARA pipeline for a single assessment.
 * Layer 1: tara-workspace/CONTEXT.md
 *
 * PLACEHOLDER — Awaiting spec: .meta/specs/09-orchestrator.md
 * BLOCKED: Checkpoint API contract not yet defined
 */

'use strict';

async function runTARA({ architecturePngPath, featuresXlsxPath, assessmentId, config }) {
  // TODO: Implement per spec 09-orchestrator.md
  // Stage sequence:
  //   01-item-definition (AI + checkpoint)
  //   02-asset-analysis  (AI + checkpoint)
  //   03-impact-analysis (AI + engine + checkpoint)
  //   04-threat-analysis (AI extended + engine + checkpoint)
  //   05-risk-determination (deterministic)
  //   06-risk-treatment (AI + optional checkpoint)
  //   07-residual-risk  (deterministic)
  //   → assemble tara-final-package.json
  //   → generate Excel report
  throw new Error('Orchestrator not yet implemented — awaiting spec');
}

module.exports = { runTARA };
