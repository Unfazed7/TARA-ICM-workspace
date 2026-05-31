/**
 * Feasibility Calculator — Deterministic Engine
 * Implements: ISO/SAE 21434 Clause 15.9 Attack Feasibility Rating (AFR)
 * Spec: .meta/specs/WEB-TARA-MVP-ARCHITECTURE.md Section 5.1
 *
 * PLACEHOLDER — Awaiting spec: .meta/specs/05-feasibility-engine.md
 */

'use strict';

/**
 * @param {Object} subFactors
 * @param {number} subFactors.elapsed_time        1-5
 * @param {number} subFactors.expertise_required  1-5
 * @param {number} subFactors.knowledge_of_target 1-5
 * @param {number} subFactors.opportunity_window  1-5
 * @param {number} subFactors.equipment_cost      1-5
 * @returns {{ feasibility_rating_value: number }}
 */
function calculateAFR(subFactors) {
  // TODO: Implement per spec 05-feasibility-engine.md
  throw new Error('feasibility-calc.js not yet implemented — awaiting spec');
}

module.exports = { calculateAFR };
