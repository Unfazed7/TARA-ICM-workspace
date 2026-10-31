/**
 * 05 Threats: one row per threat with its STRIDE category, CVSS factors and attack feasibility (spec 30, D-61 to D-63). A
 * React port of the analyst's design (.meta/design/04-06/Threat.dc.html): its values are in styles/threats-stage.css and
 * threats/useThreats.tsx; CVSS and the feasibility are the engine's. The top bar and the page header are the app's own.
 */

import type { ThreatRow } from '@/types/stages';
import { ReviewFooter } from './review/ReviewFooter';
import { ReviewFrame } from './review/ReviewFrame';
import { ReviewHead } from './review/ReviewHead';
import { ReviewRail } from './review/ReviewRail';
import { ReviewWarn } from './review/ReviewWarn';
import { useUiStageData } from './review/useUiStageData';
import { AttackPathSheet } from './threats/AttackPathSheet';
import { ThreatsTable } from './threats/ThreatsTable';
import { useThreats } from './threats/useThreats';
import '@/styles/threats-stage.css';

interface Props {
  assessmentId: string;
  project: string;
  /** Changes when the top bar's Assumptions button is pressed. */
  railToggle: number;
  onRailChange: (open: boolean) => void;
  onOpenDocuments: () => void;
}

export function ThreatsStage({ assessmentId, project, railToggle, onRailChange, onOpenDocuments }: Props) {
  const d = useUiStageData<ThreatRow>(assessmentId, '05');
  const { c, v } = useThreats({ assessmentId, data: d.data, rows: d.rows, threads: d.threads, assumptions: d.assumptions, railToggle, onRailChange });
  return (
    <ReviewFrame
      rootClass="threats-stage" rootRef={c.rootRef} onRoot={v.clearSel} project={project} title="Threat Analysis"
      data={d.data} loading={d.output.isLoading} error={d.output.error as Error | null} rebuilding={c.rebuilding} onRebuild={c.rebuild} onOpenDocuments={onOpenDocuments}
      emptyText="Threats are analysed after the impacts are rated." buildingText="Finding the threats and their attack paths. This usually takes a few minutes."
    >
      <section className="panel rise" aria-label="Threat scenarios" style={{ ['--i' as string]: 1, flex: '999 1 760px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReviewHead v={v} />
        <ThreatsTable v={v} />
        <ReviewFooter v={v} />
      </section>
      <ReviewWarn v={v} />
      <AttackPathSheet v={v} />
      <ReviewRail v={v} />
    </ReviewFrame>
  );
}
