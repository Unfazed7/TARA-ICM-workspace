// Types
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

// Mock data
export const mockComponents: VehicleComponent[] = [
  { id: 'comp-1', name: 'Engine ECU' },
  { id: 'comp-2', name: 'Brake Module' },
  { id: 'comp-3', name: 'Central Gateway' },
  { id: 'comp-4', name: 'Telematics Unit' },
  { id: 'comp-5', name: 'Headlamp ECU' },
  { id: 'comp-6', name: 'Camera Module' },
];

export const mockFunctions: FeatureFunction[] = [
  { id: 'func-1', name: 'Adaptive Cruise Control', description: 'Maintains set speed and following distance using radar and braking inputs.' },
  { id: 'func-2', name: 'Remote Diagnostics', description: 'Enables OBD data retrieval and DTC reading via telematics channel.' },
  { id: 'func-3', name: 'High Beam Assist', description: 'Automatically toggles high-beam headlamps based on camera-detected traffic.' },
];

export const mockMappings: FunctionComponentMapping[] = [
  { functionId: 'func-1', componentId: 'comp-1' },
  { functionId: 'func-1', componentId: 'comp-2' },
  { functionId: 'func-2', componentId: 'comp-3' },
  { functionId: 'func-2', componentId: 'comp-4' },
  { functionId: 'func-3', componentId: 'comp-5' },
  { functionId: 'func-3', componentId: 'comp-6' },
];

export const mockAssets: FunctionAsset[] = [
  { id: 'asset-1', functionId: 'func-1', componentId: 'comp-2', name: 'Braking Torque Request', category: 'signal', confidentiality: false, integrity: true, availability: true },
  { id: 'asset-2', functionId: 'func-1', componentId: 'comp-1', name: 'Vehicle Speed Data', category: 'signal', confidentiality: false, integrity: true, availability: false },
  { id: 'asset-3', functionId: 'func-1', componentId: 'comp-1', name: 'ACC Calibration Parameters', category: 'configuration', confidentiality: true, integrity: true, availability: false },
  { id: 'asset-4', functionId: 'func-2', componentId: 'comp-4', name: 'Diagnostic Session Key', category: 'key', confidentiality: true, integrity: true, availability: false },
  { id: 'asset-5', functionId: 'func-2', componentId: 'comp-3', name: 'DTC Logs', category: 'data', confidentiality: true, integrity: false, availability: true },
  { id: 'asset-6', functionId: 'func-3', componentId: 'comp-6', name: 'Camera Feed', category: 'data', confidentiality: false, integrity: true, availability: true },
  { id: 'asset-7', functionId: 'func-3', componentId: 'comp-5', name: 'Headlamp Firmware Image', category: 'firmware', confidentiality: false, integrity: true, availability: true },
];

export const assetCategories: { value: AssetCategory; label: string }[] = [
  { value: 'signal', label: 'Signal' },
  { value: 'data', label: 'Data' },
  { value: 'key', label: 'Key' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'firmware', label: 'Firmware' },
];
