/**
 * 06 TARA: one row per risk with its treatment and cybersecurity goal (spec 31, D-61 to D-63). A React port of the analyst's
 * design (.meta/design/04-06/Tara.dc.html): its values are in styles/tara-stage.css and tara/useTara.tsx; the score, level,
 * treatment and residual risk are the pipeline's. The top bar and the page header are the app's own.
 */

import type { TaraRow } from '@/types/stages';
import { ReviewFooter } from './review/ReviewFooter';
import { ReviewFrame } from './review/ReviewFrame';
import { ReviewHead } from './review/ReviewHead';
import { ReviewRail } from './review/ReviewRail';
import { ReviewWarn } from './review/ReviewWarn';
import { useUiStageData } from './review/useUiStageData';
import { TaraTable } from './tara/TaraTable';
import { useTara } from './tara/useTara';
import '@/styles/tara-stage.css';

interface Props {
  assessmentId: string;
  project: string;
  /** Changes when the top bar's Assumptions button is pressed. */
  railToggle: number;
  onRailChange: (open: boolean) => void;
  onOpenDocuments: () => void;
}

export function TaraStage({ assessmentId, project, railToggle, onRailChange, onOpenDocuments }: Props) {
  const d = useUiStageData<TaraRow>(assessmentId, '06');
  const { c, v } = useTara({ assessmentId, data: d.data, rows: d.rows, threads: d.threads, assumptions: d.assumptions, railToggle, onRailChange });
  return (
    <ReviewFrame
      rootClass="tara-stage" rootRef={c.rootRef} onRoot={v.clearSel} project={project} title="TARA"
      data={d.data} loading={d.output.isLoading} error={d.output.error as Error | null} rebuilding={c.rebuilding} onRebuild={c.rebuild} onOpenDocuments={onOpenDocuments}
      emptyText="Risks are scored after the impacts and threats are analysed." buildingText="Scoring the risks and choosing their treatment. This usually takes a few minutes."
    >
      <section className="panel rise" aria-label="Risks" style={{ ['--i' as string]: 1, flex: '999 1 760px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReviewHead v={v} />
        <TaraTable v={v} />
        <ReviewFooter v={v} />
      </section>
      <ReviewWarn v={v} />
      <ReviewRail v={v} />
    </ReviewFrame>
  );
}
