/**
 * 04 Impacts: the values the design's page reads (renderVals of Impact.dc.html), built from the pipeline's rows (spec 29).
 * Levels and the overall rating come from folder 07 and the engine; nothing is computed here.
 */

import type { MouseEvent } from 'react';
import { damageCode, threatCode } from '@/lib/displayIds';
import type { ImpactCell, ImpactLevel, ImpactRow, UiStageOutput } from '@/types/stages';
import { animAssetCol } from '../review/colAnim';
import { OUT, SOLID, TINT } from '../review/palette';
import { useReviewCore, type ReviewCfg } from '../review/useReviewCore';
import { threadKey, type UiThread } from '../review/useUiStageData';
import type { Vals } from '../review/types';
import type { UiAssumption } from '@/types/stages';

export const LEVELS: ImpactLevel[] = ['Negligible', 'Moderate', 'Major', 'Severe'];
const NONE = 'background: #F7F6F2; color: #8E8D89';

export const PROPNAME: Record<string, string> = {
  confidentiality: 'Confidentiality', integrity: 'Integrity', availability: 'Availability',
  authenticity: 'Authenticity', authorization: 'Authorization', non_repudiation: 'Non-repudiation',
};
export const WHO: Record<string, string> = { tool_user: 'Tool user', organization: 'Organisation', vehicle_owner: 'Vehicle owner', regulator: 'Regulator', oem: 'OEM' };

/** The seven categories in the design's order, with the fixed ones first. */
export const CATS = [
  { k: 'S', field: 'tool_user.safety', name: 'Safety', grp: 'Tool user', fixed: true },
  { k: 'F', field: 'tool_user.financial', name: 'Financial', grp: 'Tool user', fixed: true },
  { k: 'O', field: 'tool_user.operational', name: 'Operational', grp: 'Tool user', fixed: false },
  { k: 'P', field: 'tool_user.privacy', name: 'Privacy', grp: 'Tool user', fixed: false },
  { k: 'L', field: 'other_stakeholders.legal', name: 'Legal', grp: 'Other stakeholders', fixed: false },
  { k: 'F2', field: 'other_stakeholders.financial', name: 'Financial', grp: 'Other stakeholders', fixed: false },
  { k: 'B', field: 'other_stakeholders.business', name: 'Business', grp: 'Other stakeholders', fixed: false },
];
const catOf = (field: string) => CATS.find((c) => c.field === field);
export const catName = (field: string) => {
  const c = catOf(field);
  if (!c) return field === 'overall' ? 'Impact rating' : field;
  return c.k === 'F2' ? 'Financial (other stakeholders)' : `${c.name}${c.grp === 'Tool user' ? ' (tool user)' : ''}`;
};
const idx = (l: ImpactLevel | null) => (l ? LEVELS.indexOf(l) : -1);

export function whyText(cell: ImpactCell): string {
  if (!cell.level) return 'This has not been rated yet.';
  if (cell.locked && cell.rule) return cell.rule;
  const base = cell.why.length === 1
    ? cell.why[0].reason
    : cell.why.map((w) => `${threatCode(w.threat_id)}: ${w.level}. ${w.reason}`).join(' ');
  const mixed = cell.mixed ? ' The threats on this scenario disagree, so the highest is shown.' : '';
  const changed = cell.edit?.kind === 'changed' ? ` Changed by you: ${cell.edit.reason}` : '';
  return `${base}${mixed}${changed}`;
}
const flipText = (n: number) => (n < 3 ? `Evidence that the effect reaches further than this would raise it to ${LEVELS[n + 1]}.` : `Evidence that the effect stays contained would lower it to ${LEVELS[n - 1]}.`);

export interface ImpactsProps {
  assessmentId: string;
  data: UiStageOutput<ImpactRow> | null | undefined;
  rows: ImpactRow[];
  threads: Map<string, UiThread>;
  assumptions: UiAssumption[];
  railToggle: number;
  onRailChange: (open: boolean) => void;
}

export function useImpacts(p: ImpactsProps) {
  const cfg: ReviewCfg<ImpactRow> = {
    assessmentId: p.assessmentId, ui: '04', data: p.data, rows: p.rows, threads: p.threads, assumptions: p.assumptions,
    railToggle: p.railToggle, onRailChange: p.onRailChange,
    rowCode: (r) => damageCode(r.record_id),
    rowAbout: (r) => `${r.asset_name}, ${PROPNAME[r.property ?? '']}`,
    searchText: (r) => `${damageCode(r.record_id)} ${r.asset_ref} ${r.asset_name} ${PROPNAME[r.property ?? '']} ${r.damage}`,
    isTop: (r) => (r.overall?.value ?? 0) >= 2,
    topLabel: 'Major and Severe', filterFirst: 'Major and Severe', noun: 'scenarios',
    fieldName: catName,
    valueWord: (r, field, value) => value ?? r.cells[field]?.level ?? '',
    reviewable: (r) => CATS.filter((c) => !c.fixed && r.cells[c.field]?.level).map((c) => ({ field: c.field, reviewed: Boolean(r.cells[c.field].edit) })),
    patch: (d, id, field, value) => ({ ...d, rows: d.rows.map((r) => (r.record_id !== id ? r : { ...r, cells: { ...r.cells, [field]: { ...r.cells[field], level: value as ImpactLevel, mixed: false, edit: { kind: 'changed', reason: 'Changed on the grid', by: '', at: '', from: r.cells[field].level } } } })) }),
    finishLabel: 'Finish review', doneLabel: 'Review finished',
  };
  const c = useReviewCore(cfg);
  const { s, set } = c;
  const word = (n: number) => (s.points ? String(n) : LEVELS[n - 1]);
  const level = (r: ImpactRow, field: string) => idx(r.cells[field]?.level ?? null) + 1; // 0 when unrated
  const overall = (r: ImpactRow) => (r.overall ? r.overall.value + 1 : 0);
  const drivers = (r: ImpactRow) => {
    const o = overall(r);
    return CATS.filter((cat) => level(r, cat.field) === o).map((cat) => (cat.k === 'F2' ? 'Financial (others)' : cat.name));
  };

  // ── the table ───────────────────────────────────────────────────────────────

  const lines: Vals[] = [];
  for (const f of p.data?.families ?? []) {
    const rows = c.shown.filter((r) => r.family === f.code);
    if (!rows.length) continue;
    const closed = Boolean(s.collapsed[f.code]);
    lines.push({ isBand: true, isRow: false, code: f.code, name: f.name, countLabel: `${rows.length}${rows.length === 1 ? ' scenario' : ' scenarios'}`, expanded: closed ? 'false' : 'true', toggle: () => set({ collapsed: { ...s.collapsed, [f.code]: !s.collapsed[f.code] } }) });
    if (closed) continue;
    const span: Record<string, number> = {};
    rows.forEach((r) => { span[r.asset_id] = (span[r.asset_id] || 0) + 1; });
    let prev: string | null = null;
    let assetIdx = -1;
    rows.forEach((r) => {
      const first = r.asset_id !== prev;
      if (first) assetIdx += 1;
      prev = r.asset_id;
      const id = r.record_id;
      const rowSel = c.selId === id && c.selField === 'row';
      const bg = rowSel ? '#F4FAFE' : '#FFFFFF';
      const top = first && assetIdx > 0 ? '; border-top: 2px solid #D9D4C9' : '';
      const ov = overall(r);
      const focus = s.rail && s.sel === threadKey(id, null);
      const none = ov === 0;
      lines.push({
        isBand: false, isRow: true, first, span: String(span[r.asset_id]), assetLabel: `${r.asset_ref} ${r.asset_name}`, assetTd: `background: #FFFFFF${top}; border-bottom: 0`,
        dmg: damageCode(id), aid: r.asset_ref, aname: r.asset_name, prop: PROPNAME[r.property ?? ''], scen: r.damage,
        rowLabel: `${damageCode(id)} ${r.asset_name} ${PROPNAME[r.property ?? '']}, open comments`,
        rowCorner: c.hasThread(threadKey(id, null)),
        idStyle: 'font-size: 12px; color: #6B6A66; white-space: nowrap; text-align: center; padding: 8px 4px',
        nameStyle: 'font-size: 13px; font-weight: 500; line-height: 1.35; text-align: center; color: #1C1B19; padding: 8px 8px',
        idTd: `background: ${bg}${top}${rowSel ? '; box-shadow: inset 3px 0 0 #1F6C9F' : ''}`,
        plainTd: `background: ${bg}${top}`,
        rtTd: `width: 112px; background: ${none ? '#F7F6F2' : SOLID[ov - 1][0]}${top}${rowSel ? '; box-shadow: inset 0 0 0 2px #1F6C9F' : ''}`,
        rtChip: `background: transparent; color: ${none ? '#8E8D89' : SOLID[ov - 1][1]}`, rtText: none ? '–' : word(ov),
        rtTitle: none ? 'Not rated yet' : `Impact rating ${LEVELS[ov - 1]} (${ov} points), from ${drivers(r).join(', ')}`,
        pickRow: c.pickRow(id), dblRow: c.dblRow(id),
        cells: CATS.map((cat, i) => {
          const n = level(r, cat.field);
          const h = c.cell(id, cat.field, 132);
          const isDrv = ov > 1 && n === ov;
          const locked = cat.fixed;
          const cellData = r.cells[cat.field];
          const unrated = n === 0;
          const menuOpen = h.menuOpen && !locked && !unrated;
          return {
            cls: `k${i} cat${isDrv ? ' drv' : ''}`,
            td: unrated ? `--oc: #E2DFD8; background: #F7F6F2${top}` : `--oc: ${OUT[n - 1]}; width: 84px; background: ${focus && isDrv ? SOLID[n - 1][0] : TINT[n - 1][0]}${top}${h.on ? `; box-shadow: inset 0 0 0 2px ${OUT[n - 1]}` : ''}${focus && !isDrv ? '; filter: saturate(.35) opacity(.55)' : ''}`,
            btn: '--pc: #6F6B63', pcls: h.on ? 'pcell sel' : 'pcell',
            chip: unrated ? `${NONE}; box-shadow: none` : `background: transparent; box-shadow: none; color: ${focus && isDrv ? SOLID[n - 1][1] : TINT[n - 1][1]}`,
            text: unrated ? '–' : word(n), locked: locked || unrated, corner: c.cellDot(id, cat.field) || cellData?.mixed,
            label: unrated ? `${catName(cat.field)} for ${damageCode(id)}: not rated yet` : `${catName(cat.field)} for ${damageCode(id)}: ${LEVELS[n - 1]}${cellData?.mixed ? ', the threats on this scenario disagree' : ''}`,
            title: unrated ? 'Not rated yet. Double-click to comment.' : locked ? `${cellData?.rule ?? ''} Double-click to comment.` : 'Click to change. Double-click to comment.',
            menu: menuOpen, menuStr: menuOpen ? 'true' : 'false', menuCls: `rmenu${menuOpen && s.menuUp ? ' up' : ''}`,
            opts: LEVELS.map((l, li) => ({
              label: l, pts: li + 1, on: n === li + 1 ? 'true' : 'false', sw: `background: ${TINT[li][0]}; color: ${TINT[li][1]}; --ob: ${OUT[li]}`,
              pick: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ menu: null }); c.edit(id, cat.field, { value: l, reason: 'Changed on the grid' }, l); },
            })),
            openMenu: h.openMenu, comment: h.comment, pick: h.pick,
          };
        }),
      });
    });
  }

  const rheads = CATS.map((cat, i) => ({
    cls: `pc k${i}${cat.grp === 'Tool user' ? ' cu' : ' co'}`, name: cat.name,
    title: cat.fixed ? `${cat.name} (tool user): ${(p.rows[0]?.cells[cat.field]?.rule ?? '')}` : `${cat.name} (${cat.grp.toLowerCase()})`,
    style: 'background: #F3F1EC; color: #2F2E2B; font-weight: 600; font-size: 12px; text-align: center; padding: 8px 4px; --pc: #6F6B63',
  }));

  // ── the header strip ────────────────────────────────────────────────────────

  const counts = [0, 0, 0, 0];
  p.rows.forEach((r) => { const o = overall(r); if (o) counts[o - 1] += 1; });
  const total = p.rows.length;
  const dist = [3, 2, 1, 0].filter((i) => counts[i]).map((i) => ({ style: `flex: ${counts[i]} 1 0; background: ${SOLID[i][0]}`, label: `${counts[i]} ${LEVELS[i]}` }));
  const distLegend = [3, 2, 1, 0].map((i) => ({ zero: !counts[i], n: String(counts[i]), label: LEVELS[i], dot: `background: ${SOLID[i][0]}` }));
  const distText = [3, 2, 1, 0].filter((i) => counts[i]).map((i) => `${counts[i]} ${LEVELS[i]}`).join(' · ');

  // ── the side panel ──────────────────────────────────────────────────────────

  const sel = (() => {
    const base: Vals = {
      code: '', sub: '', descLabel: 'Damage scenario', descTag: '', whyLabel: 'Why', isRow: false, groups: [], whyCls: 'whywrap', whyHidden: 'true', whyAnim: 'propwhy', whyName: '', whyState: '', whyReason: '', whyFlip: '', whyHasFlip: false,
      title: '', state: '', stateCls: '', reason: '', quotes: [], hasFlip: false, flip: '', msgs: [], asms: [], hasDesc: false, desc: '', isProp: false, proposedWord: '', rowLeftHint: '', rowLeft: false, rowLeftLabel: '', confirmRow: () => {},
      canReview: false, changing: false, changeLabel: 'Change', confirm: () => {}, startChange: () => {}, saveChange: () => {}, changeExtra: null, resolve: () => {}, resolveLabel: 'Resolve', send: () => {},
    };
    if (!s.sel || !c.selId) return base;
    const r = c.rowById.get(c.selId);
    if (!r) return base;
    const k = s.sel;
    const field = c.selField as string;
    const row = field === 'row';
    const ov = overall(r);
    Object.assign(base, c.baseSel(k, r));
    base.code = damageCode(r.record_id);
    base.hasDesc = true; base.desc = r.damage;
    const own = p.assumptions.filter((a) => a.record_id === r.record_id && (row || a.field === field));
    base.asms = c.asmView(own);
    if (row) {
      base.sub = `${PROPNAME[r.property ?? '']} damage`; base.title = `${r.asset_name} · ${PROPNAME[r.property ?? '']}`;
      base.state = ov ? LEVELS[ov - 1] : 'Not rated'; base.stateCls = 'tag t-ink';
      base.whyLabel = 'Why this impact rating'; base.isRow = true;
      base.reason = ov
        ? `Impact rating ${LEVELS[ov - 1]} is the highest of the ratings, set by ${drivers(r).join(' and ')}. Affected: ${WHO[r.stakeholder] ?? r.stakeholder}. The scenario comes from the ${PROPNAME[r.property ?? '']} mark on ${r.asset_ref} in Asset Analysis.`
        : `This scenario is rated after the threats are found. It comes from the ${PROPNAME[r.property ?? '']} mark on ${r.asset_ref} in Asset Analysis. Affected: ${WHO[r.stakeholder] ?? r.stakeholder}.`;
      const mk = (cat: (typeof CATS)[number]) => {
        const n = level(r, cat.field);
        const wk = `${r.record_id}.${cat.field}`;
        const open = s.propWhy === wk;
        const drv = ov > 1 && n === ov;
        const cellData = r.cells[cat.field];
        if (open) { base.whyCls = 'whywrap open'; base.whyHidden = 'false'; base.whyAnim = s.whySwap ? `propwhy ${s.whySwap % 2 ? 'fa' : 'fb'}` : 'propwhy'; }
        if (n && (open || (!s.propWhy && s.whyLast === wk))) {
          base.whyName = catName(cat.field); base.whyState = LEVELS[n - 1]; base.whyReason = whyText(cellData); base.whyHasFlip = !cat.fixed; base.whyFlip = flipText(n - 1);
        }
        return {
          name: cat.name, lv: n ? LEVELS[n - 1] : '–', openStr: open ? 'true' : 'false', dot: c.cellDot(r.record_id, cat.field) || Boolean(cellData?.mixed),
          whyLabel: `${open ? 'Hide' : 'Show'} why ${catName(cat.field)} is ${n ? LEVELS[n - 1] : 'not rated'}`,
          style: !n ? `${NONE}; box-shadow: inset 0 0 0 1px #E2DFD8` : drv ? `background: ${SOLID[n - 1][0]}; color: ${SOLID[n - 1][1]}; box-shadow: inset 0 0 0 1.5px ${OUT[n - 1]}, 0 0 0 3px ${OUT[n - 1]}2E` : `background: ${TINT[n - 1][0]}; color: ${TINT[n - 1][1]}; box-shadow: inset 0 0 0 1px ${OUT[n - 1]}`,
          toggleWhy: () => c.toggleWhy(wk),
        };
      };
      base.groups = [
        { name: 'Tool user', items: CATS.filter((x) => x.grp === 'Tool user').map(mk) },
        { name: 'Other stakeholders', items: CATS.filter((x) => x.grp !== 'Tool user').map(mk) },
      ];
      const left = c.cfg.reviewable(r).filter((x) => !x.reviewed);
      if (left.length) {
        base.rowLeft = true; base.rowLeftHint = `${left.length} of ${c.cfg.reviewable(r).length} ratings not yet reviewed.`; base.rowLeftLabel = 'Confirm all';
        base.confirmRow = async () => { for (const x of left) if (!(await c.edit(r.record_id, x.field, { confirm: true }))) break; };
      }
    } else {
      const cat = catOf(field);
      const cellData = r.cells[field];
      const n = level(r, field);
      base.sub = catName(field); base.title = catName(field);
      base.state = n ? LEVELS[n - 1] : 'Not rated'; base.stateCls = 'tag t-ink';
      base.whyLabel = 'Why this rating'; base.reason = cellData ? whyText(cellData) : '';
      if (n && cat && !cat.fixed) { base.hasFlip = true; base.flip = flipText(n - 1); }
      if (cat && !cat.fixed && n) {
        base.isProp = true; base.proposedWord = LEVELS[n - 1];
        base.canReview = !cellData?.edit && !s.changing;
        base.confirm = () => c.edit(r.record_id, field, { confirm: true });
        base.startChange = () => set({ changing: true, pick: null });
        base.changing = s.changing;
        const valid = Boolean(s.pick) && s.pick !== LEVELS[n - 1];
        base.saveChange = async () => {
          if (await c.edit(r.record_id, field, { value: s.pick as string, reason: s.draft.trim() }, s.pick as string)) set({ changing: false, draft: '', pick: null });
        };
        base.canSave = valid;
        base.changeExtra = (
          <span role="group" aria-label="New rating" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 10, background: '#F1F0EC', alignSelf: 'flex-start' }}>
            {LEVELS.map((l) => (
              <button key={l} type="button" className="seg" aria-pressed={s.pick === l} onClick={() => set({ pick: l })} style={s.pick === l ? { background: '#FFFFFF', color: '#1C1B19', fontWeight: 500, boxShadow: '0 1px 2px rgba(28,27,25,.1)' } : undefined}>{l}</button>
            ))}
          </span>
        );
      }
      if (cellData?.locked) base.hasFlip = false;
    }
    return base;
  })();

  const needSplit = '';
  const v: Vals = {
    ...c.common,
    // the header strip and footer
    headTitle: 'Damage scenarios', searchLabel: 'Search scenarios', showPoints: true, pointsLabel: 'Show ratings as points (1–4)', noun: 'scenarios',
    dist, distLegend, totalText: `${total} total scenarios`, distTitle: `Impact ratings across all scenarios: ${distText}`,
    legendNode: (
      <div className="legendpop" role="dialog" aria-label="What the marks mean">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Impact levels</span>
          {LEVELS.map((l, i) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="rchip" style={{ background: SOLID[i][0], color: SOLID[i][1], cursor: 'default' }}>{l}</span>
              <span style={{ color: '#6B6A66' }}>{i + 1} points</span>
            </span>
          ))}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          Fixed by rule, cannot be changed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="ndot" style={{ position: 'static', boxShadow: 'none' }} />Has an assumption or comments</span>
        <span style={{ color: '#6B6A66', paddingTop: 6, borderTop: '1px solid #F1F0EC' }}>The overall rating is the engine&rsquo;s: the highest of the ratings that count. Click a level to change it. Double-click a cell to comment.</span>
      </div>
    ),
    warnText: 'Confirm or dispute them before you finish the impact review. The ratings they affect may still change.',
    // the table
    lines, rheads,
    toggleAssetCol: (ev?: MouseEvent) => { ev?.stopPropagation(); animAssetCol(c.rootRef.current, !s.assetColOff, () => set({ assetColOff: !s.assetColOff })); },
    // the panel
    panelName: '04 Impact Analysis', asmHint: 'Confirm or dispute the assumptions below. Select a scenario, or double-click a rating, to see the reasoning and comment.',
    sel, crumb: c.selId ? c.rowById.get(c.selId)?.asset_name ?? '' : '',
    draftShort: s.draft.trim().length < 10 || !(sel as Vals).canSave,
    needSplit,
  };
  return { c, v };
}
