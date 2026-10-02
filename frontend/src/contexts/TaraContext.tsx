'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AssetType = 'data-flow' | 'data-at-rest' | 'function' | 'component' | 'interface' | 'other';

export const assetTypeOptions: { id: AssetType; label: string }[] = [
  { id: 'data-flow', label: 'Data Flow' },
  { id: 'data-at-rest', label: 'Data at Rest' },
  { id: 'function', label: 'Function' },
  { id: 'component', label: 'Component' },
  { id: 'interface', label: 'Interface' },
  { id: 'other', label: 'Other' },
];

export interface TaraAsset {
  id: string;
  assetId: string;
  name: string;
  assetType: AssetType;
  description: string;
  confidentiality: boolean;
  integrity: boolean;
  availability: boolean;
  authenticity: boolean;
  authorization: boolean;
  nonRepudiation: boolean;
  damageScenario: string;
}

export interface TaraThreat {
  id: string;
  threatId: string;
  scenario: string;
  linkedAssetId: string;
  strideCategory: string;
}

export interface TaraDamageScenario {
  id: string;
  damageId: string;
  linkedAssetId: string;
  assetTitle: string;
  property: string;
  scenario: string;
  stakeholderAffected: string;
  createdAt: string;
}

export interface TaraImpact {
  id: string;
  linkedAssetId: string;
  safety: string;
  financial: string;
  operational: string;
  privacy: string;
}

export interface TaraAttackPath {
  id: string;
  linkedThreatId: string;
  attackVector: string;
  description: string;
  narrative: string;
  steps: string[];
}

export interface TaraFeasibility {
  id: string;
  linkedAttackPathId: string;
  factors: Record<string, number>;
}

export interface TaraTreatment {
  id: string;
  linkedThreatId: string;
  riskValue: number;
  decision: string;
  cybersecurityGoal: string;
  cybersecurityClaim: string;
  controls: string;
  residualRisk: number;
}

// ── Raw pipeline output interfaces ───────────────────────────────────────────

interface RawAsset {
  asset_id: string;
  asset_title: string;
  component?: string;
  asset_type?: string;
  asset_description?: string;
  ciaaan?: Record<string, boolean>;
}

interface RawThreat {
  threat_id: string;
  asset_id: string;
  asset_title?: string;
  stride_category: string;
  threat_statement: string;
  damage_scenario_id?: string;
  owasp_reference?: string | null;
}

interface RawDamageScenario {
  damage_id: string;
  asset_id: string;
  asset_title: string;
  property: string;
  damage_scenario: string;
  stakeholder_affected: string;
  created_timestamp?: string;
}

interface RawAttackPath {
  attack_id: string;
  threat_id: string;
  attack_description?: string;
  attack_path?: Record<string, string>;
  cvss_metrics?: { attack_vector?: string };
}

interface RawImpact {
  impact_id: string;
  threat_id: string;
  tool_user?: {
    safety?: string;
    financial?: string;
    operational?: string;
    privacy?: string;
  };
}

interface RawTreatment {
  treatment_id: string;
  threat_id?: string;
  risk_id?: string;
  treatment_option?: string;
  treatment_rationale?: string;
  goal_statement?: string | null;
  claim_statement?: string | null;
  control_ids?: string[];
  residual_risk_expected?: string;
}

// ── Mapper functions ──────────────────────────────────────────────────────────

const STRIDE_MAP: Record<string, string> = {
  'Spoofing': 'spoofing',
  'Tampering': 'tampering',
  'Repudiation': 'repudiation',
  'Information Disclosure': 'information-disclosure',
  'Denial of Service': 'denial-of-service',
  'Elevation of Privilege': 'elevation-of-privilege',
};

const CVSS_VECTOR_MAP: Record<string, string> = {
  N: 'network', A: 'adjacent', L: 'local', P: 'physical',
};

const RATING_MAP: Record<string, string> = {
  Negligible: 'negligible',
  Low: 'moderate',
  Medium: 'moderate',
  Moderate: 'moderate',
  High: 'major',
  Critical: 'severe',
  Severe: 'severe',
};

function mapAsset(raw: RawAsset): TaraAsset {
  return {
    id: raw.asset_id,
    assetId: raw.asset_id,
    name: raw.asset_title,
    assetType: 'other',
    description: raw.asset_description ?? '',
    confidentiality: raw.ciaaan?.confidentiality ?? false,
    integrity: raw.ciaaan?.integrity ?? false,
    availability: raw.ciaaan?.availability ?? false,
    authenticity: raw.ciaaan?.authenticity ?? false,
    authorization: raw.ciaaan?.authorization ?? false,
    nonRepudiation: raw.ciaaan?.non_repudiation ?? false,
    damageScenario: '',
  };
}

function mapThreat(raw: RawThreat): TaraThreat {
  return {
    id: raw.threat_id,
    threatId: raw.threat_id,
    scenario: raw.threat_statement,
    linkedAssetId: raw.asset_id,
    strideCategory: STRIDE_MAP[raw.stride_category]
      ?? raw.stride_category.toLowerCase().replace(/_/g, '-'),
  };
}

function mapDamageScenario(raw: RawDamageScenario): TaraDamageScenario {
  return {
    id: raw.damage_id,
    damageId: raw.damage_id,
    linkedAssetId: raw.asset_id,
    assetTitle: raw.asset_title,
    property: raw.property,
    scenario: raw.damage_scenario,
    stakeholderAffected: raw.stakeholder_affected,
    createdAt: raw.created_timestamp ?? '',
  };
}

const STEP_LABELS = [
  'Initial Precondition',
  'Abuse Technique',
  'Exploit Effect',
  'Control Gap',
  'Threat Realization',
];

function mapAttackPath(raw: RawAttackPath): TaraAttackPath {
  const rawSteps = raw.attack_path ?? {};
  const steps = Object.values(rawSteps);
  return {
    id: raw.attack_id,
    linkedThreatId: raw.threat_id,
    attackVector: CVSS_VECTOR_MAP[raw.cvss_metrics?.attack_vector ?? ''] ?? 'network',
    description: raw.attack_description ?? '',
    narrative: raw.attack_description ?? '',
    steps,
  };
}

function mapImpact(raw: RawImpact, threatIdToAssetId: Map<string, string>): TaraImpact {
  return {
    id: raw.impact_id,
    linkedAssetId: threatIdToAssetId.get(raw.threat_id) ?? raw.threat_id,
    safety: RATING_MAP[raw.tool_user?.safety ?? ''] ?? 'negligible',
    financial: RATING_MAP[raw.tool_user?.financial ?? ''] ?? 'negligible',
    operational: RATING_MAP[raw.tool_user?.operational ?? ''] ?? 'negligible',
    privacy: RATING_MAP[raw.tool_user?.privacy ?? ''] ?? 'negligible',
  };
}

function mapTreatment(raw: RawTreatment): TaraTreatment {
  const riskLevelMap: Record<string, number> = {
    informational: 1, low: 2, medium: 3, high: 4, critical: 5,
  };
  return {
    id: raw.treatment_id,
    linkedThreatId: raw.threat_id ?? '',
    riskValue: riskLevelMap[raw.residual_risk_expected ?? ''] ?? 1,
    decision: raw.treatment_option ?? 'reduce',
    cybersecurityGoal: raw.goal_statement ?? '',
    cybersecurityClaim: raw.claim_statement ?? '',
    controls: (raw.control_ids ?? []).join(', '),
    residualRisk: riskLevelMap[raw.residual_risk_expected ?? ''] ?? 1,
  };
}

// ── Context type ──────────────────────────────────────────────────────────────

type StageStatus = 'not_started' | 'pending' | 'running' | 'complete' | 'failed';

interface TaraContextType {
  assets: TaraAsset[];
  damageScenarios: TaraDamageScenario[];
  threats: TaraThreat[];
  impacts: TaraImpact[];
  attackPaths: TaraAttackPath[];
  feasibilities: TaraFeasibility[];
  treatments: TaraTreatment[];
  stageStatuses: Record<string, StageStatus>;
  runStage: (stageNum: number) => Promise<void>;
  addAsset: (asset: Omit<TaraAsset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<TaraAsset>) => void;
  removeAsset: (id: string) => void;
  addThreat: (threat: Omit<TaraThreat, 'id' | 'threatId'>) => void;
  updateThreat: (id: string, updates: Partial<TaraThreat>) => void;
  removeThreat: (id: string) => void;
  updateImpact: (assetId: string, updates: Partial<TaraImpact>) => void;
  addAttackPath: (path: Omit<TaraAttackPath, 'id'>) => void;
  updateAttackPath: (id: string, updates: Partial<TaraAttackPath>) => void;
  removeAttackPath: (id: string) => void;
  updateFeasibility: (attackPathId: string, factors: Record<string, number>) => void;
  updateTreatment: (threatId: string, updates: Partial<TaraTreatment>) => void;
  getImpactForAsset: (assetId: string) => TaraImpact | undefined;
  getRiskForThreat: (threatId: string) => number;
  saveProgress: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const TaraContext = createContext<TaraContextType | null>(null);

export function useTara() {
  const ctx = useContext(TaraContext);
  if (!ctx) throw new Error('useTara must be used within TaraProvider');
  return ctx;
}

interface TaraProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function TaraProvider({ children, projectId }: TaraProviderProps) {
  const queryClient = useQueryClient();
  const assessmentId = projectId ?? '';

  const { data: stageStatuses } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => api.assessments.get(assessmentId),
    enabled: !!assessmentId,
    refetchInterval: (query) => {
      const stages = query.state.data?.stages ?? {};
      const active = Object.values(stages).some(
        (status) => status === 'pending' || status === 'running'
      );
      return active ? 3000 : false;
    },
    select: (data) => data.stages as Record<string, StageStatus>,
  });

  const { data: rawAssets } = useQuery({
    queryKey: ['stage-output', assessmentId, 3],
    queryFn: () => api.pipeline.output<RawAsset[]>(assessmentId, 3),
    enabled: !!assessmentId && stageStatuses?.['03'] === 'complete',
  });

  const { data: rawDamageScenarios } = useQuery({
    queryKey: ['stage-output', assessmentId, 4],
    queryFn: () => api.pipeline.output<RawDamageScenario[]>(assessmentId, 4),
    enabled: !!assessmentId && stageStatuses?.['04'] === 'complete',
  });

  const { data: rawThreats } = useQuery({
    queryKey: ['stage-output', assessmentId, 5],
    queryFn: () => api.pipeline.output<RawThreat[]>(assessmentId, 5),
    enabled: !!assessmentId && stageStatuses?.['05'] === 'complete',
  });

  const { data: rawAttackPaths } = useQuery({
    queryKey: ['stage-output', assessmentId, 6],
    queryFn: () => api.pipeline.output<RawAttackPath[]>(assessmentId, 6),
    enabled: !!assessmentId && stageStatuses?.['06'] === 'complete',
  });

  const { data: rawImpacts } = useQuery({
    queryKey: ['stage-output', assessmentId, 7],
    queryFn: () => api.pipeline.output<RawImpact[]>(assessmentId, 7),
    enabled: !!assessmentId && stageStatuses?.['07'] === 'complete',
  });

  const { data: rawTreatments } = useQuery({
    queryKey: ['stage-output', assessmentId, 9],
    queryFn: () => api.pipeline.output<RawTreatment[]>(assessmentId, 9),
    enabled: !!assessmentId && stageStatuses?.['09'] === 'complete',
  });

  const assets = (rawAssets ?? []).map(mapAsset);

  const damageScenarios = (rawDamageScenarios ?? []).map(mapDamageScenario);

  const threats = (rawThreats ?? []).map(mapThreat);

  const attackPaths = (rawAttackPaths ?? []).map(mapAttackPath);

  const threatIdToAssetId = new Map(
    (rawThreats ?? []).map((t) => [t.threat_id, t.asset_id])
  );
  const impacts = (rawImpacts ?? []).map((r) => mapImpact(r, threatIdToAssetId));

  const treatments = (rawTreatments ?? []).map(mapTreatment);

  const runStage = async (stageNum: number) => {
    await api.pipeline.run(assessmentId, stageNum);
    queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
  };

  const noop = () => {};
  const asyncNoop = async () => {};

  return (
    <TaraContext.Provider value={{
      assets,
      damageScenarios,
      threats,
      impacts,
      attackPaths,
      feasibilities: [],
      treatments,
      stageStatuses: stageStatuses ?? {},
      runStage,
      addAsset: noop,
      updateAsset: noop,
      removeAsset: noop,
      addThreat: noop,
      updateThreat: noop,
      removeThreat: noop,
      updateImpact: noop,
      addAttackPath: noop,
      updateAttackPath: noop,
      removeAttackPath: noop,
      updateFeasibility: noop,
      updateTreatment: noop,
      getImpactForAsset: (id: string) => impacts.find((i) => i.linkedAssetId === id),
      getRiskForThreat: (_id: string) => 1,
      saveProgress: asyncNoop,
      isSaving: false,
      hasUnsavedChanges: false,
    }}>
      {children}
    </TaraContext.Provider>
  );
}
