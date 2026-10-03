export type WorkflowPhase = 'assets-damage' | 'threat-analysis' | 'risk-treatment' | 'review-publish';
export type StageStatus = 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed';

export const workflowStages: Record<WorkflowPhase, number[]> = {
  'assets-damage': [3, 4],
  'threat-analysis': [5, 6],
  'risk-treatment': [7, 8, 9],
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
