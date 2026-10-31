/**
 * What 04 Impacts, 05 Threats and 06 TARA have in common (specs 29 to 31): the selection and side panel, filters and
 * paging, comment threads, Assumptions, the finish dialog and the edits that go to the server. A port of the part of the
 * designs' renderVals that does not depend on the screen. Each screen's hook adds its own table, legend and panel text.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { stagesApi } from '@/lib/stagesApi';
import type { UiAssumption, UiComment, UiEditBody, UiStage, UiStageOutput } from '@/types/stages';
import { holdScroll, morphWhy, rememberScroll, revealWhy } from '../assets/whyScroll';
import { whenWords } from '../assets/constants';
import { splitKey, threadKey, type UiThread } from './useUiStageData';
import type { Vals } from './types';

export const SIZES = [10, 20, 30, 50, 100];
const DENSITY_KEY = 'aegis:review:compact';
const readDensity = () => {
  try { return localStorage.getItem(DENSITY_KEY) === '1'; } catch { return false; }
};
export const message = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Try again.');

export interface ReviewRow { record_id: string }

export interface ReviewCfg<Row extends ReviewRow> {
  assessmentId: string;
  ui: UiStage;
  data: UiStageOutput<Row> | null | undefined;
  rows: Row[];
  threads: Map<string, UiThread>;
  assumptions: UiAssumption[];
  railToggle: number;
  onRailChange: (open: boolean) => void;
  /** The row's display code (DMG-01), and the words after it in the Assumptions list. */
  rowCode: (r: Row) => string;
  rowAbout: (r: Row) => string;
  searchText: (r: Row) => string;
  isTop: (r: Row) => boolean;
  topLabel: string;
  /** What the cell shows now, in words, and what a stored value is called. */
  fieldName: (field: string) => string;
  valueWord: (r: Row, field: string, value?: string) => string;
  /** The cells that can be reviewed: not fixed by rule. Used by "Confirm all". */
  reviewable: (r: Row) => { field: string; reviewed: boolean }[];
  /** Puts an edit on screen at once; the server's answer replaces it. */
  patch: (data: UiStageOutput<Row>, recordId: string, field: string, value: string) => UiStageOutput<Row>;
  extraWarn?: { id: string; text: string }[];
  finishLabel: string;
  doneLabel: string;
  filterFirst: string; // 'Major and Severe'
  noun: string; // 'scenarios'
  /** Which fields of a row a thread or an Assumption can sit on, for the "Assumptions" breadcrumb. */
  noteReplyText?: string;
}

export interface ReviewState {
  sel: string | null; rail: boolean; closing: boolean; menu: string | null; menuUp: boolean;
  fmenu: boolean; sizeMenu: boolean; legend: boolean; collapsed: Record<string, boolean>; compact: boolean; points: boolean;
  assetColOff: boolean; dcolOff: boolean; tcolOff: boolean; propWhy: string | null; whyLast: string | null; whySwap: number;
  filter: 'all' | 'high' | 'notes'; q: string; page: number; pageSize: number; railFilter: 'open' | 'resolved';
  reply: string; draft: string; changing: boolean; pick: string | null; goalDraft: string; actionDraft: string; warn: boolean; busy: boolean;
  pathSheet: string | null;
}

const initial = (): ReviewState => ({
  sel: null, rail: false, closing: false, menu: null, menuUp: false, fmenu: false, sizeMenu: false, legend: false, collapsed: {},
  compact: readDensity(), points: false, assetColOff: false, dcolOff: false, tcolOff: false, propWhy: null, whyLast: null, whySwap: 0,
  filter: 'all', q: '', page: 1, pageSize: 30, railFilter: 'open', reply: '', draft: '', changing: false, pick: null, goalDraft: '', actionDraft: '',
  warn: false, busy: false, pathSheet: null,
});

const segStyle = (on: boolean) => (on ? 'background: #FFFFFF; color: #1C1B19; font-weight: 500; box-shadow: 0 1px 2px rgba(28,27,25,.1)' : '');

export function useReviewCore<Row extends ReviewRow>(cfg: ReviewCfg<Row>) {
  const queryClient = useQueryClient();
  const { assessmentId, ui } = cfg;
  const [s, setS] = useState<ReviewState>(initial);
  const set = useCallback((p: Partial<ReviewState>) => setS((prev) => ({ ...prev, ...p })), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSel = useRef<string | null | undefined>(undefined);
  const panel = () => rootRef.current?.querySelector<HTMLElement>('.railwrap') ?? null;

  const railChange = useRef(cfg.onRailChange);
  railChange.current = cfg.onRailChange;
  useEffect(() => railChange.current(s.rail && !s.closing), [s.rail, s.closing]);
  useEffect(() => () => { if (tick.current) clearTimeout(tick.current); if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => { // a new selection starts at the top of the panel
    const t = setTimeout(() => { const el = rootRef.current?.querySelector<HTMLElement>('.dscroll'); if (el) el.scrollTop = 0; }, 0);
    return () => clearTimeout(t);
  }, [s.sel]);

  const closeRail = useCallback((clearSel = false) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setS((p) => ({ ...p, closing: true }));
    closeTimer.current = setTimeout(() => setS((p) => ({ ...p, rail: false, closing: false, ...(clearSel ? { sel: null } : {}) })), 420);
  }, []);
  const openRail = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); set({ rail: true, closing: false }); }, [set]);

  // The top bar's Assumptions button.
  const lastToggle = useRef(cfg.railToggle);
  useEffect(() => {
    if (cfg.railToggle === lastToggle.current) return;
    lastToggle.current = cfg.railToggle;
    if (s.rail && !s.closing) closeRail(); else openRail();
  }, [cfg.railToggle, s.rail, s.closing, closeRail, openRail]);

  const setCompact = (on: boolean) => { set({ compact: on }); try { localStorage.setItem(DENSITY_KEY, on ? '1' : '0'); } catch { /* only a convenience */ } };

  // ── data, shown at once and put back when the server refuses ────────────────

  const key = ['ui-stage', assessmentId, ui];
  const refresh = () => {
    for (const k of [key, ['ui-comments', assessmentId, ui], ['assessment', assessmentId], ['pipeline', assessmentId]]) queryClient.invalidateQueries({ queryKey: k });
    for (const n of [4, 5, 6, 7, 8, 9, 10]) queryClient.invalidateQueries({ queryKey: ['stage-output', assessmentId, n] });
    for (const other of ['04', '05', '06']) if (other !== ui) queryClient.invalidateQueries({ queryKey: ['ui-stage', assessmentId, other] });
  };
  const edit = async (recordId: string, field: string, body: UiEditBody, value?: string): Promise<boolean> => {
    const before = queryClient.getQueryData<UiStageOutput<Row> | null>(key);
    if (before && value !== undefined) queryClient.setQueryData(key, cfg.patch(before, recordId, field, value));
    try {
      await stagesApi.uiEdit(assessmentId, ui, recordId, field, body);
      refresh();
      return true;
    } catch (err) {
      queryClient.setQueryData(key, before);
      toast.error(message(err));
      return false;
    }
  };
  const rowById = useMemo(() => new Map(cfg.rows.map((r) => [r.record_id, r])), [cfg.rows]);

  // ── what the table shows ────────────────────────────────────────────────────

  const hasThread = (k: string) => { const t = cfg.threads.get(k); return Boolean(t && t.messages.length && !t.resolved); };
  const asmOpen = (recordId: string, field?: string) => cfg.assumptions.some((a) => a.record_id === recordId && a.status === 'open' && (field === undefined || a.field === field));
  const rowHasNote = (r: Row) => asmOpen(r.record_id) || [...cfg.threads.values()].some((t) => !t.resolved && t.recordId === r.record_id);
  const cellDot = (recordId: string, field: string) => hasThread(threadKey(recordId, field)) || asmOpen(recordId, field);

  const needle = s.q.trim().toLowerCase();
  const matched = cfg.rows.filter((r) => {
    if (s.filter === 'high' && !cfg.isTop(r)) return false;
    if (s.filter === 'notes' && !rowHasNote(r)) return false;
    return !needle || cfg.searchText(r).toLowerCase().includes(needle);
  });
  const fit = SIZES.findIndex((n) => n >= matched.length);
  const sizeList = fit < 0 ? SIZES : SIZES.slice(0, fit + 1);
  const pageSize = Math.min(s.pageSize, sizeList[sizeList.length - 1] ?? 10);
  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(s.page, pages);
  const from = matched.length ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, matched.length);
  const shown = matched.slice((page - 1) * pageSize, page * pageSize);
  const goPage = (p: number) => { set({ page: p }); setTimeout(() => { const t = rootRef.current?.querySelector('table'); if (t?.parentElement) t.parentElement.scrollTop = 0; }, 0); };

  const selId = s.sel ? splitKey(s.sel)[0] : null;
  const selField = s.sel ? splitKey(s.sel)[1] : null;

  // ── selection ───────────────────────────────────────────────────────────────

  const select = (k: string | null) => set({ sel: k, reply: '', draft: '', changing: false, pick: null, goalDraft: '', actionDraft: '', menu: null });
  const pickRow = (id: string) => (ev?: MouseEvent) => {
    if (!ev || !(ev.detail > 1)) prevSel.current = s.sel;
    select(threadKey(id, null));
  };
  const dblRow = (id: string) => (ev?: MouseEvent) => {
    ev?.preventDefault();
    const k = threadKey(id, null);
    const was = prevSel.current !== undefined ? prevSel.current : s.sel;
    prevSel.current = undefined;
    if (s.rail && !s.closing && was === k) closeRail();
    else { if (closeTimer.current) clearTimeout(closeTimer.current); set({ sel: k, rail: true, closing: false, reply: '', draft: '', changing: false, pick: null, menu: null }); }
  };
  /** The handlers of one cell: click selects it, double-click opens the comment, a chip click opens its menu after a beat. */
  const cell = (recordId: string, field: string, below: number) => {
    const k = threadKey(recordId, field);
    const on = s.sel === k;
    const menuOpen = s.menu === k;
    return {
      on, menuOpen, key: k,
      pick: () => { if (s.sel === k || !s.rail) { if (s.sel) set({ sel: null, changing: false, draft: '', pick: null }); return; } select(k); },
      comment: (ev?: MouseEvent) => { ev?.preventDefault(); if (tick.current) { clearTimeout(tick.current); tick.current = null; } set({ sel: k, rail: true, closing: false, reply: '', draft: '', changing: false, pick: null, menu: null }); },
      openMenu: (ev?: MouseEvent) => {
        ev?.stopPropagation();
        if (ev && ev.detail > 1) return;
        if (tick.current) clearTimeout(tick.current);
        let up = false;
        const el = ev?.currentTarget as HTMLElement | undefined;
        if (el?.getBoundingClientRect) {
          const sc = el.closest('table')?.parentElement;
          up = el.getBoundingClientRect().bottom + below > (sc ? sc.getBoundingClientRect().bottom : window.innerHeight);
        }
        tick.current = setTimeout(() => { tick.current = null; setS((p) => ({ ...p, menu: p.menu === k ? null : k, menuUp: up })); }, 200);
      },
    };
  };

  // ── Assumptions and threads ─────────────────────────────────────────────────

  const openAsm = cfg.assumptions.filter((a) => a.status === 'open' && a.record_id);
  const doneAsm = cfg.assumptions.filter((a) => a.status !== 'open' && a.record_id);
  const decide = async (a: UiAssumption, decision: 'confirmed' | 'disputed') => {
    try {
      if (decision === 'confirmed') await stagesApi.uiAssumption(assessmentId, ui, a.id, 'confirmed');
      else {
        const r = a.record_id ? rowById.get(a.record_id) : undefined;
        await stagesApi.uiAssumption(assessmentId, ui, a.id, 'disputed', `Disputed in the review: see the comment on ${r ? cfg.rowCode(r) : a.record_id}.`);
        if (a.record_id) await stagesApi.uiAddComment(assessmentId, ui, a.record_id, null, `Disputed ${a.id}: ${a.text}`);
        if (a.record_id) select(threadKey(a.record_id, null));
      }
      refresh();
    } catch (err) { toast.error(message(err)); }
  };
  const asmView = (list: UiAssumption[]) => list.filter((a) => a.record_id).map((a, i) => {
    const r = rowById.get(a.record_id as string);
    const open = a.status === 'open';
    return {
      i, id: a.id, text: a.text, about: r ? cfg.rowCode(r) : a.record_id, aboutName: r ? cfg.rowAbout(r) : '', open, rowCls: open ? 'asm open' : 'asm',
      state: open ? 'Needs you' : a.status === 'confirmed' ? 'Confirmed' : 'Disputed',
      cls: open ? 'tag t-yellow' : a.status === 'confirmed' ? 'tag t-grey' : 'tag t-red',
      confirm: (ev?: MouseEvent) => { ev?.stopPropagation(); decide(a, 'confirmed'); },
      dispute: (ev?: MouseEvent) => { ev?.stopPropagation(); decide(a, 'disputed'); },
      pick: () => select(threadKey(a.record_id as string, null)),
    };
  });

  const comment = async (recordId: string, field: string, text: string) => {
    set({ busy: true });
    try {
      await stagesApi.uiAddComment(assessmentId, ui, recordId, field === 'row' ? null : field, text);
      set({ reply: '' });
      refresh();
    } catch (err) { toast.error(message(err)); } finally { set({ busy: false }); }
  };
  const resolveThread = async (k: string, resolved: boolean) => {
    const last = cfg.threads.get(k)?.messages.at(-1);
    if (!last) return;
    try { await stagesApi.uiUpdateComment(assessmentId, ui, last.id, { resolved }); refresh(); } catch (err) { toast.error(message(err)); }
  };
  const proposal = async (c: UiComment, state: 'applied' | 'kept') => {
    try { await stagesApi.uiUpdateComment(assessmentId, ui, c.id, { proposed_change: { state } }); refresh(); } catch (err) { toast.error(message(err)); }
  };

  const list = (() => {
    const threads = [...cfg.threads.values()];
    const open = s.railFilter === 'open';
    return threads
      .filter((t) => (open ? !t.resolved && t.messages.length > 0 : t.resolved))
      .filter((t) => t.key !== s.sel && (!selId || t.recordId === selId) && rowById.has(t.recordId))
      .map((t, i) => {
        const last = t.messages[t.messages.length - 1];
        const r = rowById.get(t.recordId) as Row;
        return {
          i, key: t.key, tag: open ? 'Comment' : 'Resolved', cls: 'tag t-grey',
          title: `${cfg.rowCode(r)} ${cfg.rowAbout(r).split(',')[0]}${t.field === 'row' ? '' : ` · ${cfg.fieldName(t.field).toLowerCase()}`}`,
          snippet: open ? `${last.author === 'analyst' ? 'You: ' : ''}${last.text}` : 'Resolved',
          pick: () => select(t.key),
        };
      });
  })();
  const openThreads = [...cfg.threads.values()].filter((t) => !t.resolved && rowById.has(t.recordId)).length;
  const needYou = openAsm.length + openThreads;

  // ── the side panel pieces every screen has ──────────────────────────────────

  const toggleWhy = (wk: string) => {
    const opening = s.propWhy !== wk;
    const switching = opening && Boolean(s.propWhy);
    if (!opening) holdScroll(panel()); else if (switching) morphWhy(panel()); else rememberScroll(panel());
    set({ propWhy: opening ? wk : null, whyLast: wk, whySwap: s.whySwap + (switching ? 1 : 0) });
    if (opening) revealWhy(panel());
  };

  const msgsOf = (k: string, row: Row | undefined) => (cfg.threads.get(k)?.messages ?? []).map((m) => {
    const you = m.author === 'analyst';
    const ch = m.proposed_change;
    const field = ch?.field ?? '';
    return {
      mine: you, when: whenWords(m.created_at), text: m.text,
      wrap: you ? 'padding: 10px 12px; border-radius: 12px; background: #F7F6F2; border: 1px solid #ECE9E2' : 'padding-left: 12px; border-left: 2px solid #DAD8D1',
      hasChange: Boolean(ch), changeProp: ch ? cfg.fieldName(field) : '',
      fromWord: ch && row ? (ch.state === 'open' ? cfg.valueWord(row, field) : ch.from ? cfg.valueWord(row, field, ch.from) : cfg.valueWord(row, field)) : '', fromCls: 'tag t-grey',
      toWord: ch && row ? cfg.valueWord(row, field, ch.value) : '', toCls: 'tag t-ink',
      changeOpen: ch?.state === 'open', changeDone: Boolean(ch) && ch?.state !== 'open',
      changeDoneText: ch?.state === 'applied' ? 'Applied by you. The change is saved with the reason.' : 'Kept as it is.',
      apply: () => proposal(m, 'applied'), keep: () => proposal(m, 'kept'),
    };
  });

  const finish = async () => {
    try { await stagesApi.uiFinish(assessmentId, ui); set({ warn: false }); refresh(); } catch (err) { toast.error(message(err)); }
  };
  const warnItems = [...openAsm.map((a) => ({ id: a.id, text: a.text })), ...(cfg.extraWarn ?? [])];
  const finished = cfg.data?.finished ?? null;

  const [rebuilding, setRebuilding] = useState(false);
  const rebuild = async () => {
    setRebuilding(true);
    try { await stagesApi.uiRebuild(assessmentId, ui); refresh(); } catch (err) { toast.error(message(err)); } finally { setRebuilding(false); }
  };

  // ── the values every screen's markup reads ──────────────────────────────────

  const toggles = (extra: Vals = {}): Vals => ({
    clearSel: (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (!t?.closest) return;
      const patch: Partial<ReviewState> = {};
      if (s.legend && !t.closest('.legendpop, .helpb')) patch.legend = false;
      if (s.menu && !t.closest('.rmenu, .rchip')) patch.menu = null;
      if (s.sizeMenu && !t.closest('.psize')) patch.sizeMenu = false;
      if (s.fmenu && !t.closest('.fwrap')) patch.fmenu = false;
      const clears = s.sel && !t.closest('.pcell, .cell, .tlink, aside, nav, button, input, textarea, label, a, .legendpop, .apback');
      if (clears) { patch.changing = false; patch.draft = ''; patch.pick = null; }
      if (clears && s.rail && !s.closing) { if (Object.keys(patch).length) set(patch); closeRail(true); return; }
      if (clears) patch.sel = null;
      if (Object.keys(patch).length) set(patch);
    },
    ...extra,
  });

  const common: Vals = {
    // the header strip
    filters: [['all', 'All'], ['high', cfg.filterFirst], ['notes', 'With notes']].map(([k, label]) => ({
      label, pressed: s.filter === k ? 'true' : 'false', style: segStyle(s.filter === k), pick: () => set({ filter: k as ReviewState['filter'], page: 1 }),
    })),
    railFilters: [['open', 'Open'], ['resolved', 'Done']].map(([k, label]) => ({
      label, pressed: s.railFilter === k ? 'true' : 'false', style: segStyle(s.railFilter === k), pick: () => set({ railFilter: k as ReviewState['railFilter'] }),
    })),
    fmenuOpen: s.fmenu, fmenuStr: s.fmenu ? 'true' : 'false',
    toggleFmenu: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ fmenu: !s.fmenu }); },
    pointsStr: s.points ? 'true' : 'false', togglePoints: () => set({ points: !s.points }),
    fActive: s.filter !== 'all' || s.compact || s.points,
    fCount: String((s.filter !== 'all' ? 1 : 0) + (s.compact ? 1 : 0) + (s.points ? 1 : 0)),
    resetFilters: () => { set({ filter: 'all', points: false, page: 1 }); setCompact(false); },
    q: s.q, onSearch: (ev: { target: { value: string } }) => set({ q: ev.target.value, page: 1 }),
    // the footer
    legendOpen: s.legend, legendStr: s.legend ? 'true' : 'false', toggleLegend: () => set({ legend: !s.legend }),
    pageRange: `${from}–${to}`, pageMatched: matched.length, pageLabel: `${page} / ${pages}`,
    prevDisabled: page <= 1, nextDisabled: page >= pages,
    prevPage: () => { if (page > 1) goPage(page - 1); }, nextPage: () => { if (page < pages) goPage(page + 1); },
    pageSize, sizeMenuOpen: s.sizeMenu, sizeMenuStr: s.sizeMenu ? 'true' : 'false',
    toggleSizeMenu: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ sizeMenu: !s.sizeMenu }); },
    sizeOpts: sizeList.map((n) => ({ label: String(n), selStr: n === pageSize ? 'true' : 'false', pick: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ pageSize: n, page: 1, sizeMenu: false }); } })),
    finishLabel: finished ? (warnItems.length ? `Finished · ${warnItems.length} open` : cfg.doneLabel) : cfg.finishLabel,
    finish: () => { if (warnItems.length) set({ warn: true }); else finish(); },
    warnOpen: s.warn && warnItems.length > 0,
    warnTitle: warnItems.length === 1 ? '1 item is still open' : `${warnItems.length} items are still open`,
    warnItems, closeWarn: () => set({ warn: false }), finishAnyway: finish,
    stop: (ev?: MouseEvent) => ev?.stopPropagation(), stopEv: (ev?: MouseEvent) => ev?.stopPropagation(),
    reviewAsm: () => { set({ warn: false, rail: true, closing: false, sel: null, railFilter: 'open', propWhy: null }); },
    noRows: shown.length === 0,
    // the side panel
    railOpen: s.rail, railOpenStr: s.rail ? 'true' : 'false', toggleRail: () => { if (s.rail && !s.closing) closeRail(); else openRail(); },
    asideCls: 'panel drawer',
    railWrap: s.rail && !s.closing ? 'transform: translateX(0); opacity: 1' : 'transform: translateX(calc(100% + 32px)); opacity: 0; pointer-events: none',
    hasNeed: needYou > 0, needYou, hasSel: Boolean(s.sel), noSel: !s.sel,
    asmList: asmView(s.railFilter === 'open' ? openAsm : doneAsm), asmEmpty: (s.railFilter === 'open' ? openAsm : doneAsm).length === 0,
    asmCount: (s.railFilter === 'open' ? openAsm : doneAsm).length, threadCount: list.length,
    reply: s.reply, onReply: (ev: { target: { value: string } }) => set({ reply: ev.target.value }), replyShort: s.reply.trim().length < 2,
    draft: s.draft, onDraft: (ev: { target: { value: string } }) => set({ draft: ev.target.value }),
    cancelChange: () => set({ changing: false, draft: '', pick: null, goalDraft: '', actionDraft: '' }),
    listTitle: s.sel ? (s.railFilter === 'open' ? 'Other comments on this item' : 'Resolved on this item') : (s.railFilter === 'open' ? 'Open comments' : 'Resolved comments'),
    showList: !s.sel || list.length > 0, threadList: list, listEmpty: list.length === 0,
    clearPick: () => set({ sel: null, changing: false, draft: '', reply: '', pick: null }),
    // the table
    tableCls: `assets fixedlayout${s.compact ? ' compact' : ''}${s.assetColOff ? ' acol-off' : ''}${s.dcolOff ? ' dcol-off' : ''}${s.tcolOff ? ' tcol-off' : ''}`,
    assetColOffStr: s.assetColOff ? 'true' : 'false', assetColLabel: s.assetColOff ? 'Show asset names' : 'Hide asset names',
    densTitle: s.compact ? 'Compact rows: on' : 'Compact rows: off',
    ...toggles(),
  };

  return {
    s, set, rootRef, cfg, key, refresh, edit, rowById, shown, matched, closeRail, openRail, select, pickRow, dblRow, cell, hasThread, rowHasNote, cellDot, asmOpen,
    asmView, openAsm, doneAsm, selId, selField, msgsOf, toggleWhy, comment, resolveThread, finish, warnItems, finished, rebuild, rebuilding,
    common, setCompact, needYou, list,
    /** The pieces of the open item's panel that do not depend on the screen. */
    baseSel: (k: string, row: Row | undefined): Vals => ({
      msgs: msgsOf(k, row),
      resolveLabel: cfg.threads.get(k)?.resolved ? 'Reopen' : 'Resolve',
      resolve: () => resolveThread(k, !cfg.threads.get(k)?.resolved),
      send: () => comment(splitKey(k)[0], splitKey(k)[1], s.reply.trim()),
    }),
    node: undefined as ReactNode,
  };
}
