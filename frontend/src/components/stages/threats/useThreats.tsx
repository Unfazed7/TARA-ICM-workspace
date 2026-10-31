/**
 * 05 Threats: the values the design's page reads (renderVals of Threat.dc.html), built from the pipeline's rows (spec 30).
 * CVSS, attack feasibility and the factor words come from folder 06 and the engine's weights; the feasibility has the
 * pipeline's five levels (the design draws four).
 */

import type { MouseEvent } from 'react';
import { attackCode, damageCode, threatCode } from '@/lib/displayIds';
import type { ThreatRow, UiAssumption, UiStageOutput } from '@/types/stages';
import { PROPNAME } from '../impacts/useImpacts';
import { animAssetCol } from '../review/colAnim';
import { NEUTRAL, OUT, RISK, TINT, TINT5 } from '../review/palette';
import { useReviewCore, type ReviewCfg } from '../review/useReviewCore';
import { threadKey, type UiThread } from '../review/useUiStageData';
import type { Vals } from '../review/types';

export const FEAS = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
export const STRIDE: { value: string; name: string; style: string }[] = [
  { value: 'spoofing', name: 'Spoofing', style: 'background: #F1E6EE; color: #6E3F66' },
  { value: 'tampering', name: 'Tampering', style: 'background: #F6E8DD; color: #8A4B22' },
  { value: 'repudiation', name: 'Repudiation', style: 'background: #ECE7DD; color: #5C5244' },
  { value: 'information_disclosure', name: 'Information disclosure', style: 'background: #E3EDF5; color: #1F5F8B' },
  { value: 'denial_of_service', name: 'Denial of service', style: 'background: #F5EDD3; color: #7A5C12' },
  { value: 'elevation_of_privilege', name: 'Elevation of privilege', style: 'background: #DFF0EC; color: #2A6B63' },
];
const strideName = (v: string) => STRIDE.find((x) => x.value === v)?.name ?? v;

/** The four CVSS factors, in the design's order, with the words the design shows for the engine's letter codes. */
export const FACTORS: { field: string; k: string; name: string; short: string; opts: [string, string][]; level: Record<string, number>; about: string }[] = [
  { field: 'attack_vector', k: 'AV', name: 'Attack vector', short: 'Attack vector', opts: [['N', 'Network'], ['A', 'Adjacent'], ['L', 'Local'], ['P', 'Physical']], level: { N: 4, A: 3, L: 2, P: 1 }, about: 'where the attacker must be' },
  { field: 'attack_complexity', k: 'AC', name: 'Attack complexity', short: 'Complexity', opts: [['L', 'Low'], ['H', 'High']], level: { L: 3, H: 1 }, about: 'the conditions the attack depends on' },
  { field: 'privileges_required', k: 'PR', name: 'Privileges required', short: 'Privileges', opts: [['N', 'None'], ['L', 'Low'], ['H', 'High']], level: { N: 4, L: 3, H: 1 }, about: 'which account the attacker needs' },
  { field: 'user_interaction', k: 'UI', name: 'User interaction', short: 'User interaction', opts: [['N', 'None'], ['R', 'Required']], level: { N: 3, R: 1 }, about: 'whether someone else has to act' },
];
const factorOf = (field: string) => FACTORS.find((f) => f.field === field);
export const fieldName = (field: string) => (field === 'stride_category' ? 'STRIDE category' : factorOf(field)?.name ?? ({ cvss: 'CVSS', feasibility: 'Attack feasibility', attack_path: 'Attack path' } as Record<string, string>)[field] ?? field);
const wordOf = (field: string, code: string) => factorOf(field)?.opts.find((o) => o[0] === code)?.[1] ?? code;

export interface ThreatsProps {
  assessmentId: string;
  data: UiStageOutput<ThreatRow> | null | undefined;
  rows: ThreatRow[];
  threads: Map<string, UiThread>;
  assumptions: UiAssumption[];
  railToggle: number;
  onRailChange: (open: boolean) => void;
}

export function useThreats(p: ThreatsProps) {
  const weights = p.data?.scales.weights;
  const exploit = p.data?.scales.exploitability;
  const weightOf = (f: (typeof FACTORS)[number], code: string) => weights?.[f.k]?.[code] ?? 0;
  /** 8.22 × AV × AC × PR × UI with the engine's weights, for the three-decimal view. */
  const cvssOf = (r: ThreatRow) => (r.factors && exploit ? exploit.factor * FACTORS.reduce((acc, f) => acc * weightOf(f, r.factors?.[f.field].code ?? ''), 1) : null);

  const cfg: ReviewCfg<ThreatRow> = {
    assessmentId: p.assessmentId, ui: '05', data: p.data, rows: p.rows, threads: p.threads, assumptions: p.assumptions,
    railToggle: p.railToggle, onRailChange: p.onRailChange,
    rowCode: (r) => threatCode(r.record_id),
    rowAbout: (r) => `${r.asset_name}, ${strideName(r.stride.value).toLowerCase()}`,
    searchText: (r) => `${threatCode(r.record_id)} ${attackCode(r.attack_id)} ${r.asset_ref} ${r.asset_name} ${strideName(r.stride.value)} ${r.threat} ${r.attack_path?.description ?? ''}`,
    isTop: (r) => (r.feasibility?.value ?? 0) >= 4,
    topLabel: 'High and Very high', filterFirst: 'High and Very high', noun: 'threats',
    fieldName,
    valueWord: (r, field, value) => (field === 'stride_category' ? strideName(value ?? r.stride.value) : wordOf(field, value ?? r.factors?.[field]?.code ?? '')),
    reviewable: (r) => [{ field: 'stride_category', reviewed: Boolean(r.stride.edit) }, ...(r.factors ? FACTORS.map((f) => ({ field: f.field, reviewed: Boolean(r.factors?.[f.field].edit) })) : [])],
    patch: (d, id, field, value) => ({ ...d, rows: d.rows.map((r) => {
      if (r.record_id !== id) return r;
      const edit = { kind: 'changed' as const, reason: 'Changed on the grid', by: '', at: '', from: null };
      if (field === 'stride_category') return { ...r, stride: { value, edit } };
      return r.factors ? { ...r, factors: { ...r.factors, [field]: { ...r.factors[field], code: value, label: wordOf(field, value), edit } } } : r;
    }) }),
    finishLabel: 'Finish review', doneLabel: 'Review finished',
  };
  const c = useReviewCore(cfg);
  const { s, set } = c;
  const feasIdx = (r: ThreatRow) => (r.feasibility ? r.feasibility.value : 0); // 1 to 5, 0 when there is no attack path yet

  // ── the table ───────────────────────────────────────────────────────────────

  const lines: Vals[] = [];
  for (const f of p.data?.families ?? []) {
    const rows = c.shown.filter((r) => r.family === f.code);
    if (!rows.length) continue;
    const closed = Boolean(s.collapsed[f.code]);
    lines.push({ isBand: true, isRow: false, code: f.code, name: f.name, countLabel: `${rows.length}${rows.length === 1 ? ' threat' : ' threats'}`, expanded: closed ? 'false' : 'true', toggle: () => set({ collapsed: { ...s.collapsed, [f.code]: !s.collapsed[f.code] } }) });
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
      const lv = feasIdx(r);
      const focus = s.rail && s.sel === threadKey(id, null);
      const score = cvssOf(r);
      const maxL = r.factors ? Math.max(...FACTORS.map((fa) => fa.level[r.factors?.[fa.field].code ?? ''] ?? 0)) : 0;
      const strideCell = (() => {
        const h = c.cell(id, 'stride_category', 132);
        const name = strideName(r.stride.value);
        const menuOpen = h.menuOpen;
        return {
          cls: 'kst', td: `background: ${bg}${top}${h.on ? '; background: #FFFFFF' : ''}`, btn: '--pc: #6F6B63', pcls: h.on ? 'pcell sel' : 'pcell',
          chip: `${NEUTRAL}; min-width: 0; max-width: 132px; white-space: normal; height: auto; min-height: 26px; padding: 4px 9px; line-height: 1.25`,
          text: name, locked: false, corner: c.cellDot(id, 'stride_category'),
          label: `STRIDE category for ${threatCode(id)}: ${name}`, title: 'STRIDE category. Click to change. Double-click to comment.',
          menu: menuOpen, menuStr: menuOpen ? 'true' : 'false', menuCls: `rmenu${menuOpen && s.menuUp ? ' up' : ''}`,
          opts: STRIDE.map((o) => ({ label: o.name, pts: '', on: o.value === r.stride.value ? 'true' : 'false', pick: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ menu: null }); c.edit(id, 'stride_category', { value: o.value, reason: 'Changed on the grid' }, o.value); } })),
          openMenu: h.openMenu, comment: h.comment, pick: h.pick,
        };
      })();
      lines.push({
        isBand: false, isRow: true, first, span: String(span[r.asset_id]), assetLabel: `${r.asset_ref} ${r.asset_name}`, assetTd: `background: #FFFFFF${top}; border-bottom: 0`,
        thr: threatCode(id), ap: attackCode(r.attack_id), aid: r.asset_ref, aname: r.asset_name,
        openPath: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ pathSheet: id, menu: null }); },
        prop: PROPNAME[r.property ?? ''], scen: r.threat,
        rowCorner: c.hasThread(threadKey(id, null)),
        idTd: `background: ${bg}${top}${rowSel ? '; box-shadow: inset 3px 0 0 #1F6C9F' : ''}`, plainTd: `background: ${bg}${top}`,
        stride: strideCell,
        cvssTd: `background: ${lv ? TINT5[lv - 1][0] : '#F7F6F2'}${top}`,
        cvssStyle: `font-size: 13px; font-weight: 600; text-align: center; color: ${lv ? TINT5[lv - 1][1] : '#8E8D89'}`,
        cvss: score === null ? '–' : s.points ? score.toFixed(3) : (r.cvss ?? score).toFixed(2),
        rtTd: `background: ${lv ? RISK[lv - 1][0] : '#F7F6F2'}${top}${rowSel ? '; box-shadow: inset 0 0 0 2px #1F6C9F' : ''}`,
        rtChip: `background: transparent; color: ${lv ? RISK[lv - 1][1] : '#8E8D89'}`, rtText: lv ? FEAS[lv - 1] : '–',
        rtTitle: lv && r.cvss !== null ? `CVSS exploitability ${r.cvss.toFixed(2)} gives ${FEAS[lv - 1]}` : 'No attack path yet',
        pickRow: c.pickRow(id), dblRow: c.dblRow(id),
        cells: FACTORS.map((fa, i) => {
          const fac = r.factors?.[fa.field];
          const cur = fac?.code ?? '';
          const n = fac ? fa.level[cur] : 0;
          const key = threadKey(id, fa.field);
          const h = c.cell(id, fa.field, 132);
          const isDrv = maxL > 1 && n === maxL;
          const menuOpen = h.menuOpen && Boolean(fac);
          return {
            cls: `cat k${i}${isDrv ? ' drv' : ''}`,
            td: !fac ? `background: #F7F6F2${top}` : `--oc: ${OUT[n - 1]}; background: ${focus && isDrv ? RISK[n - 1][0] : TINT[n - 1][0]}${top}${s.sel === key ? `; box-shadow: inset 0 0 0 2px ${OUT[n - 1]}` : ''}${focus && !isDrv ? '; filter: saturate(.35) opacity(.55)' : ''}`,
            btn: '--pc: #6F6B63', pcls: h.on ? 'pcell sel' : 'pcell',
            chip: !fac ? 'background: #F7F6F2; color: #8E8D89; box-shadow: none' : `background: transparent; box-shadow: none; color: ${focus && isDrv ? '#FFFFFF' : TINT[n - 1][1]}`,
            text: !fac ? '–' : s.points ? String(weightOf(fa, cur)) : fac.label, locked: !fac, corner: c.cellDot(id, fa.field),
            label: fac ? `${fa.name} for ${threatCode(id)}: ${fac.label}` : `${fa.name}: no attack path yet`,
            title: fac ? `${fa.name}: ${fac.why} Click to change. Double-click to comment.` : 'No attack path yet.',
            menu: menuOpen, menuStr: menuOpen ? 'true' : 'false', menuCls: `rmenu${menuOpen && s.menuUp ? ' up' : ''}`,
            opts: fa.opts.map(([code, label]) => {
              const m = fa.level[code];
              return {
                label, pts: weightOf(fa, code), on: code === cur ? 'true' : 'false', sw: `background: ${TINT[m - 1][0]}; color: ${TINT[m - 1][1]}; --ob: ${OUT[m - 1]}`,
                pick: (ev?: MouseEvent) => { ev?.stopPropagation(); set({ menu: null }); c.edit(id, fa.field, { value: code, reason: 'Changed on the grid' }, code); },
              };
            }),
            openMenu: h.openMenu, comment: h.comment, pick: h.pick,
          };
        }),
      });
    });
  }
  const fheads = FACTORS.map((fa, i) => ({ cls: `pc k${i}`, name: fa.name, title: fa.name, style: 'text-align: center; --pc: #6F6B63' }));

  // ── the header strip ────────────────────────────────────────────────────────

  const counts = [0, 0, 0, 0, 0];
  p.rows.forEach((r) => { const l = feasIdx(r); if (l) counts[l - 1] += 1; });
  const total = p.rows.length;
  const order = [4, 3, 2, 1, 0];
  const dist = order.map((i) => ({ style: `width: ${total ? ((counts[i] / total) * 100).toFixed(2) : 0}%; background: ${RISK[i][0]}` }));
  const distLegend = order.map((i) => ({ n: String(counts[i]), label: FEAS[i], dot: `width: 9px; height: 9px; border-radius: 99px; background: ${RISK[i][0]}` }));
  const distText = order.filter((i) => counts[i]).map((i) => `${counts[i]} ${FEAS[i].toLowerCase()}`).join(' · ');

  // ── the attack path sheet ───────────────────────────────────────────────────

  const sheetRow = s.pathSheet ? c.rowById.get(s.pathSheet) : undefined;
  const path = (() => {
    const r = sheetRow;
    if (!r || !r.attack_path) return { steps: [], factors: [] };
    const steps = r.attack_path.steps;
    const lv = feasIdx(r);
    return {
      ap: attackCode(r.attack_id), thr: threatCode(r.record_id), stride: strideName(r.stride.value), asset: `${r.asset_ref} · ${r.asset_name}`, scen: r.threat,
      dmg: damageCode(r.damage_id), dmgText: r.damage ?? '', cvss: (r.cvss ?? 0).toFixed(2), afr: lv ? FEAS[lv - 1] : '–',
      afrStyle: lv ? `background: ${RISK[lv - 1][0]}; color: ${RISK[lv - 1][1]}` : '',
      steps: steps.map((text, i, all) => ({ n: String(i + 1), text, last: i === all.length - 1 })),
      factors: FACTORS.map((fa) => {
        const fac = r.factors?.[fa.field];
        const m = fac ? fa.level[fac.code] : 0;
        return { name: fa.short, val: fac?.label ?? '–', style: m ? `background: ${TINT[m - 1][0]}; color: ${TINT[m - 1][1]}; box-shadow: inset 0 0 0 1px ${OUT[m - 1]}` : '' };
      }),
    };
  })();

  // ── the side panel ──────────────────────────────────────────────────────────

  const sel = (() => {
    const base: Vals = {
      code: '', sub: '', descLabel: 'Threat scenario', descTag: '', whyLabel: 'Why', isRow: false, groups: [], whyCls: 'whywrap', whyHidden: 'true', whyAnim: 'propwhy', whyName: '', whyState: '', whyReason: '', whyFlip: '', whyHasFlip: false,
      title: '', state: '', stateCls: '', reason: '', quotes: [], hasFlip: false, flip: '', msgs: [], asms: [], hasDesc: false, desc: '', isProp: false, proposedWord: '', rowLeftHint: '', rowLeft: false, rowLeftLabel: '', confirmRow: () => {},
      canReview: false, changing: false, changeLabel: 'Change', confirm: () => {}, startChange: () => {}, saveChange: () => {}, changeExtra: null, resolve: () => {}, resolveLabel: 'Resolve', send: () => {},
    };
    if (!s.sel || !c.selId) return base;
    const r = c.rowById.get(c.selId);
    if (!r) return base;
    const k = s.sel;
    const field = c.selField as string;
    const row = field === 'row';
    Object.assign(base, c.baseSel(k, r));
    base.code = threatCode(r.record_id);
    base.hasDesc = true; base.desc = r.threat;
    base.asms = c.asmView(p.assumptions.filter((a) => a.record_id === r.record_id && (row || a.field === field)));
    const lv = feasIdx(r);
    const changedNote = (edit: { kind: string; reason: string } | null | undefined) => (edit?.kind === 'changed' ? ` Changed by you: ${edit.reason}` : '');
    if (row) {
      base.sub = strideName(r.stride.value); base.title = `${r.asset_name} · ${strideName(r.stride.value)}`;
      base.state = lv ? FEAS[lv - 1] : 'No attack path'; base.stateCls = 'tag t-ink';
      base.whyLabel = 'Why this feasibility'; base.isRow = true; base.groupsLabel = 'Exploitability factors';
      const score = cvssOf(r);
      base.reason = r.factors && score !== null && lv
        ? `Leads to ${damageCode(r.damage_id)}: ${r.damage ?? ''} CVSS exploitability is ${exploit?.factor ?? 8.22} × ${FACTORS.map((fa) => weightOf(fa, r.factors?.[fa.field].code ?? '')).join(' × ')} = ${(r.cvss ?? score).toFixed(2)}, which is ${FEAS[lv - 1].toLowerCase()} feasibility.`
        : `Leads to ${damageCode(r.damage_id)}: ${r.damage ?? ''} The attack path is written when the threats are analysed.`;
      const maxL = r.factors ? Math.max(...FACTORS.map((fa) => fa.level[r.factors?.[fa.field].code ?? ''] ?? 0)) : 0;
      const mk = (fa: (typeof FACTORS)[number]) => {
        const fac = r.factors?.[fa.field];
        const n = fac ? fa.level[fac.code] : 0;
        const wk = `${r.record_id}.${fa.field}`;
        const open = s.propWhy === wk;
        const drv = maxL > 1 && n === maxL;
        if (open) { base.whyCls = 'whywrap open'; base.whyHidden = 'false'; base.whyAnim = s.whySwap ? `propwhy ${s.whySwap % 2 ? 'fa' : 'fb'}` : 'propwhy'; }
        if (fac && (open || (!s.propWhy && s.whyLast === wk))) {
          base.whyName = fa.name; base.whyState = fac.label; base.whyReason = `${fac.why}${changedNote(fac.edit)}`; base.whyHasFlip = true; base.whyFlip = `Evidence about ${fa.about} would change it.`;
        }
        return {
          name: fa.short, lv: fac?.label ?? '–', openStr: open ? 'true' : 'false', dot: c.cellDot(r.record_id, fa.field),
          whyLabel: `${open ? 'Hide' : 'Show'} why ${fa.name} is ${fac?.label ?? 'not set'}`,
          style: !n ? 'background: #F7F6F2; color: #8E8D89; box-shadow: inset 0 0 0 1px #E2DFD8' : drv ? `background: ${RISK[n - 1][0]}; color: ${RISK[n - 1][1]}; box-shadow: inset 0 0 0 1.5px ${OUT[n - 1]}, 0 0 0 3px ${OUT[n - 1]}2E` : `background: ${TINT[n - 1][0]}; color: ${TINT[n - 1][1]}; box-shadow: inset 0 0 0 1px ${OUT[n - 1]}`,
          toggleWhy: () => c.toggleWhy(wk),
        };
      };
      base.groups = [{ name: 'CVSS factors', items: FACTORS.map(mk) }];
      const left = c.cfg.reviewable(r).filter((x) => !x.reviewed);
      if (left.length) {
        base.rowLeft = true; base.rowLeftHint = `${left.length} of ${c.cfg.reviewable(r).length} values not yet reviewed.`; base.rowLeftLabel = 'Confirm all';
        base.confirmRow = async () => { for (const x of left) if (!(await c.edit(r.record_id, x.field, { confirm: true }))) break; };
      }
    } else {
      const fa = factorOf(field);
      const fac = fa ? r.factors?.[field] : undefined;
      base.sub = fieldName(field); base.title = fieldName(field);
      base.whyLabel = 'Why this rating';
      let current = '';
      let edit = null as { kind: string; reason: string } | null;
      if (field === 'stride_category') {
        current = strideName(r.stride.value); edit = r.stride.edit;
        base.reason = `${r.derivation_note}${changedNote(edit)}`;
      } else if (fa && fac) {
        current = fac.label; edit = fac.edit;
        base.reason = `${fac.why}${changedNote(edit)}`; base.hasFlip = true; base.flip = `Evidence about ${fa.about} would change it.`;
      } else if (field === 'cvss' || field === 'feasibility') {
        current = field === 'cvss' ? String((r.cvss ?? 0).toFixed(2)) : lv ? FEAS[lv - 1] : '–';
        base.reason = r.cvss !== null ? `CVSS exploitability is ${exploit?.factor ?? 8.22} × the four factors = ${r.cvss.toFixed(2)}. It is worked out from the factors, so change a factor to change it.` : 'There is no attack path yet.';
      }
      base.state = current; base.stateCls = 'tag t-ink';
      const editable = field === 'stride_category' || Boolean(fac);
      if (editable) {
        base.isProp = true; base.proposedWord = current;
        base.canReview = !edit && !s.changing;
        base.confirm = () => c.edit(r.record_id, field, { confirm: true });
        base.startChange = () => set({ changing: true, pick: null });
        base.changing = s.changing;
        const currentCode = field === 'stride_category' ? r.stride.value : fac?.code;
        base.canSave = Boolean(s.pick) && s.pick !== currentCode;
        base.saveChange = async () => {
          if (await c.edit(r.record_id, field, { value: s.pick as string, reason: s.draft.trim() }, s.pick as string)) set({ changing: false, draft: '', pick: null });
        };
        const options: [string, string][] = field === 'stride_category' ? STRIDE.map((o) => [o.value, o.name]) : fa?.opts ?? [];
        base.changeExtra = (
          <span role="group" aria-label="New value" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, padding: 3, borderRadius: 10, background: '#F1F0EC', alignSelf: 'flex-start' }}>
            {options.map(([code, label]) => (
              <button key={code} type="button" className="seg" aria-pressed={s.pick === code} onClick={() => set({ pick: code })} style={s.pick === code ? { background: '#FFFFFF', color: '#1C1B19', fontWeight: 500, boxShadow: '0 1px 2px rgba(28,27,25,.1)' } : undefined}>{label}</button>
            ))}
          </span>
        );
      }
    }
    return base;
  })();

  const v: Vals = {
    ...c.common,
    headTitle: 'Threat scenarios', searchLabel: 'Search threats', showPoints: true, pointsLabel: 'Show ratings as points', noun: 'threats',
    dist, distLegend, totalText: `${total} total threats`, distTitle: `Attack feasibility across all threats: ${distText}`,
    legendNode: (
      <div className="legendpop" role="dialog" aria-label="What the marks mean">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Attack feasibility</span>
          <span style={{ color: '#6B6A66' }}>CVSS exploitability = {exploit?.factor ?? 8.22} × attack vector × complexity × privileges × user interaction.</span>
          {FEAS.map((l, i) => {
            const lo = i === 0 || !exploit ? null : exploit.min + (exploit.max - exploit.min) * ((i + 1 - 1.5) / 4);
            const hi = i === 4 || !exploit ? null : exploit.min + (exploit.max - exploit.min) * ((i + 2 - 1.5) / 4);
            return (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rchip" style={{ background: RISK[i][0], color: RISK[i][1], cursor: 'default' }}>{l}</span>
                <span style={{ color: '#6B6A66' }}>{lo === null ? `below ${hi?.toFixed(2)}` : hi === null ? `${lo.toFixed(2)} and above` : `${lo.toFixed(2)} to ${hi.toFixed(2)}`}</span>
              </span>
            );
          })}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="ndot" style={{ position: 'static', boxShadow: 'none' }} />Has an assumption or comments</span>
        <span style={{ color: '#6B6A66', paddingTop: 6, borderTop: '1px solid #F1F0EC' }}>The engine works out the feasibility from the factors. Click a value to change it. Double-click a cell to comment.</span>
      </div>
    ),
    warnText: 'Confirm or dispute them before you finish the threat review. The factors they affect may still change.',
    lines, fheads,
    pathOpen: Boolean(s.pathSheet) && Boolean(sheetRow?.attack_path), path, closePath: () => set({ pathSheet: null }),
    toggleAssetCol: (ev?: MouseEvent) => { ev?.stopPropagation(); animAssetCol(c.rootRef.current, !s.assetColOff, () => set({ assetColOff: !s.assetColOff })); },
    panelName: '05 Threat Analysis', asmHint: 'Confirm or dispute the assumptions below. Select a threat, or double-click a factor, to see the reasoning and comment.',
    sel, crumb: c.selId ? c.rowById.get(c.selId)?.asset_name ?? '' : '',
    draftShort: s.draft.trim().length < 10 || !(sel as Vals).canSave,
  };
  return { c, v };
}
