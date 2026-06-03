export type StrideCategory = 'Spoofing' | 'Tampering' | 'Repudiation' | 'Info Disclosure' | 'Denial of Service' | 'Elevation of Privilege';

export interface Feature {
  id: string;
  name: string;
  description: string;
}

export interface FeatureFunction {
  id: string;
  featureId: string;
  name: string;
  description: string;
}

export interface AbuseCase {
  id: string;
  functionId: string;
  name: string;
  description: string;
  stride: StrideCategory;
}

export interface DamageScenarioItem {
  id: string;
  abuseCaseId: string;
  name: string;
  description: string;
  impactArea: 'Safety' | 'Financial' | 'Operational' | 'Privacy';
}

export interface ThreatItem {
  id: string;
  damageScenarioId: string;
  name: string;
  description: string;
  strideCategory: StrideCategory;
}

export interface CiaaanItem {
  id: string;
  threatId: string;
  C: boolean;
  I: boolean;
  A: boolean;
  Au: boolean;
  An: boolean;
  N: boolean;
}

export interface ThreatAsset {
  id: string;
  ciaaanId: string;
  name: string;
  category: 'data' | 'io' | 'firmware';
}

export interface AssociatedECU {
  id: string;
  assetId: string;
  name: string;
  type: 'ECU' | 'Sensor' | 'Actuator' | 'Gateway';
}

export const strideCategories: StrideCategory[] = [
  'Spoofing', 'Tampering', 'Repudiation', 'Info Disclosure', 'Denial of Service', 'Elevation of Privilege',
];

export const assetCategories: { value: ThreatAsset['category']; label: string }[] = [
  { value: 'data', label: 'Data' },
  { value: 'io', label: 'I/O' },
  { value: 'firmware', label: 'Firmware' },
];

export const ecuTypes: AssociatedECU['type'][] = ['ECU', 'Sensor', 'Actuator', 'Gateway'];

export const impactAreas: DamageScenarioItem['impactArea'][] = ['Safety', 'Financial', 'Operational', 'Privacy'];

export const mockFeatures: Feature[] = [];
export const mockFunctions: FeatureFunction[] = [];
export const mockAbuseCases: AbuseCase[] = [];
export const mockDamageScenarios: DamageScenarioItem[] = [];
export const mockThreats: ThreatItem[] = [];
export const mockCiaaan: CiaaanItem[] = [];
export const mockThreatAssets: ThreatAsset[] = [];
export const mockAssociatedECUs: AssociatedECU[] = [];
