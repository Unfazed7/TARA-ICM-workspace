// Types
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
  damageId: string;
  name: string;
  description: string;
  attackVector: string;
}

export interface CiaaanItem {
  id: string;
  threatId: string;
  confidentiality: boolean;
  integrity: boolean;
  availability: boolean;
  authenticity: boolean;
  authorization: boolean;
  nonRepudiation: boolean;
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

// Mock Data
export const mockFeatures: Feature[] = [
  { id: 'feat-1', name: 'Adaptive Cruise Control', description: 'Maintains set speed and following distance using radar/camera fusion.' },
  { id: 'feat-2', name: 'Remote Keyless Entry', description: 'Wireless lock/unlock via key fob or smartphone app.' },
  { id: 'feat-3', name: 'Over-the-Air Updates', description: 'Remote software updates for ECUs and infotainment.' },
];

export const mockFunctions: FeatureFunction[] = [
  { id: 'fn-1', featureId: 'feat-1', name: 'Request Acceleration', description: 'Send torque request to engine ECU based on radar distance.' },
  { id: 'fn-2', featureId: 'feat-1', name: 'Request Braking', description: 'Send braking torque to ESC module for distance maintenance.' },
  { id: 'fn-3', featureId: 'feat-2', name: 'Decrypt Key Signal', description: 'Validate and decrypt challenge-response from key fob.' },
  { id: 'fn-4', featureId: 'feat-2', name: 'Actuate Door Locks', description: 'Send CAN command to body control module for lock actuation.' },
  { id: 'fn-5', featureId: 'feat-3', name: 'Download Update Package', description: 'Fetch signed firmware package from OEM cloud server.' },
  { id: 'fn-6', featureId: 'feat-3', name: 'Flash ECU Firmware', description: 'Write verified firmware image to target ECU memory.' },
];

export const mockAbuseCases: AbuseCase[] = [
  { id: 'ac-1', functionId: 'fn-1', name: 'Spoofed speed message injection', description: 'Attacker injects spoofed speed message on CAN bus to override set speed.', stride: 'Tampering' },
  { id: 'ac-2', functionId: 'fn-2', name: 'Brake command suppression', description: 'Attacker floods CAN bus to suppress legitimate brake commands.', stride: 'Denial of Service' },
  { id: 'ac-3', functionId: 'fn-3', name: 'Relay attack on key fob', description: 'Attacker amplifies key fob signal to unlock vehicle from distance.', stride: 'Spoofing' },
  { id: 'ac-4', functionId: 'fn-4', name: 'Replay captured unlock command', description: 'Attacker records and replays valid CAN unlock message.', stride: 'Repudiation' },
  { id: 'ac-5', functionId: 'fn-5', name: 'MITM on update channel', description: 'Attacker intercepts OTA download and injects malicious firmware.', stride: 'Tampering' },
  { id: 'ac-6', functionId: 'fn-6', name: 'Unsigned firmware injection', description: 'Attacker bypasses signature check to flash rogue firmware.', stride: 'Elevation of Privilege' },
];

export const mockDamageScenarios: DamageScenarioItem[] = [
  { id: 'dmg-1', abuseCaseId: 'ac-1', name: 'Unintended acceleration', description: 'Vehicle accelerates beyond safe speed causing collision.', impactArea: 'Safety' },
  { id: 'dmg-2', abuseCaseId: 'ac-2', name: 'Brake failure at speed', description: 'Vehicle unable to decelerate when required.', impactArea: 'Safety' },
  { id: 'dmg-3', abuseCaseId: 'ac-3', name: 'Vehicle theft', description: 'Unauthorized access and theft of vehicle.', impactArea: 'Financial' },
  { id: 'dmg-4', abuseCaseId: 'ac-4', name: 'Unauthorized vehicle access', description: 'Attacker gains physical access to vehicle cabin.', impactArea: 'Privacy' },
  { id: 'dmg-5', abuseCaseId: 'ac-5', name: 'Malicious firmware installed', description: 'Compromised firmware alters vehicle behavior.', impactArea: 'Operational' },
  { id: 'dmg-6', abuseCaseId: 'ac-6', name: 'ECU takeover', description: 'Attacker gains full control of target ECU.', impactArea: 'Safety' },
];

export const mockThreats: ThreatItem[] = [
  { id: 'th-1', damageId: 'dmg-1', name: 'CAN bus message spoofing', description: 'Inject false speed values via OBD-II port.', attackVector: 'Physical access to OBD-II' },
  { id: 'th-2', damageId: 'dmg-2', name: 'CAN bus flooding', description: 'Overwhelm bus with high-priority frames.', attackVector: 'Compromised ECU on bus' },
  { id: 'th-3', damageId: 'dmg-3', name: 'RF relay amplification', description: 'Extend key fob range using relay devices.', attackVector: 'Wireless proximity' },
  { id: 'th-4', damageId: 'dmg-4', name: 'CAN message replay', description: 'Capture and retransmit valid unlock frames.', attackVector: 'Physical CAN access' },
  { id: 'th-5', damageId: 'dmg-5', name: 'TLS downgrade attack', description: 'Force insecure connection to update server.', attackVector: 'Network MITM' },
  { id: 'th-6', damageId: 'dmg-6', name: 'Signature bypass exploit', description: 'Exploit vulnerability in signature verification.', attackVector: 'Software exploit' },
];

export const mockCiaaan: CiaaanItem[] = [
  { id: 'ci-1', threatId: 'th-1', confidentiality: false, integrity: true, availability: true, authenticity: true, authorization: false, nonRepudiation: false },
  { id: 'ci-2', threatId: 'th-2', confidentiality: false, integrity: true, availability: true, authenticity: true, authorization: false, nonRepudiation: false },
  { id: 'ci-3', threatId: 'th-3', confidentiality: true, integrity: true, availability: false, authenticity: true, authorization: true, nonRepudiation: false },
  { id: 'ci-4', threatId: 'th-4', confidentiality: true, integrity: true, availability: false, authenticity: true, authorization: true, nonRepudiation: true },
  { id: 'ci-5', threatId: 'th-5', confidentiality: false, integrity: true, availability: true, authenticity: true, authorization: false, nonRepudiation: true },
  { id: 'ci-6', threatId: 'th-6', confidentiality: true, integrity: true, availability: true, authenticity: true, authorization: true, nonRepudiation: true },
];

export const mockThreatAssets: ThreatAsset[] = [
  { id: 'ta-1', ciaaanId: 'ci-1', name: 'Vehicle Speed Signal', category: 'io' },
  { id: 'ta-2', ciaaanId: 'ci-2', name: 'Braking Torque Request', category: 'io' },
  { id: 'ta-3', ciaaanId: 'ci-3', name: 'Key Fob RF Signal', category: 'io' },
  { id: 'ta-4', ciaaanId: 'ci-4', name: 'Unlock CAN Message', category: 'data' },
  { id: 'ta-5', ciaaanId: 'ci-5', name: 'OTA Update Package', category: 'firmware' },
  { id: 'ta-6', ciaaanId: 'ci-6', name: 'ECU Firmware Image', category: 'firmware' },
];

export const mockAssociatedECUs: AssociatedECU[] = [
  { id: 'ecu-1', assetId: 'ta-1', name: 'Radar Control Unit', type: 'ECU' },
  { id: 'ecu-2', assetId: 'ta-2', name: 'ESC Module', type: 'ECU' },
  { id: 'ecu-3', assetId: 'ta-3', name: 'RF Receiver Module', type: 'Sensor' },
  { id: 'ecu-4', assetId: 'ta-4', name: 'Body Control Module', type: 'ECU' },
  { id: 'ecu-5', assetId: 'ta-5', name: 'Telematics Gateway', type: 'Gateway' },
  { id: 'ecu-6', assetId: 'ta-6', name: 'Target ECU', type: 'ECU' },
];
