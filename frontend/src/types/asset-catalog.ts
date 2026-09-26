// Asset Catalog Types for ISO 21434 Clause 15.3

import { CommunicationProtocol } from './communication-protocols';

// Data types that can flow between components
export type DataType = 
  | 'control-signal'
  | 'diagnostic-data'
  | 'sensor-data'
  | 'firmware'
  | 'cryptographic-key'
  | 'calibration-data'
  | 'user-data'
  | 'video-stream'
  | 'audio-stream'
  | 'location-data'
  | 'vehicle-state'
  | 'command'
  | 'configuration'
  | 'log-data'
  | 'authentication-token'
  | 'other';

export const dataTypeOptions: { id: DataType; label: string; description: string }[] = [
  { id: 'control-signal', label: 'Control Signal', description: 'Commands for actuator control' },
  { id: 'diagnostic-data', label: 'Diagnostic Data', description: 'OBD/UDS diagnostic information' },
  { id: 'sensor-data', label: 'Sensor Data', description: 'Raw or processed sensor readings' },
  { id: 'firmware', label: 'Firmware', description: 'Software updates and binary images' },
  { id: 'cryptographic-key', label: 'Cryptographic Key', description: 'Keys for encryption/authentication' },
  { id: 'calibration-data', label: 'Calibration Data', description: 'ECU calibration parameters' },
  { id: 'user-data', label: 'User Data', description: 'Personal/user-specific information' },
  { id: 'video-stream', label: 'Video Stream', description: 'Camera feeds and video data' },
  { id: 'audio-stream', label: 'Audio Stream', description: 'Audio data and voice commands' },
  { id: 'location-data', label: 'Location Data', description: 'GPS and positioning information' },
  { id: 'vehicle-state', label: 'Vehicle State', description: 'Speed, acceleration, status data' },
  { id: 'command', label: 'Command', description: 'System commands and requests' },
  { id: 'configuration', label: 'Configuration', description: 'System settings and preferences' },
  { id: 'log-data', label: 'Log Data', description: 'Event logs and telemetry' },
  { id: 'authentication-token', label: 'Authentication Token', description: 'Session tokens and credentials' },
  { id: 'other', label: 'Other', description: 'Custom data type' },
];

// Cybersecurity properties (CIA triad)
export type CybersecurityProperty = 'confidentiality' | 'integrity' | 'availability';

// Data Flow Asset - represents data in transit between components
export interface DataFlowAsset {
  id: string;
  assetId: string; // DFA-001 format
  name: string;
  description: string;
  sourceComponentId: string;
  sourceComponentName: string;
  targetComponentId: string;
  targetComponentName: string;
  protocol: CommunicationProtocol;
  dataTypes: DataType[];
  cybersecurityProperties: CybersecurityProperty[];
  damageScenarioIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Data At Rest Asset - represents data stored in a component
export interface DataAtRestAsset {
  id: string;
  assetId: string; // DRA-001 format
  name: string;
  description: string;
  componentId: string;
  componentName: string;
  partOf?: string; // Parent system or subsystem
  dataTypes: DataType[];
  cybersecurityProperties: CybersecurityProperty[];
  storageType: 'volatile' | 'non-volatile' | 'secure-element' | 'cloud';
  damageScenarioIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const storageTypeOptions: { id: DataAtRestAsset['storageType']; label: string; description: string }[] = [
  { id: 'volatile', label: 'Volatile Memory', description: 'RAM, temporary storage' },
  { id: 'non-volatile', label: 'Non-Volatile Memory', description: 'Flash, EEPROM, persistent storage' },
  { id: 'secure-element', label: 'Secure Element', description: 'HSM, TPM, secure enclave' },
  { id: 'cloud', label: 'Cloud Storage', description: 'Remote/backend storage' },
];

export const cybersecurityPropertyOptions: { id: CybersecurityProperty; label: string; description: string }[] = [
  { id: 'confidentiality', label: 'Confidentiality', description: 'Protecting data from unauthorized access' },
  { id: 'integrity', label: 'Integrity', description: 'Ensuring data accuracy and trustworthiness' },
  { id: 'availability', label: 'Availability', description: 'Ensuring system accessibility when needed' },
];
