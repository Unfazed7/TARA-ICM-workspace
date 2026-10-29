/** Stage 03 data for the screen and the top bar: the assets, the comment threads and the Assumptions. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, stagesApi } from '@/lib/stagesApi';
import type { Asset, AssetComment, RationaleItem, Stage03Output } from '@/types/stages';
import { keyOf, splitKey } from './constants';

/** A stage that has not run yet answers 404; that is "nothing yet", not an error. */
export const orNothing = <T,>(p: Promise<T>) => p.catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));

export interface Assumption {
  id: string; // the Rationale id
  label: string; // AS-03-01, for the card
  about: string; // an asset id, or the component an information item is about
  prop: string | null;
  text: string;
  state: 'open' | 'confirmed' | 'disputed' | 'noted';
  item: RationaleItem;
}

export interface Thread {
  key: string;
  messages: AssetComment[];
  resolved: boolean;
}

const ASSET_ID = /^(EXT|NET|INF|WL|DS|IAM|API|COMM)-\d+$/;

export function assumptionsOf(items: RationaleItem[]): Assumption[] {
  return items.map((item, i) => {
    const [about, prop] = (item.affects[0] || '').split('.');
    const needs = item.attention === 'needs_attention';
    const status = item.review.status;
    return {
      id: item.rationale_id,
      label: `AS-03-${String(i + 1).padStart(2, '0')}`,
      about,
      prop: prop || null,
      text: `${item.title}. ${item.concluded}`,
      state: !needs ? 'noted' : status === 'confirmed' ? 'confirmed' : status === 'disputed' ? 'disputed' : 'open',
      item,
    };
  });
}

export function threadsOf(comments: AssetComment[]): Map<string, Thread> {
  const map = new Map<string, Thread>();
  for (const c of comments) {
    const key = keyOf(c.asset_id, c.property);
    const thread = map.get(key) ?? { key, messages: [], resolved: false };
    thread.messages.push(c);
    thread.resolved = c.resolved;
    map.set(key, thread);
  }
  return map;
}

export function useAssetsData(assessmentId: string) {
  const output = useQuery({ queryKey: ['stage03', assessmentId], queryFn: () => orNothing(stagesApi.stage03(assessmentId)) });
  const comments = useQuery({ queryKey: ['comments03', assessmentId], queryFn: () => stagesApi.comments(assessmentId) });
  const rationale = useQuery({ queryKey: ['rationale', assessmentId, '03'], queryFn: () => orNothing(stagesApi.rationale(assessmentId, '03')) });

  const assets = useMemo<Asset[]>(() => (output.data as Stage03Output | null | undefined)?.assets ?? [], [output.data]);
  const threads = useMemo(() => threadsOf(comments.data ?? []), [comments.data]);
  const assumptions = useMemo(() => assumptionsOf(rationale.data?.items ?? []).filter((a) => ASSET_ID.test(a.about) || a.state === 'noted'), [rationale.data]);
  const openAssumptions = assumptions.filter((a) => a.state === 'open');
  const openThreads = [...threads.values()].filter((t) => !t.resolved && assets.some((a) => a.asset_id === splitKey(t.key)[0]));
  return {
    output, comments, rationale, assets, threads, assumptions, openAssumptions, openThreads,
    /** Open Assumptions plus open comment threads: the "need you" count of the top bar and the rail. */
    needCount: openAssumptions.length + openThreads.length,
  };
}
