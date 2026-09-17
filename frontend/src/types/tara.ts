export type NodeType = 'folder' | 'ecu' | 'sensor' | 'actuator' | 'gateway' | 'network';

export interface ProjectNode {
  id: string;
  name: string;
  type: NodeType;
  layer?: 'powertrain' | 'infotainment' | 'chassis' | 'adas' | 'body';
  children?: ProjectNode[];
  expanded?: boolean;
}

export interface ThreatEntry {
  id: string;
  name: string;
  targetNode: string;
  attackVector: string;
  impact: 'safety' | 'financial' | 'operational' | 'privacy';
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: number;
}

export interface AssetEntry {
  id: string;
  name: string;
  type: string;
  securityGoals: ('confidentiality' | 'integrity' | 'availability')[];
  associatedECUs: string[];
}

export type WorkspaceTab = 'asset-list' | 'threats' | 'risk-grid' | 'reports';

export type ModuleType = 'feature-analysis' | 'assumption-scope' | 'item-definition' | 'tara';

export type CALLevel = 1 | 2 | 3 | 4;

export type ImpactLevel = 'severe' | 'major' | 'moderate' | 'negligible';
export type AttackVector = 'network' | 'adjacent' | 'local' | 'physical';

export interface CybersecurityGoal {
  id: string;
  description: string;
  allocatedCAL: CALLevel | null;
  rationale: string;
  selected?: boolean;
}

export type UserRole = 'engineer' | 'analyst' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface StoredUser extends User {
  password: string;
}

export type ProjectScope = 'vehicle' | 'domain' | 'component' | 'ecu';
export type WorkflowMode = 'ai-assisted' | 'guided' | 'manual';

// New types for project management
export type VehicleType = 'sedan' | 'suv' | 'truck' | 'electric' | 'commercial' | 'motorcycle' | 'other';

export type ProjectDomain = 'powertrain' | 'chassis' | 'infotainment' | 'networks' | 'adas' | 'body';

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  vehicleType: VehicleType;
  catalogVersion: string;
  domains: ProjectDomain[];
  scope: ProjectScope;
  workflowMode: WorkflowMode;
  objectives?: string;
  directory?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  // Statistics
  threatCount?: number;
  riskCount?: number;
  completionPercentage?: number;
}

export interface ProjectConfig {
  scope: ProjectScope;
  workflowMode: WorkflowMode;
  name?: string;
}

// Vehicle type options for dropdowns
export const vehicleTypeOptions: { id: VehicleType; label: string }[] = [
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'truck', label: 'Truck' },
  { id: 'electric', label: 'Electric Vehicle' },
  { id: 'commercial', label: 'Commercial Vehicle' },
  { id: 'motorcycle', label: 'Motorcycle' },
  { id: 'other', label: 'Other' },
];

// Domain options for checkboxes
export const domainOptions: { id: ProjectDomain; label: string; description: string }[] = [
  { id: 'powertrain', label: 'Powertrain', description: 'Engine, transmission, and drivetrain systems' },
  { id: 'chassis', label: 'Chassis & Safety', description: 'Braking, steering, and suspension systems' },
  { id: 'infotainment', label: 'Infotainment', description: 'Audio, navigation, and connectivity systems' },
  { id: 'networks', label: 'Communication Networks', description: 'CAN, LIN, Ethernet, and wireless networks' },
  { id: 'adas', label: 'ADAS Components', description: 'Advanced driver assistance systems' },
  { id: 'body', label: 'Body Electronics', description: 'Lighting, climate, and comfort systems' },
];

// ISO catalog versions
export const catalogVersionOptions = [
  { id: 'iso21434-2021', label: 'ISO/SAE 21434:2021' },
  { id: 'iso21434-2024', label: 'ISO/SAE 21434:2024 (Draft)' },
  { id: 'unece-r155', label: 'UNECE R155' },
  { id: 'unece-r156', label: 'UNECE R156' },
];
