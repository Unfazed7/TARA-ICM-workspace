import type { PipelineStatus } from '@/types/stages';

/** True while Execute is running any of its steps: Stages 01 to 03, or one of folders 04 to 10. */
export const isPipelineActive = (p?: PipelineStatus): boolean =>
  !!p?.stages.some((s) => s.status === 'pending' || s.status === 'running') ||
  !!p?.folders?.some((f) => ['pending', 'running', 'paused'].includes(f.status));
