/**
 * 07 Residual risk (D-73): one row per risk with the feasibility worked out again with the controls in place. It is built like 04
 * to 06 (specs 29 to 31): the same frame, head, rail, footer and warning; the values are the pipeline's and are not edited here.
 * Out of date, failed and building notices sit in the bottom bar next to the legend, so the table keeps the room.
 */

import type { ReactNode } from 'react';
import type { ResidualRow } from '@/types/stages';
import { ReviewFooter } from './review/ReviewFooter';
import { ReviewFrame } from './review/ReviewFrame';
import { ReviewHead } from './review/ReviewHead';
import { ReviewRail } from './review/ReviewRail';
import { ReviewWarn } from './review/ReviewWarn';
import { useUiStageData } from './review/useUiStageData';
import { ResidualTable } from './residual/ResidualTable';
import { useResidual } from './residual/useResidual';
import '@/styles/tara-stage.css';

interface Props {
  assessmentId: string;
  project: string;
  railToggle: number;
  onRailChange: (open: boolean) => void;
  onOpenDocuments: () => void;
  /** What sits beside the page title: the switch between the sheet and the reports. */
  headerExtra?: ReactNode;
}

export function ResidualStage({ assessmentId, project, railToggle, onRailChange, onOpenDocuments, headerExtra }: Props) {
  const d = useUiStageData<ResidualRow>(assessmentId, '07');
  const { c, v } = useResidual({ assessmentId, data: d.data, rows: d.rows, threads: d.threads, assumptions: d.assumptions, railToggle, onRailChange });
  return (
    <ReviewFrame
      rootClass="tara-stage" rootRef={c.rootRef} onRoot={v.clearSel} project={project} title="Residual risk" compactNotices headerExtra={headerExtra}
      data={d.data} loading={d.output.isLoading} error={d.output.error as Error | null} rebuilding={c.rebuilding} onRebuild={c.rebuild} onOpenDocuments={onOpenDocuments}
      emptyText="The residual risk is worked out after the risks are treated." buildingText="Scoring the risks and choosing their treatment. This usually takes a few minutes."
    >
      <section className="panel rise" aria-label="Residual risk" style={{ ['--i' as string]: 1, flex: '999 1 760px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReviewHead v={v} />
        <ResidualTable v={v} />
        <ReviewFooter v={v} />
      </section>
      <ReviewWarn v={v} />
      <ReviewRail v={v} />
    </ReviewFrame>
  );
}
