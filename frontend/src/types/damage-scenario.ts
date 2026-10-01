// Damage Scenario Types per ISO 21434 Clause 15.3.2

export type ImpactCategory = 'safety' | 'financial' | 'operational' | 'privacy';

export interface DamageScenario {
  id: string;
  scenarioId: string; // DS-001 format
  name: string;
  description: string;
  assetId: string;
  assetName: string;
  cybersecurityProperty: 'confidentiality' | 'integrity' | 'availability';
  impactCategory: ImpactCategory;
  impactRating: 'negligible' | 'moderate' | 'major' | 'severe';
  impactJustification: string;
  linkedThreatScenarios: string[]; // Threat scenario IDs
  stakeholders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  assetId: string; // A-001 format
  name: string;
  description: string;
  type: 'data' | 'function' | 'component';
  cybersecurityProperties: ('confidentiality' | 'integrity' | 'availability')[];
  associatedECUs: string[];
  damageScenarioIds: string[];
}

// ISO 21434 Clause 15.3.2 - Impact categories with descriptions
export const impactCategoryDescriptions: Record<ImpactCategory, string> = {
  safety: 'Physical harm to road users (drivers, passengers, pedestrians)',
  financial: 'Economic damage to vehicle owner, OEM, or third parties',
  operational: 'Loss of vehicle functions or degraded performance',
  privacy: 'Unauthorized access to personal or sensitive data',
};

export const impactRatingDescriptions = {
  negligible: 'No significant impact or easily recoverable',
  moderate: 'Some impact but manageable, partial loss of function',
  major: 'Significant impact, substantial loss or harm',
  severe: 'Critical impact, potential life-threatening or catastrophic',
};

export const cybersecurityPropertyDescriptions = {
  confidentiality: 'Protecting data from unauthorized access',
  integrity: 'Ensuring data accuracy and trustworthiness',
  availability: 'Ensuring system accessibility when needed',
};
