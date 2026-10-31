/**
 * 04 Impacts: one row per damage scenario with its impact ratings (spec 29, D-61 to D-63). A React port of the analyst's
 * design (.meta/design/04-06/Impact.dc.html): its values are in styles/impacts-stage.css and impacts/useImpacts.tsx; the
 * levels and the overall rating are the pipeline's. The top bar and the page header are the app's own.
 */

import type { ImpactRow } from '@/types/stages';
import { ImpactsTable } from './impacts/ImpactsTable';
import { useImpacts } from './impacts/useImpacts';
import { ReviewFooter } from './review/ReviewFooter';
import { ReviewFrame } from './review/ReviewFrame';
import { ReviewHead } from './review/ReviewHead';
import { ReviewRail } from './review/ReviewRail';
import { ReviewWarn } from './review/ReviewWarn';
import { useUiStageData } from './review/useUiStageData';
import '@/styles/impacts-stage.css';

interface Props {
  assessmentId: string;
  project: string;
  /** Changes when the top bar's Assumptions button is pressed. */
  railToggle: number;
  onRailChange: (open: boolean) => void;
  onOpenDocuments: () => void;
}

export function ImpactsStage({ assessmentId, project, railToggle, onRailChange, onOpenDocuments }: Props) {
  const d = useUiStageData<ImpactRow>(assessmentId, '04');
  const { c, v } = useImpacts({ assessmentId, data: d.data, rows: d.rows, threads: d.threads, assumptions: d.assumptions, railToggle, onRailChange });
  return (
    <ReviewFrame
      rootClass="impacts-stage" rootRef={c.rootRef} onRoot={v.clearSel} project={project} title="Impact Analysis"
      data={d.data} loading={d.output.isLoading} error={d.output.error as Error | null} rebuilding={c.rebuilding} onRebuild={c.rebuild} onOpenDocuments={onOpenDocuments}
      emptyText="Impacts are rated after the assets are built." buildingText="Rating the impacts of the damage scenarios. This usually takes a few minutes."
    >
      <section className="panel rise" aria-label="Damage scenarios" style={{ ['--i' as string]: 1, flex: '999 1 760px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReviewHead v={v} />
        <ImpactsTable v={v} />
        <ReviewFooter v={v} />
      </section>
      <ReviewWarn v={v} />
      <ReviewRail v={v} />
    </ReviewFrame>
  );
}
