/**
 * 03 Assets: the asset list with its six cybersecurity properties, and the side panel for Assumptions, reasons
 * and comments (spec 28, D-56 to D-60). A React port of the analyst's design (.meta/design/03-assets): the values
 * are in styles/assets-stage.css and assets/constants.ts. The top bar and the page header are the app's own.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/StageShell';
import { stagesApi } from '@/lib/stagesApi';
import type { Asset, AssetComment, PropertyCode, Stage03Output } from '@/types/stages';
import { AssetTable } from './assets/AssetTable';
import { SidePanel } from './assets/SidePanel';
import { keyOf, splitKey, st } from './assets/constants';
import { useAssetsData, type Assumption } from './assets/useAssetsData';
import '@/styles/assets-stage.css';

const DENSITY_KEY = 'aegis:assets:compact';
const readDensity = () => {
  try {
    return localStorage.getItem(DENSITY_KEY) === '1';
  } catch {
    return false;
  }
};

interface Props {
  assessmentId: string;
  project: string;
  /** Changes when the top bar's Assumptions button is pressed. */
  railToggle: number;
  onRailChange: (open: boolean) => void;
  onOpenDocuments: () => void;
}

const message = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Try again.');

export function AssetsStage({ assessmentId, project, railToggle, onRailChange, onOpenDocuments }: Props) {
  const queryClient = useQueryClient();
  const { output, assets, threads, assumptions, openAssumptions, needCount } = useAssetsData(assessmentId);
  const data = output.data as Stage03Output | null | undefined;
  const pipeline = useQuery({
    queryKey: ['pipeline', assessmentId],
    queryFn: () => stagesApi.pipeline(assessmentId),
    refetchInterval: (q) => (q.state.data?.stages.some((s) => s.status === 'pending' || s.status === 'running') ? 2000 : false),
  });
  const job03 = pipeline.data?.stages.find((s) => s.stage === '03');
  const building = job03?.status === 'pending' || job03?.status === 'running';

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openDesc, setOpenDesc] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'notes'>('all');
  const [q, setQ] = useState('');
  const [compact, setCompact] = useState(readDensity);
  const [legend, setLegend] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [rail, setRail] = useState(false);
  const [closing, setClosing] = useState(false);
  const [railFilter, setRailFilter] = useState<'open' | 'resolved'>('open');
  const [reply, setReply] = useState('');
  const [draft, setDraft] = useState('');
  const [changing, setChanging] = useState(false);
  const [focusReply, setFocusReply] = useState(0);
  const [busy, setBusy] = useState(false);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onRailChange(rail && !closing), [rail, closing, onRailChange]);
  useEffect(() => () => { if (tick.current) clearTimeout(tick.current); if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const resetSel = (key: string | null) => { setSel(key); setReply(''); setDraft(''); setChanging(false); };
  const closeRail = useCallback((clearSel = false) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => { setRail(false); setClosing(false); if (clearSel) setSel(null); }, 420);
  }, []);
  const openRail = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setClosing(false); setRail(true); };

  // The top bar's Assumptions button.
  const lastToggle = useRef(railToggle);
  useEffect(() => {
    if (railToggle === lastToggle.current) return;
    lastToggle.current = railToggle;
    if (rail && !closing) closeRail();
    else openRail();
  }, [railToggle, rail, closing, closeRail]);

  const setDensity = () => {
    const next = !compact;
    setCompact(next);
    try { localStorage.setItem(DENSITY_KEY, next ? '1' : '0'); } catch { /* the choice is only a convenience */ }
  };

  // ── data changes, shown at once and put back when the server refuses ───────

  const key03 = ['stage03', assessmentId];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key03 });
    queryClient.invalidateQueries({ queryKey: ['rationale', assessmentId, '03'] });
    queryClient.invalidateQueries({ queryKey: ['comments03', assessmentId] });
    queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
    queryClient.invalidateQueries({ queryKey: ['stage-output', assessmentId, 3] });
    queryClient.invalidateQueries({ queryKey: ['asset-register-upload', assessmentId] });
  };
  const optimistic = async (edit: (a: Asset) => Asset, assetId: string, call: () => Promise<unknown>) => {
    const before = queryClient.getQueryData<Stage03Output | null>(key03);
    if (before) queryClient.setQueryData(key03, { ...before, assets: before.assets.map((a) => (a.asset_id === assetId ? edit(a) : a)) });
    try {
      await call();
      refresh();
    } catch (err) {
      queryClient.setQueryData(key03, before);
      toast.error(message(err));
      throw err;
    }
  };
  const withProp = (code: PropertyCode, patch: Partial<Asset['properties'][PropertyCode]>) => (a: Asset): Asset => ({ ...a, properties: { ...a.properties, [code]: { ...a.properties[code], ...patch } } });

  const toggle = (assetId: string, code: PropertyCode, applies: boolean) =>
    optimistic(withProp(code, { applies: !applies, origin: 'analyst', reviewed: true, reason: 'Changed on the grid' }), assetId, () =>
      stagesApi.assetProperty(assessmentId, assetId, code, { applies: !applies, reason: 'Changed on the grid' })).catch(() => undefined);
  const confirm = (assetId: string, code: PropertyCode) => optimistic(withProp(code, { reviewed: true }), assetId, () => stagesApi.assetProperty(assessmentId, assetId, code, { confirm: true })).catch(() => undefined);
  const change = async (assetId: string, code: PropertyCode, applies: boolean, reason: string) => {
    setBusy(true);
    try {
      await optimistic(withProp(code, { applies, reason, origin: 'analyst', reviewed: true }), assetId, () => stagesApi.assetProperty(assessmentId, assetId, code, { applies, reason }));
      await stagesApi.addComment(assessmentId, assetId, code, `${applies ? 'Changed to applies.' : 'Changed to does not apply.'} ${reason}`);
      setChanging(false);
      setDraft('');
      refresh();
    } catch { /* shown by the toast */ } finally { setBusy(false); }
  };
  const decide = async (a: Assumption, decision: 'confirmed' | 'disputed') => {
    try {
      if (decision === 'confirmed') {
        await stagesApi.review(assessmentId, '03', a.id, 'confirmed');
      } else {
        await stagesApi.review(assessmentId, '03', a.id, 'disputed', `Disputed in the asset list: see the comment on ${a.about}.`);
        await stagesApi.addComment(assessmentId, a.about, null, `Disputed ${a.label}: ${a.text}`);
        resetSel(keyOf(a.about, null));
      }
      refresh();
    } catch (err) {
      toast.error(message(err));
    }
  };
  const comment = async (assetId: string, code: PropertyCode | null, text: string) => {
    setBusy(true);
    try {
      await stagesApi.addComment(assessmentId, assetId, code, text);
      setReply('');
      refresh();
    } catch (err) {
      toast.error(message(err));
    } finally { setBusy(false); }
  };
  const resolve = async (key: string, resolved: boolean) => {
    const last = threads.get(key)?.messages.at(-1);
    if (!last) return;
    try {
      await stagesApi.updateComment(assessmentId, last.id, { resolved });
      refresh();
    } catch (err) { toast.error(message(err)); }
  };
  const proposal = async (c: AssetComment, state: 'applied' | 'kept') => {
    try {
      await stagesApi.updateComment(assessmentId, c.id, { proposed_change: { state } });
      refresh();
    } catch (err) { toast.error(message(err)); }
  };
  const finish = async () => {
    try {
      await stagesApi.finish03(assessmentId);
      refresh();
    } catch (err) { toast.error(message(err)); }
  };
  const [rebuilding, setRebuilding] = useState(false);
  const rebuild = async () => {
    setRebuilding(true);
    try {
      await stagesApi.rebuild03(assessmentId);
      await queryClient.invalidateQueries({ queryKey: ['pipeline', assessmentId] });
    } catch (err) { toast.error(message(err)); } finally { setRebuilding(false); }
  };
  useEffect(() => {
    if (job03?.status === 'complete') refresh();
    // refresh when a build ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job03?.status]);

  // ── what the table shows ───────────────────────────────────────────────────

  const hasThread = (key: string) => {
    const t = threads.get(key);
    return Boolean(t && t.messages.length && !t.resolved);
  };
  const openAbout = (id: string, prop?: string) => openAssumptions.some((x) => x.about === id && (prop === undefined || x.prop === prop));
  const hasNote = (key: string) => { const [id, k] = splitKey(key); return hasThread(key) || openAbout(id, k); };
  const rowHasNote = (a: Asset) => openAbout(a.asset_id) || [...threads.values()].some((t) => !t.resolved && t.key.startsWith(`${a.asset_id}.`));

  const families = useMemo(() => (data?.families ?? []).map((f) => ({ code: f.code, name: f.name })), [data]);
  const needle = q.trim().toLowerCase();
  const shown = assets.filter((a) => {
    if (filter === 'notes' && !rowHasNote(a)) return false;
    if (needle && `${a.asset_id} ${a.name} ${a.description} ${a.type_label}`.toLowerCase().indexOf(needle) < 0) return false;
    return true;
  });

  // ── the page ───────────────────────────────────────────────────────────────

  const onRoot = (ev: MouseEvent) => {
    const el = ev.target as HTMLElement | null;
    if (!el || !el.closest) return;
    if (legend && !el.closest('.legendpop, .helpb')) setLegend(false);
    if (sel && !el.closest('.pcell, .cell, .tlink, aside, nav, button, input, textarea, label, a, .legendpop')) {
      setChanging(false);
      setDraft('');
      if (rail && !closing) closeRail(true);
      else setSel(null);
    }
  };

  const finished = data?.finished ?? null;
  const upload = data?.register_source?.startsWith('upload:') ? data.register_source.slice(7) : null;
  const cannotFinish = openAssumptions.length > 0;
  const finishLabel = cannotFinish ? `Finish review · ${openAssumptions.length} assumption${openAssumptions.length === 1 ? '' : 's'} open` : 'Finish asset review';

  const banner = (tone: 'blue' | 'yellow' | 'red', children: React.ReactNode, action?: React.ReactNode) => (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`t-${tone}`} style={st('flex: none; margin-bottom: 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 10px 16px; border-radius: 12px; font-size: 13.5px; font-weight: 500')}>
      <span>{children}</span>
      {action}
    </div>
  );
  const rebuildButton = <button type="button" className="btn btn-line btn-sm" disabled={rebuilding || building} onClick={rebuild}>Rebuild assets</button>;

  return (
    <div className="assets-stage" style={{ height: 'calc(100dvh - 70px)' }} onClick={onRoot}>
      <main style={st('position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; width: 100%; max-width: 1600px; margin: 0 auto; padding: 24px clamp(16px, 2.5vw, 32px) 24px; box-sizing: border-box')}>
        <PageHeader
          project={project}
          title="Asset Analysis"
          right={data ? <span>Built from item definition:&nbsp;<span className="mono">run {data.built_from_02_run ?? data.run_number}</span></span> : undefined}
        />

        {building && banner('blue', 'Building the assets from the item definition. This usually takes a minute or two.')}
        {!building && job03?.status === 'failed' && banner('red', job03.error || 'Building the assets stopped. Try again.', rebuildButton)}
        {data?.stale && !building && banner('yellow', 'The assets were built on an older item definition.', rebuildButton)}
        {upload && !building && banner('yellow', <>Later stages are using an uploaded asset list ({upload}). Rebuild the assets to use this list instead.</>, rebuildButton)}

        {output.isLoading ? (
          <p style={st('margin: 0; padding: 20px 4px; color: #6B6A66')}>Loading the assets...</p>
        ) : output.error ? (
          <p role="alert" style={st('margin: 0; padding: 20px 4px; color: #9F2F2D')}>{(output.error as Error).message}</p>
        ) : !data ? (
          <div className="panel" style={st('padding: 22px 24px')}>
            <p style={st('margin: 0')}>Assets are built after the item definition.</p>
            <button type="button" className="tlink" onClick={onOpenDocuments} style={st('margin-top: 10px; font-size: 14px')}>Add the documents and execute on 01 Documents</button>
          </div>
        ) : (
          <div style={st('position: relative; flex: 1 1 auto; min-height: 0; display: flex; gap: 0; align-items: stretch')}>
            <section className="panel rise" aria-label="Asset list" style={st('--i: 1; flex: 999 1 760px; min-width: 0; display: flex; flex-direction: column')}>
              <div className="phead">
                <span style={st('display: inline-flex; align-items: center; gap: 12px')}>
                  <span style={st('font-size: 15px; font-weight: 600')}>Asset list</span>
                  <span className="hidesm" style={st('font-size: 12.5px; color: #6B6A66')}><span className="mono">{shown.length}</span> of <span className="mono">{assets.length}</span> assets</span>
                </span>
                <span style={st('display: inline-flex; flex-wrap: wrap; align-items: center; gap: 10px')}>
                  <button type="button" className="ibtn dens" aria-pressed={compact} aria-label="Compact rows" title={compact ? 'Compact rows: on' : 'Compact rows: off'} onClick={setDensity}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path className="l1" d="M3 3.5h10" /><path d="M3 8h10" /><path className="l3" d="M3 12.5h10" /></svg>
                  </button>
                  <span role="group" aria-label="Show" style={st('display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: #E9E7E1')}>
                    {([['all', 'All'], ['notes', 'With notes']] as const).map(([k, label]) => (
                      <button key={k} type="button" className="seg" aria-pressed={filter === k} onClick={() => setFilter(k)} style={filter === k ? st('background: #FFFFFF; color: #1C1B19; font-weight: 500; box-shadow: 0 1px 2px rgba(28,27,25,.1)') : undefined}>{label}</button>
                    ))}
                  </span>
                  <label style={st('display: inline-flex; align-items: center; position: relative')}>
                    <span style={st('position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)')}>Search assets</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" style={st('position: absolute; left: 10px; pointer-events: none')}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
                    <input className="fld" type="search" placeholder="Search assets" value={q} onChange={(e) => setQ(e.target.value)} style={st('height: 36px; width: 200px; padding: 0 10px 0 32px')} />
                  </label>
                </span>
              </div>

              <div className="tscroll" style={st('flex: 1 1 auto; min-height: 0; overflow: auto')}>
                <AssetTable
                  families={families}
                  rows={shown}
                  compact={compact}
                  collapsed={collapsed}
                  openDesc={openDesc}
                  sel={sel}
                  hasNote={hasNote}
                  onBand={(code) => setCollapsed((c) => ({ ...c, [code]: !c[code] }))}
                  onDesc={(id) => setOpenDesc((o) => ({ ...o, [id]: !o[id] }))}
                  onPickRow={(id) => resetSel(keyOf(id, null))}
                  onDblRow={(id) => {
                    const key = keyOf(id, null);
                    if (rail && !closing && sel === key) closeRail();
                    else { resetSel(key); openRail(); }
                  }}
                  onPickCell={(id, code) => {
                    const key = keyOf(id, code);
                    if (sel === key || !rail) { if (sel) { setSel(null); setChanging(false); setDraft(''); } return; }
                    resetSel(key);
                  }}
                  onDblCell={(id, code) => {
                    if (tick.current) { clearTimeout(tick.current); tick.current = null; }
                    resetSel(keyOf(id, code));
                    openRail();
                    setFocusReply((n) => n + 1);
                  }}
                  onToggle={(id, code, applies, ev) => {
                    ev.stopPropagation();
                    if (ev.detail > 1) return; // the second click of a double-click
                    if (tick.current) clearTimeout(tick.current);
                    tick.current = setTimeout(() => { tick.current = null; toggle(id, code, applies); }, 220);
                  }}
                />
                {shown.length === 0 && <p style={st('margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66')}>No assets match. Clear the search or show all.</p>}
              </div>

              <div style={st('flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; padding: 12px 24px; border-top: 1px solid #E6E4DE; background: #FAF9F7; font-size: 12.5px; color: #4A4946')}>
                <span style={st('position: relative; display: inline-flex; align-items: center; gap: 10px')}>
                  <button type="button" className="ibtn helpb" aria-expanded={legend} aria-label="What the marks mean" title="What the marks mean" onClick={() => setLegend((v) => !v)}>?</button>
                  {legend && (
                    <div className="legendpop" role="dialog" aria-label="What the marks mean">
                      <span style={st('display: flex; align-items: center; gap: 10px')}><span aria-hidden="true" style={st('width: 18px; height: 18px; border-radius: 5px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; background: #6F6B63')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>Applies</span>
                      <span style={st('display: flex; align-items: center; gap: 10px')}><span aria-hidden="true" style={st('width: 18px; height: 18px; border-radius: 5px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #B9B7B0; background: #FFFFFF')} />Does not apply</span>
                      <span style={st('display: flex; align-items: center; gap: 10px')}><span aria-hidden="true" className="ndot" style={st('position: static; box-shadow: none')} />Has an assumption or comments</span>
                      <span style={st('display: flex; align-items: center; gap: 10px')}><span aria-hidden="true" style={st('width: 18px; height: 18px; border-radius: 5px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border: 1.5px dashed #B9B7B0; background: #FFFFFF')} />Proposed: not yet confirmed</span>
                      <span style={st('color: #6B6A66; padding-top: 6px; border-top: 1px solid #F1F0EC')}>Click a box to tick or untick it. Double-click a cell to comment.</span>
                    </div>
                  )}
                </span>
                {finished ? (
                  <span style={st('font-size: 13.5px; font-weight: 500; color: #346538')}>Review finished {new Date(finished.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                ) : (
                  <button type="button" className="btn btn-dark" disabled={cannotFinish} onClick={finish} style={st('min-height: 38px; font-size: 13.5px')}>{finishLabel}</button>
                )}
              </div>
            </section>

            <div className="railwrap" style={st(rail && !closing ? 'transform: translateX(0); opacity: 1' : 'transform: translateX(calc(100% + 32px)); opacity: 0; pointer-events: none')}>
              {rail && (
                <SidePanel
                  assets={assets}
                  assumptions={assumptions}
                  threads={threads}
                  sel={sel}
                  railFilter={railFilter}
                  setRailFilter={setRailFilter}
                  needCount={needCount}
                  onClose={() => closeRail()}
                  onSelect={(key) => resetSel(key)}
                  onToggle={toggle}
                  onConfirm={confirm}
                  onChange={change}
                  onAssumption={decide}
                  onComment={comment}
                  onResolve={resolve}
                  onProposal={proposal}
                  reply={reply}
                  setReply={setReply}
                  draft={draft}
                  setDraft={setDraft}
                  changing={changing}
                  setChanging={setChanging}
                  focusReply={focusReply}
                  busy={busy}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
