/**
 * Settings, "Pipeline runs" (D-61): the run history with its logs, and the buttons that run, pause, resume or cancel one
 * folder and take an uploaded asset list. They moved here from the screens, which only show their results; their logic is
 * unchanged. Execute on 01 Documents runs every folder in order.
 */

import { TooltipProvider } from '@/components/ui/tooltip';
import { TaraProvider } from '@/contexts/TaraContext';
import { RunHistoryDialog } from '@/components/workspace/RunHistoryDialog';
import { StageRunnerPanel } from './StageRunnerPanel';

export function RunsSettings({ assessmentId }: { assessmentId: string }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border px-6 pb-8 pt-[22px]" aria-label="Pipeline runs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[15px] font-semibold">Pipeline runs</h3>
        <TaraProvider projectId={assessmentId}>
          <RunHistoryDialog assessmentId={assessmentId} />
        </TaraProvider>
      </div>
      <p className="m-0 text-[13px] text-muted-foreground">
        Execute on 01 Documents builds everything in order. Use these only to run one stage again, pause or cancel it, or to give the pipeline an asset list of your own.
      </p>
      <TaraProvider projectId={assessmentId}>
        <TooltipProvider delayDuration={200}>
          <StageRunnerPanel assessmentId={assessmentId} stageNums={[4, 5, 6, 7, 8, 9, 10]} onStageStart={() => undefined} />
        </TooltipProvider>
      </TaraProvider>
    </section>
  );
}
