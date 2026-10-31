/** The data of one screen (04, 05 or 06) for the screen and for the top bar: rows, comment threads and Assumptions. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, stagesApi } from '@/lib/stagesApi';
import type { UiAssumption, UiComment, UiStage, UiStageOutput } from '@/types/stages';

/** A screen whose folders have not run yet answers with no rows, never an error; a missing assessment is an error. */
const orNothing = <T,>(p: Promise<T>) => p.catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));

export interface UiThread {
  key: string;
  recordId: string;
  field: string; // the cell, or `row`
  messages: UiComment[];
  resolved: boolean;
}

export const threadKey = (recordId: string, field: string | null) => `${recordId}.${field ?? 'row'}`;
export const splitKey = (key: string): [string, string] => {
  const at = key.indexOf('.');
  return [key.slice(0, at), key.slice(at + 1)];
};

export function threadsOf(comments: UiComment[]): Map<string, UiThread> {
  const map = new Map<string, UiThread>();
  for (const c of comments) {
    const key = threadKey(c.record_id, c.field);
    const thread = map.get(key) ?? { key, recordId: c.record_id, field: c.field ?? 'row', messages: [], resolved: false };
    thread.messages.push(c);
    thread.resolved = c.resolved;
    map.set(key, thread);
  }
  return map;
}

export function useUiStageData<Row>(assessmentId: string, ui: UiStage) {
  const output = useQuery({
    queryKey: ['ui-stage', assessmentId, ui],
    queryFn: () => orNothing(stagesApi.uiStage<Row>(assessmentId, ui)),
    refetchInterval: (q) => (q.state.data?.building ? 2000 : false),
  });
  const comments = useQuery({ queryKey: ['ui-comments', assessmentId, ui], queryFn: () => stagesApi.uiComments(assessmentId, ui) });
  const data = output.data as UiStageOutput<Row> | null | undefined;
  const rows = useMemo<Row[]>(() => data?.rows ?? [], [data]);
  const threads = useMemo(() => threadsOf(comments.data ?? []), [comments.data]);
  const assumptions: UiAssumption[] = useMemo(() => data?.assumptions ?? [], [data]);
  const openAssumptions = assumptions.filter((a) => a.status === 'open' && a.record_id);
  const known = new Set((data?.rows ?? []).map((r) => (r as { record_id: string }).record_id));
  const openThreads = [...threads.values()].filter((t) => !t.resolved && known.has(t.recordId));
  return {
    output, comments, data, rows, threads, assumptions, openAssumptions, openThreads,
    /** Open Assumptions plus open comment threads: the "need you" count of the top bar and the rail. */
    needCount: openAssumptions.length + openThreads.length,
  };
}
