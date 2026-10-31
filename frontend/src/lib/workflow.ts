export type WorkflowPhase = 'assets-damage' | 'impacts' | 'threat-analysis' | 'risk-treatment' | 'review-publish';
export type StageStatus = 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed';

export const workflowStages: Record<WorkflowPhase, number[]> = {
  'assets-damage': [3, 4],
  // Pill 04 Impacts: Stage 03 is the 03 Assets screen (D-59), so this page runs Stage 04 alone.
  impacts: [4],
  'threat-analysis': [5, 6],
  'risk-treatment': [7, 8, 9, 10],
  'review-publish': [9],
};

export function calculateWorkflowProgress(
  phase: WorkflowPhase,
  statuses: Record<string, StageStatus>,
): number {
  const stages = workflowStages[phase];
  const complete = stages.filter((stage) => statuses[String(stage).padStart(2, '0')] === 'complete').length;
  return stages.length ? Math.round((complete / stages.length) * 100) : 0;
}

export function calculateSheetProgress(
  sheetStages: Array<number | undefined>,
  statuses: Record<string, StageStatus>,
): number {
  if (!sheetStages.length) return 0;
  const complete = sheetStages.filter((stage) => (
    stage !== undefined && statuses[String(stage).padStart(2, '0')] === 'complete'
  )).length;
  return Math.round((complete / sheetStages.length) * 100);
}

export function canRunStage(
  stage: { available: boolean; dependencies: number[] },
  status: StageStatus,
  statuses: Record<string, StageStatus>,
): boolean {
  return stage.available
    && stage.dependencies.every((dependency) => statuses[String(dependency).padStart(2, '0')] === 'complete')
    && (status === 'not_started' || status === 'failed' || status === 'cancelled');
}

// ── Sheets inside a phase (moved from WorkspaceTabs and ProjectWorkspace, values unchanged) ──

export type TaraTab =
  | 'asset-id' | 'damage-analysis' | 'threat-analysis' | 'attack-trees' | 'impact-rating' | 'attack-path'
  | 'feasibility' | 'risk-treatment' | 'cybersecurity-goals' | 'residual-risk' | 'final-tara' | 'reports';

export const phaseTabs: Record<WorkflowPhase, TaraTab[]> = {
  'assets-damage': ['asset-id', 'damage-analysis'],
  impacts: ['damage-analysis'],
  'threat-analysis': ['threat-analysis', 'attack-trees', 'attack-path'],
  'risk-treatment': ['impact-rating', 'feasibility', 'risk-treatment', 'cybersecurity-goals', 'residual-risk'],
  // Pills 04 to 06 are screens of their own (specs 29 to 31). The sheets that have no screen moved here, so every one stays reachable.
  'review-publish': ['final-tara', 'reports', 'attack-trees', 'cybersecurity-goals', 'residual-risk'],
};

/** The pipeline stage each sheet shows. Residual risk is Stage 10 (D-55). */
export const stageForTab: Partial<Record<TaraTab, number>> = {
  'asset-id': 3,
  'damage-analysis': 4,
  'threat-analysis': 5,
  'attack-trees': 6,
  'attack-path': 6,
  'impact-rating': 7,
  'feasibility': 8,
  'risk-treatment': 9,
  'cybersecurity-goals': 9,
  'residual-risk': 10,
  'final-tara': 9,
};

/** The sheet a phase opens on. */
export const phaseDefaultTab: Record<WorkflowPhase, TaraTab> = {
  'assets-damage': 'asset-id',
  impacts: 'damage-analysis',
  'threat-analysis': 'threat-analysis',
  'risk-treatment': 'impact-rating',
  'review-publish': 'final-tara',
};

/** Where the result of a pipeline stage is shown. */
export const stageDestination: Record<number, { phase: WorkflowPhase; tab: TaraTab }> = {
  3: { phase: 'assets-damage', tab: 'asset-id' },
  4: { phase: 'impacts', tab: 'damage-analysis' },
  5: { phase: 'threat-analysis', tab: 'threat-analysis' },
  6: { phase: 'review-publish', tab: 'attack-trees' },
  7: { phase: 'risk-treatment', tab: 'impact-rating' },
  8: { phase: 'risk-treatment', tab: 'feasibility' },
  9: { phase: 'review-publish', tab: 'cybersecurity-goals' },
  10: { phase: 'review-publish', tab: 'residual-risk' },
};

/** The pipeline folders each of pills 04 to 06 shows (D-61), and the folder it starts a rebuild from. */
export const screenFolders: Record<'04' | '05' | '06', number[]> = {
  '04': [4, 7],
  '05': [5, 6],
  '06': [8, 9, 10],
};

/** The stages shown in the runner of a phase. */
export const phaseRunnerStages: Record<Exclude<WorkflowPhase, 'review-publish'>, number[]> = {
  'assets-damage': [3, 4],
  impacts: [4],
  'threat-analysis': [5, 6],
  'risk-treatment': [7, 8, 9, 10],
};
