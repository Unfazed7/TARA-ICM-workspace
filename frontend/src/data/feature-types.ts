export type AssetCategory = 'signal' | 'data' | 'key' | 'configuration' | 'firmware';

export interface VehicleComponent {
  id: string;
  name: string;
}

export interface FeatureFunction {
  id: string;
  name: string;
  description: string;
}

export interface FunctionComponentMapping {
  functionId: string;
  componentId: string;
}

export interface FunctionAsset {
  id: string;
  functionId: string;
  componentId: string;
  name: string;
  category: AssetCategory;
  confidentiality: boolean;
  integrity: boolean;
  availability: boolean;
}

export const assetCategories: { value: AssetCategory; label: string }[] = [
  { value: 'signal', label: 'Signal' },
  { value: 'data', label: 'Data' },
  { value: 'key', label: 'Key' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'firmware', label: 'Firmware' },
];
