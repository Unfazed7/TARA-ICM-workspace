/**
 * The note that says the assessment is the demo (D-67). It sits in the middle of the bottom bar of the table screens
 * (03 to 06), so it takes no room at the top. The pages that have no bottom bar (01, 02 and 07) show it as a small
 * pill fixed to the bottom edge. Blue is the "information" state colour (D-51).
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { stagesApi } from '@/lib/stagesApi';
import { AI_OFF_NOTE, useAiOff } from '@/lib/preview';

export function DemoNote({ floating = false }: { floating?: boolean }) {
  const { assessmentId = '' } = useParams();
  const aiOff = useAiOff();
  const assessment = useQuery({ queryKey: ['assessment', assessmentId], queryFn: () => stagesApi.assessment(assessmentId), enabled: Boolean(assessmentId) });
  if (!assessment.data?.is_demo) return null;

  const note = (
    <p role="note" aria-label="Demo" className="m-0 inline-flex max-w-full items-start gap-2 rounded-[10px] border border-state-blue-border bg-state-blue px-3 py-1 text-[12.5px] font-normal leading-snug text-state-blue-foreground">
      <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>
        <b className="font-semibold">This is a demo.</b> Your changes last until you log out.{aiOff && ` ${AI_OFF_NOTE}.`}
      </span>
    </p>
  );
  if (floating) {
    return <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex justify-center px-4">{note}</div>;
  }
  // In a bottom bar: it takes the free space between the two groups and wraps when there is little of it.
  return <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>{note}</span>;
}
