/**
 * 06 TARA: the values the design's page reads (renderVals of Tara.dc.html), built from the pipeline's risk records (spec 31).
 * The risk score and level are folder 08's (impact value times feasibility value, 0 to 15), the treatment is folder 09's and
 * the residual risk folder 10's. The design's risk matrix becomes a legend of the pipeline's formula and level thresholds.
 */

import type { MouseEvent } from 'react';
import { damageCode, goalCode, riskCode, threatCode } from '@/lib/displayIds';
import type { RiskLevel, TaraRow, Treatment, UiAssumption, UiStageOutput } from '@/types/stages';
import { PROPNAME } from '../impacts/useImpacts';
import { animCols } from '../review/colAnim';
import { NEUTRAL, OUT, RISK, ROUT, SOLID, TINT, TINT5 } from '../review/palette';
import { useReviewCore, type ReviewCfg } from '../review/useReviewCore';
import { threadKey, type UiThread } from '../review/useUiStageData';
import type { Vals } from '../review/types';
import { FEAS } from '../threats/useThreats';

export const LEVELS = ['Negligible', 'Moderate', 'Major', 'Severe'];
export const RISK_LEVELS: RiskLevel[] = ['informational', 'low', 'medium', 'high', 'critical'];
export const RISK_NAMES = ['Informational', 'Low', 'Medium', 'High', 'Critical'];
export const OPTIONS: { value: Treatment; name: string; hint: string }[] = [
  { value: 'reduce', name: 'Reduce', hint: 'add a goal' },
  { value: 'accept', name: 'Accept', hint: 'give a reason' },
  { value: 'share', name: 'Share', hint: 'give a reason' },
  { value: 'avoid', name: 'Avoid', hint: 'say the action' },
];
const optName = (o: string | undefined) => OPTIONS.find((x) => x.value === o)?.name ?? o ?? '';
const riskIdx = (l: RiskLevel) => RISK_LEVELS.indexOf(l);
export const fieldName = (f: string) => ({ treatment_option: 'Risk treatment', cybersecurity_goal: 'Cybersecurity goal', risk: 'Risk', feasibility: 'Attack feasibility', impact: 'Impact rating' } as Record<string, string>)[f] ?? f;
const acceptable = (r: TaraRow) => r.risk.level === 'informational' || r.risk.level === 'low';

export interface TaraProps {
  assessmentId: string;
  data: UiStageOutput<TaraRow> | null | undefined;
  rows: TaraRow[];
  threads: Map<string, UiThread>;
  assumptions: UiAssumption[];
  railToggle: number;
  onRailChange: (open: boolean) => void;
}

/** Why this treatment, in the words of the folder that chose it (and the analyst's reason when they changed it). */
function treatmentWhy(r: TaraRow): string {
  const t = r.treatment;
  if (!t) return 'No treatment has been chosen yet.';
  const note = t.edit?.kind === 'changed' ? ` Changed by you: ${t.edit.reason}` : '';
  return `${t.rationale}${note}`;
}

export function useTara(p: TaraProps) {
  const cfg: ReviewCfg<TaraRow> = {
    assessmentId: p.assessmentId, ui: '06', data: p.data, rows: p.rows, threads: p.threads, assumptions: p.assumptions,
    railToggle: p.railToggle, onRailChange: p.onRailChange,
    rowCode: (r) => threatCode(r.record_id),
    rowAbout: (r) => `${r.asset_name}, risk ${r.risk.score}`,
    searchText: (r) => `${threatCode(r.record_id)} ${riskCode(r.risk_id)} ${damageCode(r.damage_id)} ${r.asset_ref} ${r.asset_name} ${r.damage ?? ''} ${r.threat ?? ''} ${r.treatment?.goal?.statement ?? ''} ${optName(r.treatment?.option)}`,
    isTop: (r) => r.risk.level === 'high' || r.risk.level === 'critical',
    topLabel: 'High and Critical', filterFirst: 'High and Critical', noun: 'risks',
    fieldName,
    valueWord: (r, field, value) => (field === 'treatment_option' ? optName(value ?? r.treatment?.option) : value ?? ''),
    reviewable: (r) => (r.treatment ? [{ field: 'treatment_option', reviewed: Boolean(r.treatment.edit) }] : []),
    patch: (d, id, field, value) => ({ ...d, rows: d.rows.map((r) => (r.record_id !== id || field !== 'treatment_option' || !r.treatment ? r : { ...r, treatment: { ...r.treatment, option: value as Treatment, edit: { kind: 'changed', reason: 'Changed', by: '', at: '', from: r.treatment.option } } })) }),
    extraWarn: p.rows.filter((r) => r.treatment?.option === 'reduce' && !r.treatment.goal).map((r) => ({ id: threatCode(r.record_id), text: 'Set to Reduce but has no cybersecurity goal yet.' })),
    finishLabel: 'Finish TARA', doneLabel: 'TARA finished',
  };
  const c = useReviewCore(cfg);
  const { s, set } = c;
  const iv = (r: TaraRow) => r.impact.value + 1;
  const tv = (r: TaraRow) => r.feasibility.value;

  // The treatment menu opens the change form in the panel: a treatment needs a reason, and some need more.
  const startTreatment = (r: TaraRow, option: Treatment) => {
    c.set({ sel: threadKey(r.record_id, 'treatment_option'), rail: true, closing: false, menu: null, changing: true, pick: option, draft: '', reply: '', goalDraft: r.treatment?.goal?.statement ?? '', actionDraft: r.treatment?.avoidance_action ?? '' });
  };

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
      const lv = tv(r);
      const ri = riskIdx(r.risk.level);
      const t = r.treatment;
      const focus = s.rail && s.sel === threadKey(id, null);
      const dmgFocus = s.rail && rows.some((o) => o.asset_id === r.asset_id && o.damage_id === r.damage_id && s.sel === threadKey(o.record_id, null));
      const dmgBottom = lastDmg[r.asset_id] === r.damage_id ? '; border-bottom: 0' : '; border-bottom: 1px solid #E7E3DB';
      const h = c.cell(id, 'treatment_option', 96);
      const menuOpen = h.menuOpen;
      const goal = t?.goal ?? null;
      const goalText = t?.option === 'reduce' || t?.option === 'share'
        ? (goal ? goal.statement : 'No goal written yet')
        : t?.option === 'avoid' ? (t.avoidance_action ?? 'No action written yet') : t?.option === 'accept' ? 'Not needed, risk accepted' : '';
      const needsGoal = (t?.option === 'reduce' || t?.option === 'share') && !goal;
      lines.push({
        isBand: false, isRow: true, first, span: String(span[r.asset_id]), firstDmg, dspan: String(dspan[r.asset_id + r.damage_id]),
        assetLabel: `${r.asset_ref} ${r.asset_name}`, assetTd: `background: #FFFFFF${top}; border-bottom: 0`, thr: threatCode(id), aid: r.asset_ref, aname: r.asset_name,
        prop: PROPNAME[r.property ?? ''], dmg: damageCode(r.damage_id), dscen: r.damage, tscen: r.threat,
        dmgTd: `background: #FFFFFF${top}${dmgBottom}`,
        rowCorner: c.hasThread(threadKey(id, null)), plainTd: `background: ${bg}${top}`,
        impTd: `--oc: ${OUT[r.impact.value]}; background: ${dmgFocus ? SOLID[r.impact.value][0] : TINT[r.impact.value][0]}${top}`,
        impStyle: `font-size: 12.5px; font-weight: 500; color: ${dmgFocus ? SOLID[r.impact.value][1] : TINT[r.impact.value][1]}`,
        impText: LEVELS[r.impact.value], impTitle: `${LEVELS[r.impact.value]} impact for ${damageCode(r.damage_id)}, from Impact Analysis`,
        afTd: `--oc: ${ROUT[lv - 1]}; background: ${focus ? RISK[lv - 1][0] : TINT5[lv - 1][0]}${top}`,
        afStyle: `font-size: 12.5px; font-weight: 500; color: ${focus ? RISK[lv - 1][1] : TINT5[lv - 1][1]}`,
        afText: FEAS[lv - 1], afTitle: `${r.cvss !== null ? `CVSS ${r.cvss.toFixed(2)}, ` : ''}from Threat Analysis`,
        afDot: c.cellDot(id, 'feasibility'),
        rtTd: `--oc: ${ROUT[ri]}; background: ${RISK[ri][0]}${top}${rowSel ? '; box-shadow: inset 0 0 0 2px #1F6C9F' : ''}`,
        rtChip: `background: transparent; color: ${RISK[ri][1]}`, rtText: String(r.risk.score),
        rtTitle: `${LEVELS[r.impact.value]} impact (${r.impact.value}) times ${FEAS[lv - 1].toLowerCase()} feasibility (${lv}) gives risk score ${r.risk.score}, ${r.risk.level}.`,
        hasGoalId: Boolean(goal), goalId: goal ? goalCode(goal.id) : '',
        goal: goalText,
        goalStyle: `font-size: 13px; line-height: 1.5; ${needsGoal ? 'color: #956400; font-weight: 500' : t?.option === 'accept' ? 'color: #8E8D89' : 'color: #2F2E2B'}`,
        pickRow: c.pickRow(id), dblRow: c.dblRow(id),
        tr: {
          cls: 'kst k2', td: `background: ${bg}${top}`, btn: '--pc: #6F6B63', pcls: h.on ? 'pcell sel' : 'pcell', chip: NEUTRAL, text: optName(t?.option), corner: c.cellDot(id, 'treatment_option'),
          label: `Risk treatment for ${threatCode(id)}: ${optName(t?.option)}`, title: 'Risk treatment. Click to change. Double-click to comment.',
          menu: menuOpen, menuStr: menuOpen ? 'true' : 'false', menuCls: `rmenu${menuOpen && s.menuUp ? ' up' : ''}`,
          opts: OPTIONS.filter((o) => o.value !== 'accept' || acceptable(r) || t?.option === 'accept').map((o) => ({
            label: o.name, pts: o.hint, on: o.value === t?.option ? 'true' : 'false',
            pick: (ev?: MouseEvent) => { ev?.stopPropagation(); startTreatment(r, o.value); },
          })),
          openMenu: t ? h.openMenu : () => undefined, comment: h.comment, pick: h.pick,
        },
      });
    });
  }

  // ── the header strip ────────────────────────────────────────────────────────

  const counts = [0, 0, 0, 0, 0];
  p.rows.forEach((r) => { counts[riskIdx(r.risk.level)] += 1; });
  const total = p.rows.length;
  const order = [4, 3, 2, 1, 0];
  const dist = order.filter((i) => counts[i]).map((i) => ({ style: `flex: ${counts[i]} 1 0; background: ${RISK[i][0]}` }));
  const distLegend = order.map((i) => ({ zero: !counts[i], n: String(counts[i]), label: RISK_NAMES[i], dot: `background: ${RISK[i][0]}` }));
  const distText = order.filter((i) => counts[i]).map((i) => `${counts[i]} ${RISK_NAMES[i].toLowerCase()}`).join(' · ');

  // ── the side panel ──────────────────────────────────────────────────────────

  const sel = (() => {
    const base: Vals = {
      code: '', sub: '', descLabel: 'Threat scenario', descTag: '', hasDesc2: false, desc2Label: '', desc2Tag: '', desc2: '', hasGoal: false, goalLabel: '', goalTag: '', hasGoalTag: false, goalText: '', groupsLabel: 'Risk inputs',
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
    const t = r.treatment;
    Object.assign(base, c.baseSel(k, r));
    base.code = threatCode(r.record_id);
    base.state = optName(t?.option); base.stateCls = 'tag t-ink';
    base.hasDesc = true; base.descLabel = 'Threat scenario'; base.desc = r.threat ?? ''; base.descTag = threatCode(r.record_id);
    base.hasGoal = true;
    if (t?.option === 'reduce' || t?.option === 'share') {
      base.goalLabel = 'Cybersecurity goal'; base.goalTag = t.goal ? goalCode(t.goal.id) : ''; base.hasGoalTag = Boolean(t.goal);
      base.goalText = t.goal ? t.goal.statement : 'No goal written yet. Add one before you finish.';
    } else if (t?.option === 'avoid') {
      base.goalLabel = 'Avoidance action'; base.goalText = t.avoidance_action ?? 'No action written yet.';
    } else {
      base.goalLabel = 'Reason for accepting'; base.goalText = t?.claim?.basis ?? t?.rationale ?? 'A reason is needed before you finish.';
    }
    base.asms = c.asmView(p.assumptions.filter((a) => a.record_id === r.record_id && (row || a.field === field)));
    const lv = tv(r);
    const ri = riskIdx(r.risk.level);
    const flip = t?.option === 'reduce' ? 'A control already in place that closes the attack path.' : 'Evidence that the attack path is easier than assessed, or the impact larger.';
    if (row) {
      base.sub = r.asset_name; base.title = `${r.asset_name} · risk ${r.risk.score}`;
      base.hasDesc2 = true; base.desc2Label = 'Damage scenario'; base.desc2Tag = damageCode(r.damage_id); base.desc2 = r.damage ?? '';
      base.whyLabel = 'Why this risk'; base.isRow = true;
      base.reason = `${LEVELS[r.impact.value]} impact from Impact Analysis and ${FEAS[lv - 1].toLowerCase()} feasibility from Threat Analysis give a risk score of ${r.risk.score} (${r.risk.level}): the impact value ${r.impact.value} times the feasibility value ${lv}. A risk above low cannot be accepted.`;
      const item = (name: string, wk: string, lvText: string, why: string, flipText: string, style: string, dot: boolean) => {
        const open = s.propWhy === wk;
        if (open) { base.whyCls = 'whywrap open'; base.whyHidden = 'false'; base.whyAnim = s.whySwap ? `propwhy ${s.whySwap % 2 ? 'fa' : 'fb'}` : 'propwhy'; }
        if (open || (!s.propWhy && s.whyLast === wk)) { base.whyName = name; base.whyState = lvText; base.whyReason = why; base.whyHasFlip = true; base.whyFlip = flipText; }
        return { name, lv: lvText, openStr: open ? 'true' : 'false', dot, whyLabel: `${open ? 'Hide' : 'Show'} why ${name.toLowerCase()} is ${lvText}`, style, toggleWhy: () => c.toggleWhy(wk) };
      };
      const tint = (n: number) => `background: ${TINT[n][0]}; color: ${TINT[n][1]}; box-shadow: inset 0 0 0 1px ${OUT[n]}`;
      const res = r.residual;
      const resWhy = res
        ? res.changes.length
          ? `With the controls in place the risk score moves from ${res.pre.risk_score} (${res.pre.risk_level}) to ${res.post.risk_score} (${res.post.risk_level}). ${res.changes.map((x) => x.reason).join(' ')}`
          : `The controls do not change how hard the attack is, so the risk stays at ${res.post.risk_score} (${res.post.risk_level}).`
        : 'The residual risk is worked out after the treatment.';
      base.groups = [
        { name: 'From earlier stages', items: [
          item('Impact', `${r.record_id}.impact`, LEVELS[r.impact.value], `${damageCode(r.damage_id)} was rated ${LEVELS[r.impact.value].toLowerCase()} in Impact Analysis, taken from its highest category.`, `A change to the rating of ${damageCode(r.damage_id)} in Impact Analysis would change it.`, tint(r.impact.value), c.cellDot(r.record_id, 'impact')),
          item('Feasibility', `${r.record_id}.feasibility`, FEAS[lv - 1], `CVSS exploitability ${r.cvss !== null ? `is ${r.cvss.toFixed(2)}` : 'comes from the four factors'}, which is ${FEAS[lv - 1].toLowerCase()} feasibility, from Threat Analysis.`, 'A change to one of the CVSS factors in Threat Analysis would change it.', `background: ${TINT5[lv - 1][0]}; color: ${TINT5[lv - 1][1]}; box-shadow: inset 0 0 0 1px ${ROUT[lv - 1]}`, c.cellDot(r.record_id, 'feasibility')),
        ] },
        { name: 'This stage', items: [
          item('Risk score', `${r.record_id}.risk`, String(r.risk.score), `Impact value ${r.impact.value} times feasibility value ${lv} gives ${r.risk.score}, which is ${r.risk.level}.`, 'A different impact rating or attack feasibility would change it.', `background: ${RISK[ri][0]}; color: ${RISK[ri][1]}; box-shadow: inset 0 0 0 1.5px ${ROUT[ri]}, 0 0 0 3px ${ROUT[ri]}2E`, false),
          item('Treatment', `${r.record_id}.treatment_option`, optName(t?.option), treatmentWhy(r), flip, NEUTRAL, c.cellDot(r.record_id, 'treatment_option')),
          item('Residual risk', `${r.record_id}.residual`, res ? String(res.post.risk_score) : '–', resWhy, 'A control that is not in place, or an attack path the controls do not close.', res ? `background: ${RISK[riskIdx(res.post.risk_level)][0]}; color: ${RISK[riskIdx(res.post.risk_level)][1]}; box-shadow: inset 0 0 0 1px ${ROUT[riskIdx(res.post.risk_level)]}` : NEUTRAL, false),
        ] },
      ];
      const left = c.cfg.reviewable(r).filter((x) => !x.reviewed);
      if (left.length) {
        base.rowLeft = true; base.rowLeftHint = 'The treatment has not been reviewed.'; base.rowLeftLabel = 'Confirm';
        base.confirmRow = () => c.edit(r.record_id, 'treatment_option', { confirm: true });
      }
    } else {
      base.sub = fieldName(field); base.title = fieldName(field);
      base.whyLabel = field === 'treatment_option' ? 'Why this treatment' : 'Why';
      if (field === 'treatment_option') {
        base.reason = treatmentWhy(r); base.hasFlip = true; base.flip = flip;
        base.isProp = true; base.proposedWord = optName(t?.option);
        base.canReview = !t?.edit && !s.changing && Boolean(t);
        base.confirm = () => c.edit(r.record_id, field, { confirm: true });
        base.startChange = () => set({ changing: true, pick: t?.option ?? null, goalDraft: t?.goal?.statement ?? '', actionDraft: t?.avoidance_action ?? '' });
        base.changing = s.changing;
        const option = s.pick as Treatment | null;
        const goalText = s.goalDraft.trim() || t?.goal?.statement || '';
        const valid = Boolean(option) && !(option === 'accept' && !acceptable(r))
          && !(option === 'reduce' && !goalText) && !(option === 'avoid' && !s.actionDraft.trim())
          && (option !== t?.option || (option === 'reduce' && goalText !== (t?.goal?.statement ?? '')) || (option === 'avoid' && s.actionDraft.trim() !== (t?.avoidance_action ?? '')));
        base.canSave = valid;
        base.saveChange = async () => {
          const body = { value: option as string, reason: s.draft.trim(), ...(option === 'reduce' || option === 'share' ? { goal_statement: s.goalDraft.trim() } : {}), ...(option === 'avoid' ? { avoidance_action: s.actionDraft.trim() } : {}) };
          if (await c.edit(r.record_id, field, body, option as string)) set({ changing: false, draft: '', pick: null, goalDraft: '', actionDraft: '' });
        };
        base.changeExtra = (
          <>
            <span role="group" aria-label="New treatment" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, padding: 3, borderRadius: 10, background: '#F1F0EC', alignSelf: 'flex-start' }}>
              {OPTIONS.map((o) => {
                const blocked = o.value === 'accept' && !acceptable(r);
                return (
                  <button key={o.value} type="button" className="seg" disabled={blocked} title={blocked ? `Only informational and low risks can be accepted. This one is ${r.risk.level}.` : o.hint} aria-pressed={s.pick === o.value} onClick={() => set({ pick: o.value })} style={s.pick === o.value ? { background: '#FFFFFF', color: '#1C1B19', fontWeight: 500, boxShadow: '0 1px 2px rgba(28,27,25,.1)', opacity: 1 } : blocked ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>{o.name}</button>
                );
              })}
            </span>
            {option === 'reduce' && (
              <>
                <label htmlFor="goal" style={{ fontSize: 13, fontWeight: 500 }}>The goal this treatment reaches</label>
                <textarea id="goal" className="fld" rows={2} value={s.goalDraft} onChange={(e) => set({ goalDraft: e.target.value })} style={{ padding: '8px 10px', resize: 'vertical', background: '#FFFFFF' }} />
              </>
            )}
            {option === 'avoid' && (
              <>
                <label htmlFor="action" style={{ fontSize: 13, fontWeight: 500 }}>What is done to avoid the risk</label>
                <textarea id="action" className="fld" rows={2} value={s.actionDraft} onChange={(e) => set({ actionDraft: e.target.value })} style={{ padding: '8px 10px', resize: 'vertical', background: '#FFFFFF' }} />
              </>
            )}
          </>
        );
      } else if (field === 'cybersecurity_goal') {
        base.reason = t?.goal ? `${t.goal.statement} It is written for the controls chosen for this risk.` : 'No goal has been written for this risk yet.';
      } else if (field === 'impact') {
        base.state = LEVELS[r.impact.value]; base.reason = `${damageCode(r.damage_id)} was rated ${LEVELS[r.impact.value].toLowerCase()} in Impact Analysis, taken from its highest category.`;
      } else if (field === 'feasibility') {
        base.state = FEAS[lv - 1]; base.reason = `From the CVSS factors in Threat Analysis${r.cvss !== null ? `: ${r.cvss.toFixed(2)}` : ''}.`;
      } else if (field === 'risk') {
        base.state = String(r.risk.score); base.reason = `Impact value ${r.impact.value} times feasibility value ${lv} gives ${r.risk.score}, which is ${r.risk.level}.`;
      }
    }
    return base;
  })();

  const levelRows = (p.data?.scales.risk_levels ?? []).map((l) => ({ ...l, name: RISK_NAMES[riskIdx(l.level)], i: riskIdx(l.level) }));
  const v: Vals = {
    ...c.common,
    headTitle: 'Risks', searchLabel: 'Search risks', showPoints: false, pointsLabel: '', noun: 'risks',
    dist, distLegend, totalText: `${total} risks`, distTitle: `Risk level of all ${total} risks: ${distText}`,
    legendNode: (
      <div className="legendpop" role="dialog" aria-label="What the marks mean">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Risk score = impact value × feasibility value</span>
          <span style={{ color: '#6B6A66' }}>Impact: {LEVELS.map((l, i) => `${l} ${i}`).join(', ')}. Feasibility: {FEAS.map((l, i) => `${l} ${i + 1}`).join(', ')}.</span>
          {levelRows.map((l) => (
            <span key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="rchip" style={{ background: RISK[l.i][0], color: RISK[l.i][1], cursor: 'default' }}>{l.name}</span>
              <span style={{ color: '#6B6A66' }}>{l.from === l.to ? `score ${l.from}` : `score ${l.from} to ${l.to}`}</span>
            </span>
          ))}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="ndot" style={{ position: 'static', boxShadow: 'none' }} />Has an assumption or comments</span>
        <span style={{ color: '#6B6A66', paddingTop: 6, borderTop: '1px solid #F1F0EC' }}>The score is the engine&rsquo;s. Click a treatment to change it. Only informational and low risks can be accepted. Double-click a cell to comment.</span>
      </div>
    ),
    warnText: 'Confirm or dispute them, and write the goals that are missing, before you finish the TARA. The scores they affect may still change.',
    lines,
    dcolOffStr: s.dcolOff ? 'true' : 'false', dcolLabel: s.dcolOff ? 'Show damage scenarios' : 'Show only damage IDs',
    tcolOffStr: s.tcolOff ? 'true' : 'false', tcolLabel: s.tcolOff ? 'Show threat scenarios' : 'Show only threat IDs',
    toggleAssetCol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'assetColOff', !s.assetColOff, () => set({ assetColOff: !s.assetColOff })); },
    toggleDcol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'dcolOff', !s.dcolOff, () => set({ dcolOff: !s.dcolOff })); },
    toggleTcol: (ev?: MouseEvent) => { ev?.stopPropagation(); animCols(c.rootRef.current, 'tcolOff', !s.tcolOff, () => set({ tcolOff: !s.tcolOff })); },
    panelName: '06 TARA', asmHint: 'Confirm or dispute the assumptions below. Select a risk, or double-click a treatment, to see the reasoning and comment.',
    sel, crumb: c.selId ? c.rowById.get(c.selId)?.asset_name ?? '' : '',
    draftShort: s.draft.trim().length < 10 || !(sel as Vals).canSave,
  };
  return { c, v };
}
