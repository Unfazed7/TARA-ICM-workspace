'use strict';

const RATING_TO_NUM = { Negligible: 0, Moderate: 1, Major: 2, Severe: 3 };
const NUM_TO_RATING = ['Negligible', 'Moderate', 'Major', 'Severe'];

function computeRiskScore(impactRecord, attackRecord) {
  if (attackRecord.afr_value === null || attackRecord.afr_value === undefined) {
    throw new Error(`afr_value not computed for ${attackRecord.attack_id} - run cvss-afr-calc first`);
  }

  const impactRatingValue = computeImpactRatingValue(impactRecord);
  const afrValue = attackRecord.afr_value;
  if (!Number.isInteger(afrValue) || afrValue < 1 || afrValue > 5) {
    throw new Error(`Invalid afr_value for ${attackRecord.attack_id}: ${afrValue}`);
  }

  const riskScore = impactRatingValue * afrValue;
  if (riskScore < 0) throw new Error(`Invalid negative risk score: ${riskScore}`);

  return {
    impact_rating_value: impactRatingValue,
    impact_rating_label: NUM_TO_RATING[impactRatingValue],
    afr_value: afrValue,
    afr_label: attackRecord.afr_label,
    risk_score: riskScore,
    risk_level: getRiskLevel(riskScore)
  };
}

function computeImpactRatingValue(impactRecord) {
  const ratings = [
    toNumeric(impactRecord.tool_user.privacy),
    toNumeric(impactRecord.tool_user.operational),
    toNumeric(impactRecord.other_stakeholders.legal),
    toNumeric(impactRecord.other_stakeholders.financial),
    toNumeric(impactRecord.other_stakeholders.business)
  ];
  return Math.max(...ratings);
}

function toNumeric(rating) {
  if (!Object.prototype.hasOwnProperty.call(RATING_TO_NUM, rating)) {
    throw new Error(`Invalid impact rating: ${rating}`);
  }
  return RATING_TO_NUM[rating];
}

function getRiskLevel(score) {
  if (score === 0) return 'informational';
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  if (score <= 11) return 'high';
  return 'critical';
}

function assignRiskRanks(risks) {
  return risks
    .sort((a, b) => {
      if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
      return b.afr_value - a.afr_value;
    })
    .map((risk, index) => ({ ...risk, risk_rank: index + 1 }));
}

function calculateRiskScore(impactValue, feasibilityValue) {
  const riskScore = impactValue * feasibilityValue;
  return { risk_score: riskScore, risk_level: getRiskLevel(riskScore) };
}

module.exports = {
  computeRiskScore,
  computeImpactRatingValue,
  getRiskLevel,
  calculateRiskScore,
  assignRiskRanks,
  RATING_TO_NUM
};
