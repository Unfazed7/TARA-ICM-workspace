'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Assessment } from '@/types/api';
import {
  calculateRiskValue,
  feasibilityLevelToNumber,
  getFeasibilityLevel,
  impactToNumber,
  type FeasibilityFactors,
  type ImpactLevel,
  type TreatmentDecision,
} from '@/types/risk-assessment';

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
  safety: ImpactLevel;
  financial: ImpactLevel;
  operational: ImpactLevel;
  privacy: ImpactLevel;
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
  factors: FeasibilityFactors;
}

export interface TaraTreatment {
  id: string;
  linkedThreatId: string;
  riskValue: number;
  decision: TreatmentDecision;
  cybersecurityGoal: string;
  cybersecurityClaim: string;
  controls: string;
  residualRisk: number;
  postFeasibilityFactors?: FeasibilityFactors;
}

interface TaraDraft {
  assets?: TaraAsset[];
  threats?: TaraThreat[];
  impacts?: TaraImpact[];
  attackPaths?: TaraAttackPath[];
  feasibilities?: TaraFeasibility[];
  treatments?: TaraTreatment[];
  savedAt?: string;
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

const RATING_MAP: Record<string, ImpactLevel> = {
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
    decision: (['avoid', 'reduce', 'share', 'accept'].includes(raw.treatment_option ?? '') ? raw.treatment_option : 'reduce') as TreatmentDecision,
    cybersecurityGoal: raw.goal_statement ?? '',
    cybersecurityClaim: raw.claim_statement ?? '',
    controls: (raw.control_ids ?? []).join(', '),
    residualRisk: riskLevelMap[raw.residual_risk_expected ?? ''] ?? 1,
  };
}

// ── Context type ──────────────────────────────────────────────────────────────

type StageStatus = 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed';

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
  pauseStage: (stageNum: number) => Promise<void>;
  resumeStage: (stageNum: number) => Promise<void>;
  cancelStage: (stageNum: number) => Promise<void>;
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
  updateFeasibility: (attackPathId: string, factors: FeasibilityFactors) => void;
  updateTreatment: (threatId: string, updates: Partial<TaraTreatment>) => void;
  getImpactForAsset: (assetId: string) => TaraImpact | undefined;
  getRiskForThreat: (threatId: string) => number;
  saveProgress: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  persistenceMode: 'local-draft';
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
  const draftKey = `autotara:draft:${assessmentId}`;
  const [draft, setDraft] = useState<TaraDraft>(() => {
    if (!assessmentId) return {};
    try {
      return JSON.parse(localStorage.getItem(draftKey) ?? '{}') as TaraDraft;
    } catch {
      return {};
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;
    try {
      setDraft(JSON.parse(localStorage.getItem(draftKey) ?? '{}') as TaraDraft);
    } catch {
      setDraft({});
    }
    setHasUnsavedChanges(false);
  }, [assessmentId, draftKey]);

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

  const pipelineAssets = useMemo(() => (rawAssets ?? []).map(mapAsset), [rawAssets]);

  const damageScenarios = useMemo(
    () => (rawDamageScenarios ?? []).map(mapDamageScenario),
    [rawDamageScenarios],
  );

  const pipelineThreats = useMemo(() => (rawThreats ?? []).map(mapThreat), [rawThreats]);

  const pipelineAttackPaths = useMemo(
    () => (rawAttackPaths ?? []).map(mapAttackPath),
    [rawAttackPaths],
  );

  const pipelineImpacts = useMemo(() => {
    const threatIdToAssetId = new Map(
      (rawThreats ?? []).map((threat) => [threat.threat_id, threat.asset_id]),
    );
    return (rawImpacts ?? []).map((impact) => mapImpact(impact, threatIdToAssetId));
  }, [rawImpacts, rawThreats]);

  const pipelineTreatments = useMemo(
    () => (rawTreatments ?? []).map(mapTreatment),
    [rawTreatments],
  );

  const assets = draft.assets ?? pipelineAssets;
  const threats = draft.threats ?? pipelineThreats;
  const impacts = draft.impacts ?? pipelineImpacts;
  const attackPaths = draft.attackPaths ?? pipelineAttackPaths;
  const feasibilities = draft.feasibilities ?? [];
  const treatments = draft.treatments ?? pipelineTreatments;

  const updateDraft = useCallback((updater: (current: TaraDraft) => TaraDraft) => {
    setDraft((current) => updater(current));
    setHasUnsavedChanges(true);
  }, []);

  const persistDraft = useCallback(async () => {
    if (!assessmentId) return;
    setIsSaving(true);
    try {
      setDraft((current) => {
        const next = { ...current, savedAt: new Date().toISOString() };
        localStorage.setItem(draftKey, JSON.stringify(next));
        return next;
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [assessmentId, draftKey]);

  useEffect(() => {
    if (!hasUnsavedChanges || !assessmentId) return;
    const timer = window.setTimeout(() => void persistDraft(), 1200);
    return () => window.clearTimeout(timer);
  }, [assessmentId, hasUnsavedChanges, persistDraft]);

  const runStage = async (stageNum: number) => {
    const queryKey = ['assessment', assessmentId] as const;
    const previous = queryClient.getQueryData<Assessment>(queryKey);
    const stageKey = String(stageNum).padStart(2, '0');
    if (previous) {
      queryClient.setQueryData<Assessment>(queryKey, {
        ...previous,
        stages: { ...previous.stages, [stageKey]: 'pending' },
      });
    }
    try {
      const result = await api.pipeline.run(assessmentId, stageNum);
      queryClient.setQueryData<Assessment>(queryKey, (current) => current ? {
        ...current,
        stages: { ...current.stages, [stageKey]: result.status },
      } : current);
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw error;
    }
  };

  const controlStage = async (
    stageNum: number,
    action: 'pause' | 'resume' | 'cancel',
    optimisticStatus: StageStatus,
  ) => {
    const queryKey = ['assessment', assessmentId] as const;
    const previous = queryClient.getQueryData<Assessment>(queryKey);
    const stageKey = String(stageNum).padStart(2, '0');
    if (previous) {
      queryClient.setQueryData<Assessment>(queryKey, {
        ...previous,
        stages: { ...previous.stages, [stageKey]: optimisticStatus },
      });
    }
    try {
      const result = await api.pipeline[action](assessmentId, stageNum);
      queryClient.setQueryData<Assessment>(queryKey, (current) => current ? {
        ...current,
        stages: { ...current.stages, [stageKey]: result.status },
      } : current);
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      if (previous) queryClient.setQueryData(queryKey, previous);
      throw error;
    }
  };

  const addAsset = (asset: Omit<TaraAsset, 'id'>) => updateDraft((current) => ({
    ...current,
    assets: [...(current.assets ?? pipelineAssets), { ...asset, id: crypto.randomUUID() }],
  }));
  const updateAsset = (id: string, updates: Partial<TaraAsset>) => updateDraft((current) => ({
    ...current,
    assets: (current.assets ?? pipelineAssets).map((item) => item.id === id ? { ...item, ...updates } : item),
  }));
  const removeAsset = (id: string) => updateDraft((current) => ({
    ...current,
    assets: (current.assets ?? pipelineAssets).filter((item) => item.id !== id),
  }));
  const addThreat = (threat: Omit<TaraThreat, 'id' | 'threatId'>) => updateDraft((current) => {
    const id = `THR-${String((current.threats ?? pipelineThreats).length + 1).padStart(3, '0')}`;
    return { ...current, threats: [...(current.threats ?? pipelineThreats), { ...threat, id, threatId: id }] };
  });
  const updateThreat = (id: string, updates: Partial<TaraThreat>) => updateDraft((current) => ({
    ...current,
    threats: (current.threats ?? pipelineThreats).map((item) => item.id === id ? { ...item, ...updates } : item),
  }));
  const removeThreat = (id: string) => updateDraft((current) => ({
    ...current,
    threats: (current.threats ?? pipelineThreats).filter((item) => item.id !== id),
  }));
  const updateImpact = (assetId: string, updates: Partial<TaraImpact>) => updateDraft((current) => {
    const source = current.impacts ?? pipelineImpacts;
    const existing = source.find((item) => item.linkedAssetId === assetId);
    return {
      ...current,
      impacts: existing
        ? source.map((item) => item.linkedAssetId === assetId ? { ...item, ...updates } : item)
        : [...source, { id: crypto.randomUUID(), linkedAssetId: assetId, safety: 'negligible', financial: 'negligible', operational: 'negligible', privacy: 'negligible', ...updates }],
    };
  });
  const addAttackPath = (path: Omit<TaraAttackPath, 'id'>) => updateDraft((current) => ({
    ...current,
    attackPaths: [...(current.attackPaths ?? pipelineAttackPaths), { ...path, id: crypto.randomUUID() }],
  }));
  const updateAttackPath = (id: string, updates: Partial<TaraAttackPath>) => updateDraft((current) => ({
    ...current,
    attackPaths: (current.attackPaths ?? pipelineAttackPaths).map((item) => item.id === id ? { ...item, ...updates } : item),
  }));
  const removeAttackPath = (id: string) => updateDraft((current) => ({
    ...current,
    attackPaths: (current.attackPaths ?? pipelineAttackPaths).filter((item) => item.id !== id),
  }));
  const updateFeasibility = (attackPathId: string, factors: FeasibilityFactors) => updateDraft((current) => {
    const source = current.feasibilities ?? [];
    const existing = source.find((item) => item.linkedAttackPathId === attackPathId);
    return {
      ...current,
      feasibilities: existing
        ? source.map((item) => item.linkedAttackPathId === attackPathId ? { ...item, factors } : item)
        : [...source, { id: crypto.randomUUID(), linkedAttackPathId: attackPathId, factors }],
    };
  });
  const updateTreatment = (threatId: string, updates: Partial<TaraTreatment>) => updateDraft((current) => {
    const source = current.treatments ?? pipelineTreatments;
    const existing = source.find((item) => item.linkedThreatId === threatId);
    return {
      ...current,
      treatments: existing
        ? source.map((item) => item.linkedThreatId === threatId ? { ...item, ...updates } : item)
        : [...source, { id: crypto.randomUUID(), linkedThreatId: threatId, riskValue: 1, decision: 'reduce', cybersecurityGoal: '', cybersecurityClaim: '', controls: '', residualRisk: 1, ...updates }],
    };
  });

  const getRiskForThreat = (threatId: string) => {
    const treatment = treatments.find((item) => item.linkedThreatId === threatId);
    if (treatment?.riskValue) return treatment.riskValue;

    const threat = threats.find((item) => item.id === threatId || item.threatId === threatId);
    if (!threat) return 1;

    const impact = impacts.find((item) => item.linkedAssetId === threat.linkedAssetId);
    const attackPath = attackPaths.find((item) => item.linkedThreatId === threat.id || item.linkedThreatId === threat.threatId);
    const feasibility = attackPath
      ? feasibilities.find((item) => item.linkedAttackPathId === attackPath.id)
      : undefined;

    const maximumImpact = impact
      ? Math.max(
          impactToNumber(impact.safety),
          impactToNumber(impact.financial),
          impactToNumber(impact.operational),
          impactToNumber(impact.privacy),
        )
      : 1;
    const feasibilityValue = feasibility
      ? feasibilityLevelToNumber(getFeasibilityLevel(feasibility.factors))
      : 1;

    return calculateRiskValue(maximumImpact, feasibilityValue);
  };

  return (
    <TaraContext.Provider value={{
      assets,
      damageScenarios,
      threats,
      impacts,
      attackPaths,
      feasibilities,
      treatments,
      stageStatuses: stageStatuses ?? {},
      runStage,
      pauseStage: (stageNum) => controlStage(stageNum, 'pause', 'paused'),
      resumeStage: (stageNum) => controlStage(stageNum, 'resume', 'running'),
      cancelStage: (stageNum) => controlStage(stageNum, 'cancel', 'cancelled'),
      addAsset,
      updateAsset,
      removeAsset,
      addThreat,
      updateThreat,
      removeThreat,
      updateImpact,
      addAttackPath,
      updateAttackPath,
      removeAttackPath,
      updateFeasibility,
      updateTreatment,
      getImpactForAsset: (id: string) => impacts.find((i) => i.linkedAssetId === id),
      getRiskForThreat,
      saveProgress: persistDraft,
      isSaving,
      hasUnsavedChanges,
      lastSavedAt: draft.savedAt ?? null,
      persistenceMode: 'local-draft',
    }}>
      {children}
    </TaraContext.Provider>
  );
}
