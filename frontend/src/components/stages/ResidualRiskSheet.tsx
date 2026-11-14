/**
 * The Residual Risk sheet on 07 (D-73), from the analyst's template. It has the columns of the 06 TARA sheet (without the property)
 * and adds the feasibility calculated again with the controls in place: the four CVSS metrics after the controls, the CVSS number
 * and attack feasibility of the attack before them, then the CVSS number and attack feasibility after them, the risk score and the
 * residual risk. Read only: every value is the pipeline's (folders 06 to 10).
 */

import { Fragment, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DemoNote } from '@/components/layout/DemoNote';
import { assetCode, damageCode, threatCode } from '@/lib/displayIds';
import { AI_OFF_NOTE, useAiOff } from '@/lib/preview';
import { stagesApi } from '@/lib/stagesApi';
import type { ResidualRow, RiskLevel } from '@/types/stages';
import { st } from './assets/constants';
import { NEUTRAL, RISK, TINT, TINT5 } from './review/palette';
import { LEVELS, RISK_LEVELS, RISK_NAMES } from './tara/useTara';
import { FEAS } from './threats/useThreats';
import '@/styles/tara-stage.css';

const METRICS = [
  { key: 'attack_vector', label: 'Attack vector', values: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' } },
  { key: 'attack_complexity', label: 'Attack complexity', values: { L: 'Low', H: 'High' } },
  { key: 'privileges_required', label: 'Privileges required', values: { N: 'None', L: 'Low', H: 'High' } },
  { key: 'user_interaction', label: 'User interaction', values: { N: 'None', R: 'Required' } },
] as const;

const riskIdx = (l: RiskLevel) => RISK_LEVELS.indexOf(l);
const SIZES = [10, 20, 50];
// The header is sticky as a whole (thead), so the two header rows stay together; its cells are not sticky one by one.
const th = 'position: static; text-align: center; padding-left: 6px; padding-right: 6px';

export function ResidualRiskSheet() {
  const { assessmentId = '' } = useParams();
  const aiOff = useAiOff();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['residual', assessmentId], queryFn: () => stagesApi.residual(assessmentId), enabled: Boolean(assessmentId), staleTime: 0, refetchOnMount: 'always' });
  const [q, setQ] = useState('');
  const [size, setSize] = useState(20);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [rebuilding, setRebuilding] = useState(false);
  const data = query.data;

  const needle = q.trim().toLowerCase();
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => !needle || `${assetCode(r.asset_ref)} ${r.asset_name} ${threatCode(r.record_id)} ${damageCode(r.damage_id)} ${r.damage ?? ''} ${r.threat ?? ''}`.toLowerCase().includes(needle)), [data, needle]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * size, at * size + size);
  const counts = [0, 0, 0, 0, 0];
  (data?.rows ?? []).forEach((r) => { counts[riskIdx(r.post.risk.level)] += 1; });
  const order = [4, 3, 2, 1, 0];

  const rebuild = async () => {
    setRebuilding(true);
    try { await stagesApi.uiRebuild(assessmentId, '06'); await queryClient.invalidateQueries({ queryKey: ['residual', assessmentId] }); } catch (err) { toast.error(err instanceof Error ? err.message : 'The rebuild did not start.'); } finally { setRebuilding(false); }
  };
  const failed = data?.folders.find((f) => f.status === 'failed');
  const banner = (tone: 'blue' | 'yellow' | 'red', text: string, action?: React.ReactNode) => (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`t-${tone}`} style={st('flex: none; margin-bottom: 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 10px 16px; border-radius: 12px; font-size: 13.5px; font-weight: 500')}>
      <span>{text}</span>
      {action}
    </div>
  );
  const rebuildButton = (
    <span style={st('display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 10px')}>
      {aiOff && <span style={st('font-size: 12.5px; font-weight: 400')}>{AI_OFF_NOTE}.</span>}
      <button type="button" className="btn btn-line btn-sm" disabled={aiOff || rebuilding || data?.building} title={aiOff ? AI_OFF_NOTE : undefined} onClick={rebuild}>Rebuild</button>
    </span>
  );

  const cell = (r: ResidualRow, key: string) => r.changes.find((c) => c.metric === key);
  const feas = (v: number) => (v >= 1 ? FEAS[v - 1] : '–');
  const feasTd = (v: number) => (v >= 1 ? `background: ${TINT5[v - 1][0]}; color: ${TINT5[v - 1][1]}` : '');

  return (
    <div className="tara-stage" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 236px)', minHeight: 460, padding: '14px clamp(0px, 1vw, 12px) 6px' }}>
      {data?.building && banner('blue', 'Scoring the risks and choosing their treatment. This usually takes a few minutes.')}
      {!data?.building && failed && banner('red', failed.error || `Building folder ${String(failed.stage_num).padStart(2, '0')} stopped. Try again.`, rebuildButton)}
      {!data?.building && !failed && data?.stale.is && banner('yellow', 'This is out of date: a change you made means the residual risk was not calculated again.', rebuildButton)}

      {query.isLoading ? (
        <p style={st('margin: 0; padding: 20px 4px; color: #6B6A66')}>Loading...</p>
      ) : query.error ? (
        <p role="alert" style={st('margin: 0; padding: 20px 4px; color: #9F2F2D')}>{(query.error as Error).message}</p>
      ) : !data?.has_data ? (
        <div className="panel" style={st('padding: 22px 24px')}><p style={st('margin: 0')}>The residual risk is calculated after the risks are treated. Execute on 01 Documents builds it.</p></div>
      ) : (
        <section className="panel" aria-label="Residual risk" style={st('flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column')}>
          <div className="phead">
            <span className="hsum">
              <span className="htitle">Residual risk</span>
              <span className="hidesm dsum" title="Residual risk after the controls, by level">
                <span className="dsrow">
                  <span className="dist" aria-hidden="true">{order.filter((i) => counts[i]).map((i) => <span key={i} style={st(`flex: ${counts[i]} 1 0; background: ${RISK[i][0]}`)} />)}</span>
                  <span className="dtotal">{data.rows.length} risks</span>
                </span>
                <span className="dleg">
                  {order.map((i) => (
                    <span key={i} className={counts[i] ? 'dli' : 'dli zero'}><span className="ddot" aria-hidden="true" style={st(`background: ${RISK[i][0]}`)} /><span className="dn">{counts[i]}</span>{RISK_NAMES[i]}</span>
                  ))}
                </span>
              </span>
            </span>
            <label style={st('display: inline-flex; align-items: center; position: relative')}>
              <span style={st('position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)')}>Search risks</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" style={st('position: absolute; left: 10px; pointer-events: none')}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input className="fld" type="search" placeholder="Search risks" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} style={st('height: 36px; width: 200px; padding: 0 10px 0 32px')} />
            </label>
          </div>

          <div className="tscroll" style={st('flex: 1 1 auto; min-height: 0; overflow: auto')}>
            <table className="assets" style={st('min-width: 1308px; table-layout: fixed')}>
              <colgroup>
                <col style={{ width: 60 }} /><col style={{ width: 102 }} /><col style={{ width: 142 }} /><col style={{ width: 76 }} /><col style={{ width: 170 }} />
                {METRICS.map((m) => <col key={m.key} style={{ width: 74 }} />)}
                <col style={{ width: 74 }} /><col style={{ width: 82 }} /><col style={{ width: 84 }} /><col style={{ width: 84 }} /><col style={{ width: 58 }} /><col style={{ width: 84 }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
                <tr style={{ height: 36 }}>
                  <th rowSpan={2} style={st(th)}>Asset ID</th>
                  <th rowSpan={2} style={st(th)}>Asset</th>
                  <th rowSpan={2} style={st(th)}>Damage scenario</th>
                  <th rowSpan={2} className="pc k0" style={st(`${th}; --pc: #6F6B63`)}>Impact rating</th>
                  <th rowSpan={2} style={st(th)}>Threat scenario</th>
                  <th colSpan={6} style={st(`${th}; border-left: 1px solid #CFCAC0; height: 36px; padding-top: 0; padding-bottom: 0; box-sizing: border-box`)}>Post feasibility rating</th>
                  <th rowSpan={2} style={st(`${th}; border-left: 1px solid #CFCAC0`)}>Post CVSS exploitability value</th>
                  <th rowSpan={2} style={st(th)}>Post attack feasibility rating</th>
                  <th rowSpan={2} style={st(th)}>Risk score</th>
                  <th rowSpan={2} style={st(th)}>Residual risk</th>
                </tr>
                <tr>
                  {METRICS.map((m, i) => <th key={m.key} style={st(`${th}; height: 58px; padding-top: 6px; padding-bottom: 6px; box-sizing: border-box; font-size: 12px; ${i === 0 ? 'border-left: 1px solid #CFCAC0' : ''}`)}>{m.label}</th>)}
                  <th style={st(`${th}; height: 58px; padding-top: 6px; padding-bottom: 6px; box-sizing: border-box; font-size: 12px`)} title="The exploitability number of the attack before the controls">CVSS of the attack</th>
                  <th style={st(`${th}; height: 58px; padding-top: 6px; padding-bottom: 6px; box-sizing: border-box; font-size: 12px`)} title="The attack feasibility before the controls">Attack feasibility rating</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const i = riskIdx(r.post.risk.level);
                  const expanded = Boolean(open[r.record_id]);
                  const clamp = expanded ? '' : '; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden';
                  const text = (t: string | null, id: string) => (
                    <button type="button" className="cell" onClick={() => setOpen((o) => ({ ...o, [r.record_id]: !o[r.record_id] }))} title={expanded ? 'Show less' : 'Show all'} style={st('display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 14px 11px')}>
                      <span className="mono idtag">{id}</span>
                      <span style={st(`font-size: 13px; line-height: 1.5; color: #2F2E2B${clamp}`)}>{t}</span>
                    </button>
                  );
                  return (
                    <Fragment key={r.record_id}>
                      <tr className="row">
                        <td style={st('text-align: center; font-size: 12px; color: #6B6A66')} className="mono">{assetCode(r.asset_ref)}</td>
                        <td style={st('padding: 8px 10px; text-align: left')}>
                          <span style={st('display: block; font-size: 13px; font-weight: 500; line-height: 1.35; color: #1C1B19')}>{r.asset_name}</span>
                          {r.asset_type && <span style={st('display: block; margin-top: 2px; font-size: 12px; color: #6B6A66')}>{r.asset_type}</span>}
                        </td>
                        <td>{text(r.damage, damageCode(r.damage_id))}</td>
                        <td style={st(`text-align: center; background: ${TINT[r.impact.value][0]}; color: ${TINT[r.impact.value][1]}; font-size: 12.5px; font-weight: 500`)}>{LEVELS[r.impact.value]}</td>
                        <td>{text(r.threat, threatCode(r.record_id))}</td>
                        {METRICS.map((m, k) => {
                          const change = cell(r, m.key);
                          const value = (m.values as Record<string, string>)[r.post.metrics[m.key]] ?? r.post.metrics[m.key];
                          return (
                            <td key={m.key} style={st(`text-align: center; font-size: 13px; ${k === 0 ? 'box-shadow: inset 1px 0 0 #E1DDD3' : ''}`)}
                              title={change ? `Was ${(m.values as Record<string, string>)[change.from]} before the controls. ${change.reason ?? ''}` : 'Not changed by the controls'}>
                              {change ? <span className="tag t-ink">{value}</span> : <span style={st('color: #2F2E2B')}>{value}</span>}
                            </td>
                          );
                        })}
                        <td style={st('text-align: center; font-size: 13px; color: #4A4946')}>{r.pre.cvss.toFixed(2)}</td>
                        <td style={st(`text-align: center; font-size: 12.5px; font-weight: 500; ${feasTd(r.pre.feasibility.value)}`)}>{feas(r.pre.feasibility.value)}</td>
                        <td style={st(`text-align: center; font-size: 13px; font-weight: 600; box-shadow: inset 1px 0 0 #E1DDD3; ${r.changes.length ? '' : 'color: #4A4946'}`)}>{r.post.cvss.toFixed(2)}</td>
                        <td style={st(`text-align: center; font-size: 12.5px; font-weight: 500; ${feasTd(r.post.feasibility.value)}`)}>{feas(r.post.feasibility.value)}</td>
                        <td style={st(`text-align: center; font-size: 13px; font-weight: 600; background: ${RISK[i][0]}; color: ${RISK[i][1]}`)} title={`Impact ${r.impact.value} times attack feasibility ${r.post.feasibility.value} gives ${r.post.risk.score}.`}>{r.post.risk.score}</td>
                        <td style={st('text-align: center')}><span className="rchip" style={st(`${NEUTRAL}; min-width: 0; padding: 0 8px`)}>{RISK_NAMES[i]}</span></td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p style={st('margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66')}>No risks match. Clear the search.</p>}
          </div>

          <div style={st('flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; padding: 12px 24px; border-top: 1px solid #E6E4DE; background: #FAF9F7; font-size: 12.5px; color: #4A4946')}>
            <span style={st('color: #6B6A66')}><span className="mono" style={st('color: #1C1B19')}>{rows.length ? `${at * size + 1}-${Math.min(rows.length, at * size + size)}` : '0'}</span> of <span className="mono">{rows.length}</span> risks</span>
            <DemoNote />
            <span style={st('display: inline-flex; align-items: center; gap: 14px')}>
              <label style={st('display: inline-flex; align-items: center; gap: 8px; color: #6B6A66')}>
                Page size
                <select className="fld" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} style={st('height: 32px; padding: 0 8px; font-size: 13px')}>{SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              <span style={st('display: inline-flex; align-items: center; gap: 6px')}>
                <button type="button" className="btn btn-line btn-sm" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous</button>
                <span className="mono" style={st('min-width: 48px; text-align: center; color: #3A3936')}>{at + 1} / {pages}</span>
                <button type="button" className="btn btn-line btn-sm" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Next</button>
              </span>
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
