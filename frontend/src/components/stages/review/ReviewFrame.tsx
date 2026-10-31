/**
 * The frame of screens 04, 05 and 06: the app's page header, the banners (building, failed, out of date), the empty
 * state and the panel with its side rail. The panel itself comes from the screen (children).
 */

import type { MouseEvent, ReactNode, RefObject } from 'react';
import { PageHeader } from '@/components/layout/StageShell';
import type { UiStageOutput } from '@/types/stages';
import { st } from '../assets/constants';

interface Props {
  rootClass: string;
  rootRef: RefObject<HTMLDivElement>;
  onRoot: (ev: MouseEvent) => void;
  project: string;
  title: string;
  data: UiStageOutput<unknown> | null | undefined;
  loading: boolean;
  error: Error | null;
  rebuilding: boolean;
  onRebuild: () => void;
  onOpenDocuments: () => void;
  emptyText: string;
  buildingText: string;
  children: ReactNode;
}

export function ReviewFrame(p: Props) {
  const d = p.data;
  const building = Boolean(d?.building);
  const failed = d?.folders.find((f) => f.status === 'failed');
  const banner = (tone: 'blue' | 'yellow' | 'red', children: ReactNode, action?: ReactNode) => (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`t-${tone}`} style={st('flex: none; margin-bottom: 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 10px 16px; border-radius: 12px; font-size: 13.5px; font-weight: 500')}>
      <span>{children}</span>
      {action}
    </div>
  );
  const rebuild = (label: string) => <button type="button" className="btn btn-line btn-sm" disabled={p.rebuilding || building} onClick={p.onRebuild}>{label}</button>;

  return (
    <div ref={p.rootRef} className={p.rootClass} style={{ height: 'calc(100dvh - 70px)' }} onClick={p.onRoot}>
      <main style={st('position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; width: 100%; max-width: 1600px; margin: 0 auto; padding: 24px clamp(16px, 2.5vw, 32px) 24px; box-sizing: border-box')}>
        <PageHeader
          project={p.project}
          title={p.title}
          right={d ? (
            <>
              <span>Built from {d.built_from.label}{' '}<span className="mono">run: {d.built_from.run ?? '–'}</span></span>
              {d.has_data && !building && (
                <button type="button" className="tlink" disabled={p.rebuilding} onClick={p.onRebuild} title="Runs this analysis again from the earlier stages. Changes made here are replaced." style={st('padding: 0; font-size: 13px')}>Rebuild</button>
              )}
            </>
          ) : undefined}
        />

        {building && banner('blue', p.buildingText)}
        {!building && failed && banner('red', failed.error || `Building folder ${String(failed.stage_num).padStart(2, '0')} stopped. Try again.`, rebuild('Rebuild'))}
        {!building && !failed && d?.stale.is && banner('yellow', 'This is out of date: a change you made means the later results were not written again.', rebuild('Rebuild'))}

        {p.loading ? (
          <p style={st('margin: 0; padding: 20px 4px; color: #6B6A66')}>Loading...</p>
        ) : p.error ? (
          <p role="alert" style={st('margin: 0; padding: 20px 4px; color: #9F2F2D')}>{p.error.message}</p>
        ) : !d || !d.has_data ? (
          <div className="panel" style={st('padding: 22px 24px')}>
            <p style={st('margin: 0')}>{building ? 'The results appear here as each part is built.' : p.emptyText}</p>
            {!building && <button type="button" className="tlink" onClick={p.onOpenDocuments} style={st('margin-top: 10px; font-size: 14px')}>Add the documents and execute on 01 Documents</button>}
          </div>
        ) : (
          <div style={st('position: relative; flex: 1 1 auto; min-height: 0; display: flex; gap: 0; align-items: stretch')}>{p.children}</div>
        )}
      </main>
    </div>
  );
}
