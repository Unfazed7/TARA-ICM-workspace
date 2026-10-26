/**
 * One of the four pipeline pages of the assessment (pills 03 to 06): Assets & Damage, Threat Analysis,
 * Risk & Treatment, Review & Publish. A runner card (stages 03 to 10, run, pause, resume, cancel) over a card of
 * sheets that show each stage's result. Moved here from ProjectWorkspace and restyled to D-51; the data,
 * the runner and the sheets behave as on the pipeline branch. Must sit inside TaraProvider.
 */

import { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, StatusDot } from '@/components/layout/StageShell';
import { StageRunnerPanel } from '@/components/stages/StageRunnerPanel';
import { RunHistoryDialog } from '@/components/workspace/RunHistoryDialog';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';
import { useTara } from '@/contexts/TaraContext';
import { useProjects } from '@/contexts/ProjectContext';
import { phaseDefaultTab, phaseRunnerStages, stageDestination, type WorkflowPhase } from '@/lib/workflow';

export const PHASE_TITLE: Record<WorkflowPhase, string> = {
  'assets-damage': 'Assets & damage',
  'threat-analysis': 'Threat analysis',
  'risk-treatment': 'Risk & treatment',
  'review-publish': 'Review & publish',
};

const PHASE_HINT: Record<WorkflowPhase, string> = {
  'assets-damage': 'Assets are built from the item definition; damage scenarios follow from them.',
  'threat-analysis': 'Threats and attack paths for each damage scenario.',
  'risk-treatment': 'Impact, risk, treatment and what is left after the controls.',
  'review-publish': 'The whole analysis in one place, and the reports.',
};

function SaveDraft({ assessmentId, project }: { assessmentId: string; project: string }) {
  const { saveProgress, isSaving, hasUnsavedChanges, lastSavedAt } = useTara();
  const { updateProject } = useProjects();
  const [open, setOpen] = useState(false);

  const confirm = async () => {
    try {
      await saveProgress();
      await updateProject(assessmentId, { updatedAt: new Date().toISOString() });
      setOpen(false);
      toast.success('Progress saved successfully', {
        description: `${project} — browser draft saved`,
        icon: <CheckCircle2 className="h-4 w-4 text-state-green-foreground" />,
      });
    } catch {
      toast.error('Failed to save progress', { description: 'Please try again' });
    }
  };

  return (
    <>
      {hasUnsavedChanges && <span className="aegis-signal-pill px-2 py-0.5 text-[11px]">Unsaved</span>}
      {lastSavedAt && <span className="hidden sm:inline">Draft saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      <Button variant="outline" size="sm" className="h-[34px] gap-2 rounded-[10px] bg-card text-foreground hover:bg-accent" onClick={() => setOpen(true)}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Save draft
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[100] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save progress</DialogTitle>
            <DialogDescription>Do you want to save the current progress of {project}?</DialogDescription>
          </DialogHeader>
          <p className="m-0 text-sm text-muted-foreground">Edits you make in the sheets are kept as a draft in this browser. The results of the stages stay on the server.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirm} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save progress'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PhasePage({ assessmentId, project, phase, stage02Done }: { assessmentId: string; project: string; phase: WorkflowPhase; stage02Done: boolean }) {
  const { stageStatuses } = useTara();
  const [sheet, setSheet] = useState<string>(phaseDefaultTab[phase]);
  const runnerStages = phase === 'review-publish' ? null : phaseRunnerStages[phase];
  const running = runnerStages?.some((n) => ['pending', 'running'].includes(stageStatuses[String(n).padStart(2, '0')] ?? ''));

  // A stage that starts shows its own sheet.
  const showStageResult = (stageNum: number) => {
    const target = stageDestination[stageNum];
    if (target && target.phase === phase) setSheet(target.tab);
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-[clamp(16px,2.5vw,32px)] pb-12 pt-7">
      <PageHeader
        project={project}
        title={PHASE_TITLE[phase]}
        right={
          <>
            {running && (
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone="blue" /> Running
              </span>
            )}
            <RunHistoryDialog assessmentId={assessmentId} />
            <SaveDraft assessmentId={assessmentId} project={project} />
          </>
        }
      />

      {runnerStages && (
        <section className="aegis-card mb-5" aria-label="Pipeline stages">
          <div className="aegis-card-head">
            <span className="text-[15px] font-semibold">Pipeline stages</span>
            <span className="text-xs text-muted-foreground">{PHASE_HINT[phase]}</span>
          </div>
          <div className="p-[22px]">
            <StageRunnerPanel
              assessmentId={assessmentId}
              stageNums={runnerStages}
              onStageStart={showStageResult}
              statusOverrides={{ '02': stage02Done ? 'complete' : 'not_started' }}
            />
          </div>
        </section>
      )}

      <section className="aegis-card overflow-hidden" aria-label={`${PHASE_TITLE[phase]} results`}>
        <div className="h-[min(78vh,900px)] min-h-[60vh]">
          <WorkspaceTabs activeTab={sheet} onTabChange={setSheet} phase={phase} stageStatuses={stageStatuses} />
        </div>
      </section>
    </div>
  );
}
