/**
 * 07 Residual risk (D-73): the values the screen reads, built from the pipeline's residual records. It works like 04 to 06: rows
 * grouped by family, selection with a side panel, filters, paging, comments and Assumptions, finish. The values are calculated
 * (folders 06 to 10), so nothing on the sheet is edited; a change is made on 05 or 06 and the sheet is built again.
 */

import { useEffect, type MouseEvent } from 'react';
import { assetCode, damageCode, riskCode, threatCode } from '@/lib/displayIds';
import { AI_OFF_NOTE, useAiOff } from '@/lib/preview';
import type { ResidualRow, ResidualState, RiskLevel, UiAssumption, UiStageOutput } from '@/types/stages';
import { animCols } from '../review/colAnim';
import { NEUTRAL, RISK, TINT, TINT5 } from '../review/palette';
import { useReviewCore, type ReviewCfg } from '../review/useReviewCore';
import { threadKey, type UiThread } from '../review/useUiStageData';
import type { Vals } from '../review/types';
import { LEVELS, RISK_LEVELS, RISK_NAMES } from '../tara/useTara';
import { FEAS } from '../threats/useThreats';

export const METRICS = [
  { key: 'attack_vector', label: 'Attack vector', values: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' } as Record<string, string> },
  { key: 'attack_complexity', label: 'Attack complexity', values: { L: 'Low', H: 'High' } as Record<string, string> },
  { key: 'privileges_required', label: 'Privileges required', values: { N: 'None', L: 'Low', H: 'High' } as Record<string, string> },
  { key: 'user_interaction', label: 'User interaction', values: { N: 'None', R: 'Required' } as Record<string, string> },
] as const;

const riskIdx = (l: RiskLevel) => RISK_LEVELS.indexOf(l);
const metricOf = (key: string) => METRICS.find((m) => m.key === key);
export const fieldName = (f: string) => metricOf(f)?.label ?? ({ feasibility: 'Attack feasibility', risk: 'Risk score', residual: 'Residual risk', impact: 'Impact rating' } as Record<string, string>)[f] ?? f;
const feas = (v: number) => (v >= 1 ? FEAS[v - 1] : '–');
const feasStyle = (v: number) => (v >= 1 ? `background: ${TINT5[v - 1][0]}; color: ${TINT5[v - 1][1]}` : '');

export interface ResidualProps {
  assessmentId: string;
  data: UiStageOutput<ResidualRow> | null | undefined;
  rows: ResidualRow[];
  threads: Map<string, UiThread>;
  assumptions: UiAssumption[];
  railToggle: number;
  onRailChange: (open: boolean) => void;
}

export function useResidual(p: ResidualProps) {
  const cfg: ReviewCfg<ResidualRow> = {
    assessmentId: p.assessmentId, ui: '07', data: p.data, rows: p.rows, threads: p.threads, assumptions: p.assumptions,
    railToggle: p.railToggle, onRailChange: p.onRailChange,
    rowCode: (r) => threatCode(r.record_id),
    rowAbout: (r) => `${r.asset_name}, risk ${r.post.risk.score}`,
    searchText: (r) => `${threatCode(r.record_id)} ${riskCode(r.risk_id)} ${damageCode(r.damage_id)} ${assetCode(r.asset_ref)} ${r.asset_name} ${r.damage ?? ''} ${r.threat ?? ''}`,
    isTop: (r) => r.changes.length > 0, topLabel: 'Changed by controls', filterFirst: 'Changed by controls', noun: 'risks',
    fieldName, valueWord: (_r, _field, value) => value ?? '',
    reviewable: () => [], patch: (d) => d,
    finishLabel: 'Finish residual risk', doneLabel: 'Residual risk finished',
  };
  const c = useReviewCore(cfg);
  const aiOff = useAiOff();
  const { s, set } = c;
  // The two text columns start as IDs only, so the numbers have room; the arrows in the header open them.
  useEffect(() => { set({ dcolOff: true, tcolOff: true }); }, [set]);

  // ── the table ───────────────────────────────────────────────────────────────

  const lines: Vals[] = [];
  for (const f of p.data?.families ?? []) {
    const rows = c.shown.filter((r) => r.family === f.code);
    if (!rows.length) continue;
    const closed = Boolean(s.collapsed[f.code]);
    lines.push({ isBand: true, isRow: false, code: f.code, name: f.name, countLabel: `${rows.length}${rows.length === 1 ? ' risk' : ' risks'}`, expanded: closed ? 'false' : 'true', toggle: () => set({ collapsed: { ...s.collapsed, [f.code]: !s.collapsed[f.code] } }) });
    if (closed) continue;
    const span: Record<string, number> = {};
    const dspan: Record<string, number> = {};
    const lastDmg: Record<string, string> = {};
    rows.forEach((r) => { span[r.asset_id] = (span[r.asset_id] || 0) + 1; dspan[r.asset_id + r.damage_id] = (dspan[r.asset_id + r.damage_id] || 0) + 1; lastDmg[r.asset_id] = r.damage_id; });
    let prevAsset: string | null = null;
    let prevDmg: string | null = null;
    let assetIdx = -1;
    rows.forEach((r) => {
      const first = r.asset_id !== prevAsset;
      const firstDmg = first || r.damage_id !== prevDmg;
      if (first) assetIdx += 1;
      prevAsset = r.asset_id; prevDmg = r.damage_id;
      const id = r.record_id;
      const rowSel = c.selId === id && c.selField === 'row';
      const bg = rowSel ? '#F4FAFE' : '#FFFFFF';
      const top = first && assetIdx > 0 ? '; border-top: 2px solid #D9D4C9' : '';
      const dmgBottom = lastDmg[r.asset_id] === r.damage_id ? '; border-bottom: 0' : '; border-bottom: 1px solid #E7E3DB';
      const ri = riskIdx(r.post.risk.level);
      const cellOf = (field: string) => c.cell(id, field, 96);
      const metric = (m: (typeof METRICS)[number]) => {
        const h = cellOf(m.key);
        const change = r.changes.find((x) => x.metric === m.key);
        return {
          key: m.key, td: `background: ${rowSel ? bg : change ? '#FBFAF5' : bg}${top}`, cls: h.on ? 'pcell sel' : 'pcell', pick: h.pick, comment: h.comment, dot: c.cellDot(id, m.key),
          text: m.values[r.post.metrics[m.key as keyof ResidualState['metrics']]] ?? r.post.metrics[m.key as keyof ResidualState['metrics']], changed: Boolean(change),
          title: change ? `${m.label}: was ${m.values[change.from]} before the controls. ${change.reason ?? ''} Double-click to comment.` : `${m.label}: not changed by the controls. Double-click to comment.`,
        };
      };
      lines.push({
        isBand: false, isRow: true, first, span: String(span[r.asset_id]), firstDmg, dspan: String(dspan[r.asset_id + r.damage_id]),
        assetLabel: `${assetCode(r.asset_ref)} ${r.asset_name}`, assetTd: `background: #FFFFFF${top}; border-bottom: 0`, aid: assetCode(r.asset_ref), aname: r.asset_name, atype: r.asset_type ?? '',
        thr: threatCode(id), dmg: damageCode(r.damage_id), dscen: r.damage, tscen: r.threat,
        dmgTd: `background: #FFFFFF${top}${dmgBottom}`, rowCorner: c.hasThread(threadKey(id, null)), plainTd: `background: ${bg}${top}`,
        impTd: `background: ${TINT[r.impact.value][0]}${top}`, impStyle: `font-size: 12.5px; font-weight: 500; color: ${TINT[r.impact.value][1]}`,
        impText: LEVELS[r.impact.value], impTitle: `${LEVELS[r.impact.value]} impact for ${damageCode(r.damage_id)}, from Impact Analysis`,
        metrics: METRICS.map(metric),
        preCvss: r.pre.cvss.toFixed(2), preAfrTd: `${feasStyle(r.pre.feasibility.value)}${top}`, preAfrText: feas(r.pre.feasibility.value),
        postCvss: r.post.cvss.toFixed(2), postCvssStyle: r.changes.length ? 'font-weight: 600; color: #1C1B19' : 'color: #4A4946',
        postAfrTd: `${feasStyle(r.post.feasibility.value)}${top}`, postAfrText: feas(r.post.feasibility.value),
        scoreTd: `background: ${RISK[ri][0]}${top}${rowSel ? '; box-shadow: inset 0 0 0 2px #1F6C9F' : ''}`, scoreStyle: `font-size: 12.5px; font-weight: 600; color: ${RISK[ri][1]}`, scoreText: String(r.post.risk.score),
        scoreTitle: `Impact ${r.impact.value} times attack feasibility ${r.post.feasibility.value} gives ${r.post.risk.score}, ${r.post.risk.level}.`,
        resTd: `background: ${bg}${top}`, resText: RISK_NAMES[ri], resChip: NEUTRAL,
        pickRow: c.pickRow(id), dblRow: c.dblRow(id),
      });
    });
  }

  // ── the header strip ────────────────────────────────────────────────────────

  const counts = [0, 0, 0, 0, 0];
  p.rows.forEach((r) => { counts[riskIdx(r.post.risk.level)] += 1; });
  const total = p.rows.length;
  const order = [4, 3, 2, 1, 0];
  const dist = order.filter((i) => counts[i]).map((i) => ({ style: `flex: ${counts[i]} 1 0; background: ${RISK[i][0]}` }));
  const distLegend = order.map((i) => ({ zero: !counts[i], n: String(counts[i]), label: RISK_NAMES[i], dot: `background: ${RISK[i][0]}` }));
  const distText = order.filter((i) => counts[i]).map((i) => `${counts[i]} ${RISK_NAMES[i].toLowerCase()}`).join(' · ');

  // ── the side panel ──────────────────────────────────────────────────────────

  const sel = (() => {
    const base: Vals = {
      code: '', sub: '', descLabel: 'Threat scenario', descTag: '', hasDesc2: false, desc2Label: '', desc2Tag: '', desc2: '', hasGoal: false, goalLabel: '', goalTag: '', hasGoalTag: false, goalText: '', groupsLabel: 'Feasibility and risk',
      whyLabel: 'Why', isRow: false, groups: [], whyCls: 'whywrap', whyHidden: 'true', whyAnim: 'propwhy', whyName: '', whyState: '', whyReason: '', whyFlip: '', whyHasFlip: false,
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
    base.state = RISK_NAMES[riskIdx(r.post.risk.level)]; base.stateCls = 'tag t-ink';
    base.hasDesc = true; base.descLabel = 'Threat scenario'; base.desc = r.threat ?? ''; base.descTag = threatCode(r.record_id);
    base.asms = c.asmView(p.assumptions.filter((a) => a.record_id === r.record_id && (row || a.field === field)));
    const changed = r.changes.length > 0;
    const controls = r.controls.map((x) => x.title).join(', ');
    const moved = changed
      ? `With the controls in place (${controls}) the exploitability moves from ${r.pre.cvss.toFixed(2)} to ${r.post.cvss.toFixed(2)} and the risk score from ${r.pre.risk.score} (${r.pre.risk.level}) to ${r.post.risk.score} (${r.post.risk.level}). ${r.changes.map((x) => x.reason).filter(Boolean).join(' ')}`
      : `The controls do not change how hard the attack is, so the risk stays at ${r.post.risk.score} (${r.post.risk.level}).`;
    const flip = 'A control that is not in place, or an attack path the controls do not close.';
    if (row) {
      base.sub = r.asset_name; base.title = `${r.asset_name} · residual ${r.post.risk.score}`;
      base.hasDesc2 = true; base.desc2Label = 'Damage scenario'; base.desc2Tag = damageCode(r.damage_id); base.desc2 = r.damage ?? '';
      base.whyLabel = 'Why this residual risk'; base.isRow = true; base.reason = moved; base.hasFlip = true; base.flip = flip;
      const item = (name: string, wk: string, lvText: string, why: string, flipText: string, style: string, dot: boolean) => {
        const open = s.propWhy === wk;
        if (open) { base.whyCls = 'whywrap open'; base.whyHidden = 'false'; base.whyAnim = s.whySwap ? `propwhy ${s.whySwap % 2 ? 'fa' : 'fb'}` : 'propwhy'; }
        if (open || (!s.propWhy && s.whyLast === wk)) { base.whyName = name; base.whyState = lvText; base.whyReason = why; base.whyHasFlip = true; base.whyFlip = flipText; }
        return { name, lv: lvText, openStr: open ? 'true' : 'false', dot, whyLabel: `${open ? 'Hide' : 'Show'} why ${name.toLowerCase()} is ${lvText}`, style, toggleWhy: () => c.toggleWhy(wk) };
      };
      const tint = (n: number) => `background: ${TINT[n][0]}; color: ${TINT[n][1]}`;
      base.groups = [
        { name: 'Before the controls', items: [
          item('Impact', `${r.record_id}.impact`, LEVELS[r.impact.value], `${damageCode(r.damage_id)} was rated ${LEVELS[r.impact.value].toLowerCase()} in Impact Analysis, taken from its highest category.`, `A change to the rating of ${damageCode(r.damage_id)} on 04.`, tint(r.impact.value), false),
          item('Feasibility', `${r.record_id}.feasibility`, feas(r.pre.feasibility.value), `The CVSS exploitability of the attack is ${r.pre.cvss.toFixed(2)}, from the four metrics rated on 05. That is ${feas(r.pre.feasibility.value).toLowerCase()} attack feasibility.`, 'A change to one of the CVSS metrics on 05.', feasStyle(r.pre.feasibility.value), false),
        ] },
        { name: 'After the controls', items: METRICS.map((m) => {
          const change = r.changes.find((x) => x.metric === m.key);
          return item(m.label, `${r.record_id}.${m.key}`, m.values[r.post.metrics[m.key]] ?? r.post.metrics[m.key], change ? `Was ${m.values[change.from]} before the controls. ${change.reason ?? ''}` : 'The controls do not change this metric.', flip, change ? 'background: #E6E2D9; color: #1C1B19' : NEUTRAL, c.cellDot(r.record_id, m.key));
        }) },
        { name: 'Residual', items: [
          item('Feasibility', `${r.record_id}.postfeasibility`, feas(r.post.feasibility.value), `CVSS exploitability ${r.post.cvss.toFixed(2)} with the controls in place, which is ${feas(r.post.feasibility.value).toLowerCase()} attack feasibility.`, flip, feasStyle(r.post.feasibility.value), false),
          item('Risk score', `${r.record_id}.risk`, String(r.post.risk.score), `Impact value ${r.impact.value} times feasibility value ${r.post.feasibility.value} gives ${r.post.risk.score}, which is ${r.post.risk.level}.`, flip, `background: ${RISK[riskIdx(r.post.risk.level)][0]}; color: ${RISK[riskIdx(r.post.risk.level)][1]}`, false),
        ] },
      ];
    } else {
      base.sub = fieldName(field); base.title = fieldName(field);
      const m = metricOf(field);
      if (m) {
        const change = r.changes.find((x) => x.metric === m.key);
        base.state = m.values[r.post.metrics[m.key]] ?? ''; base.isProp = true; base.proposedWord = base.state;
        base.reason = change ? `Was ${m.values[change.from]} before the controls. ${change.reason ?? ''}` : 'The controls do not change this metric.';
        base.hasFlip = true; base.flip = flip;
      } else {
        base.reason = moved;
      }
    }
    return base;
  })();

  const levelRows = (p.data?.scales.risk_levels ?? []).map((l) => ({ ...l, name: RISK_NAMES[riskIdx(l.level)], i: riskIdx(l.level) }));
  const failed = p.data?.folders.find((f) => f.status === 'failed');
  const building = Boolean(p.data?.building);
  const notice = building
    ? { tone: 'blue', text: 'Scoring the risks and choosing their treatment. This usually takes a few minutes.' }
    : failed
      ? { tone: 'red', text: failed.error || `Building folder ${String(failed.stage_num).padStart(2, '0')} stopped. Try again.`, rebuild: true }
      : p.data?.stale.is
        ? { tone: 'yellow', text: 'This is out of date: a change you made means the residual risk was not calculated again.', rebuild: true }
        : null;

  const v: Vals = {
    ...c.common,
    headTitle: 'Residual risk', searchLabel: 'Search risks', showPoints: false, pointsLabel: '', noun: 'risks',
    dist, distLegend, totalText: `${total} risks`, distTitle: `Residual risk level of all ${total} risks: ${distText}`,
    notice, noticeRebuild: c.rebuild, noticeRebuilding: c.rebuilding, aiOffNote: aiOff ? AI_OFF_NOTE : '',
    legendNode: (
      <div className="legendpop" role="dialog" aria-label="What the marks mean">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Risk score = impact value × feasibility value</span>
          <span style={{ color: '#6B6A66' }}>Feasibility is worked out again from the four CVSS metrics with the controls in place.</span>
          {levelRows.map((l) => (
            <span key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="rchip" style={{ background: RISK[l.i][0], color: RISK[l.i][1], cursor: 'default' }}>{l.name}</span>
              <span style={{ color: '#6B6A66' }}>{l.from === l.to ? `score ${l.from}` : `score ${l.from} to ${l.to}`}</span>
            </span>
          ))}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="tag t-ink">High</span>A metric a control made harder</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="ndot" style={{ position: 'static', boxShadow: 'none' }} />Has an assumption or comments</span>
        <span style={{ color: '#6B6A66', paddingTop: 6, borderTop: '1px solid #F1F0EC' }}>Every value is calculated, so nothing here is edited. To change one, change the attack path on 05 or the treatment on 06. Double-click a cell to comment.</span>
      </div>
    ),
    warnText: 'Confirm or dispute them before you finish the residual risk. The values they affect may still change.',
    lines,
    dcolOffStr: s.dcolOff ? 'true' : 'false', dcolLabel: s.dcolOff ? 'Show damage scenarios' : 'Show only damage IDs',
    tcolOffStr: s.tcolOff ? 'true' : 'false', tcolLabel: s.tcolOff ? 'Show threat scenarios' : 'Show only threat IDs',
    toggleAssetCol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'assetColOff', !s.assetColOff, () => set({ assetColOff: !s.assetColOff })); },
    toggleDcol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'dcolOff', !s.dcolOff, () => set({ dcolOff: !s.dcolOff })); },
    toggleTcol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'tcolOff', !s.tcolOff, () => set({ tcolOff: !s.tcolOff })); },
    tableMin: s.dcolOff && s.tcolOff ? 1160 : 1540,
    panelName: '07 Residual risk', asmHint: 'Confirm or dispute the assumptions below. Select a risk, or double-click a cell, to see the reasoning and comment.',
    sel, crumb: c.selId ? c.rowById.get(c.selId)?.asset_name ?? '' : '',
    draftShort: true,
  };
  return { c, v };
}
