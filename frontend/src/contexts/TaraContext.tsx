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

type StageStatus = 'not_started' | 'pending' | 'running' | 'complete' | 'failed';

interface TaraContextType {
  assets: TaraAsset[];
  threats: TaraThreat[];
  impacts: TaraImpact[];
  attackPaths: TaraAttackPath[];
  feasibilities: TaraFeasibility[];
  treatments: TaraTreatment[];
  stageStatuses: Record<string, StageStatus>;
  runStage: (stageNum: number) => Promise<void>;
  // Legacy stubs — kept for workspace components not yet migrated
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
      const running = Object.values(stages).includes('running' as StageStatus);
      return running ? 3000 : false;
    },
    select: (data) => data.stages as Record<string, StageStatus>,
  });

  const { data: assetsOutput } = useQuery({
    queryKey: ['stage-output', assessmentId, 1],
    queryFn: () => api.pipeline.output<TaraAsset[]>(assessmentId, 1),
    enabled: !!assessmentId && stageStatuses?.['01'] === 'complete',
  });

  const { data: threatsOutput } = useQuery({
    queryKey: ['stage-output', assessmentId, 3],
    queryFn: () => api.pipeline.output<TaraThreat[]>(assessmentId, 3),
    enabled: !!assessmentId && stageStatuses?.['03'] === 'complete',
  });

  const { data: impactsOutput } = useQuery({
    queryKey: ['stage-output', assessmentId, 5],
    queryFn: () => api.pipeline.output<TaraImpact[]>(assessmentId, 5),
    enabled: !!assessmentId && stageStatuses?.['05'] === 'complete',
  });

  const { data: attackPathsOutput } = useQuery({
    queryKey: ['stage-output', assessmentId, 4],
    queryFn: () => api.pipeline.output<TaraAttackPath[]>(assessmentId, 4),
    enabled: !!assessmentId && stageStatuses?.['04'] === 'complete',
  });

  const { data: treatmentsOutput } = useQuery({
    queryKey: ['stage-output', assessmentId, 7],
    queryFn: () => api.pipeline.output<TaraTreatment[]>(assessmentId, 7),
    enabled: !!assessmentId && stageStatuses?.['07'] === 'complete',
  });

  const runStage = async (stageNum: number) => {
    await api.pipeline.run(assessmentId, stageNum);
    queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
  };

  const noop = () => {};
  const asyncNoop = async () => {};

  return (
    <TaraContext.Provider value={{
      assets: assetsOutput ?? [],
      threats: threatsOutput ?? [],
      impacts: impactsOutput ?? [],
      attackPaths: attackPathsOutput ?? [],
      feasibilities: [],
      treatments: treatmentsOutput ?? [],
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
      getImpactForAsset: (_id: string) => undefined,
      getRiskForThreat: (_id: string) => 1,
      saveProgress: asyncNoop,
      isSaving: false,
      hasUnsavedChanges: false,
    }}>
      {children}
    </TaraContext.Provider>
  );
}
