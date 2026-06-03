// Risk Assessment Types for ISO/SAE 21434 Compliance

export type ImpactLevel = 'negligible' | 'moderate' | 'major' | 'severe';
export type TreatmentDecision = 'avoid' | 'reduce' | 'share' | 'accept';
export type ReviewStatus = 'pending' | 'approved' | 'revision-requested';

export interface FeasibilityFactors {
  time: number; // 0-4
  expertise: number; // 0-4
  knowledge: number; // 0-4
  equipment: number; // 0-4
  opportunity: number; // 0-4
}

export interface ThreatScenario {
  id: string;
  threatId: string;
  name: string;
  description: string;
  targetAsset: string;
  impactSafety: ImpactLevel;
  impactFinancial: ImpactLevel;
  impactOperational: ImpactLevel;
  impactPrivacy: ImpactLevel;
  feasibilityFactors: FeasibilityFactors;
  feasibilityScore: number; // Calculated 1-5
  riskValue: number; // Calculated 1-5
  treatmentDecision: TreatmentDecision;
  cybersecurityGoal: string;
  reviewStatus: ReviewStatus;
  reviewComment?: string;
  lastModified: string;
}

export interface RiskMatrixPosition {
  threatId: string;
  impact: number; // 1-5
  feasibility: number; // 1-5
  color: string;
}

export interface AuditProgress {
  category: string;
  label: string;
  progress: number;
  total: number;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'auditor' | 'engineering';
}

// TARA Unified Grid Types
export type AttackVector = 'network' | 'adjacent' | 'local' | 'physical';
export type StrideCategory = 'spoofing' | 'tampering' | 'repudiation' | 'information-disclosure' | 'denial-of-service' | 'elevation-of-privilege';
export type FeasibilityLevel = 'high' | 'medium' | 'low' | 'very-low';

export interface TaraRow {
  id: string;
  // Asset Context (Clause 15.3)
  assetName: string;
  assetGroup: string; // for color coding
  damageScenario: string;
  // Impact (Clause 15.5)
  impactSafety: ImpactLevel;
  impactFinancial: ImpactLevel;
  impactOperational: ImpactLevel;
  impactPrivacy: ImpactLevel;
  // Threat (Clause 15.4)
  threatDescription: string;
  strideCategory: StrideCategory;
  // Attack Vector (Clause 15.6)
  attackVector: AttackVector;
  attackPathDescription: string;
  // Feasibility (Clause 15.7)
  feasibilityFactors: FeasibilityFactors;
  // Treatment (Clause 15.9)
  treatmentDecision: TreatmentDecision;
  cybersecurityGoal: string;
  cybersecurityClaim: string;
}

export const getFeasibilityLevel = (factors: FeasibilityFactors): FeasibilityLevel => {
  const total = factors.time + factors.expertise + factors.knowledge + factors.equipment + factors.opportunity;
  if (total <= 5) return 'very-low';
  if (total <= 10) return 'low';
  if (total <= 15) return 'medium';
  return 'high';
};

export const feasibilityLevelToNumber = (level: FeasibilityLevel): number => {
  const map: Record<FeasibilityLevel, number> = { 'very-low': 1, 'low': 2, 'medium': 3, 'high': 4 };
  return map[level];
};

// Helper functions
export const impactToNumber = (level: ImpactLevel): number => {
  const map: Record<ImpactLevel, number> = {
    negligible: 1,
    moderate: 2,
    major: 3,
    severe: 4
  };
  return map[level];
};

export const calculateMaxImpact = (scenario: ThreatScenario): number => {
  return Math.max(
    impactToNumber(scenario.impactSafety),
    impactToNumber(scenario.impactFinancial),
    impactToNumber(scenario.impactOperational),
    impactToNumber(scenario.impactPrivacy)
  );
};

export const calculateFeasibility = (factors: FeasibilityFactors): number => {
  const total = factors.time + factors.expertise + factors.knowledge + factors.equipment + factors.opportunity;
  // Average and normalize to 1-5 scale
  return Math.ceil((total / 20) * 5);
};

export const calculateRiskValue = (impact: number, feasibility: number): number => {
  // Risk matrix calculation: higher values = higher risk
  const product = impact * feasibility;
  if (product <= 4) return 1;
  if (product <= 8) return 2;
  if (product <= 12) return 3;
  if (product <= 15) return 4;
  return 5;
};

export const getRiskColor = (riskValue: number): string => {
  const colors: Record<number, string> = {
    1: 'hsl(var(--sage))',
    2: 'hsl(142, 71%, 45%)',
    3: 'hsl(var(--dusty-amber))',
    4: 'hsl(38, 92%, 50%)',
    5: 'hsl(0, 72%, 51%)'
  };
  return colors[riskValue] || colors[3];
};

export const getRiskLabel = (riskValue: number): string => {
  const labels: Record<number, string> = {
    1: 'Very Low',
    2: 'Low',
    3: 'Medium',
    4: 'High',
    5: 'Critical'
  };
  return labels[riskValue] || 'Unknown';
};
