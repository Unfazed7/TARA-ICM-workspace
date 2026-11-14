/**
 * The table of 07 Residual risk, from the analyst's template. The columns of 06 TARA up to the threat (without the property), then
 * the feasibility worked out again with the controls: the four CVSS metrics after the controls, the CVSS number and attack
 * feasibility before them, the CVSS number and attack feasibility after them, the risk score and the residual risk.
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from '../review/types';
import { METRICS } from './useResidual';

const arrow = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 6-6 6 6 6" />
  </svg>
);
// The header is sticky as a whole (thead), so its two rows stay together; its cells are not sticky one by one.
const H = 'position: static; text-align: center; padding-left: 6px; padding-right: 6px';
const SUB = `${H}; height: 58px; padding-top: 6px; padding-bottom: 6px; box-sizing: border-box; font-size: 12px`;

export function ResidualTable({ v }: { v: Vals }) {
  const { assetColLabel, assetColOffStr, dcolLabel, dcolOffStr, lines, noRows, tableCls, tableMin, tcolLabel, tcolOffStr, toggleAssetCol, toggleDcol, toggleTcol } = v;
  return (
    <>
      <div className="tscroll" style={st('flex: 1 1 auto; min-height: 0; overflow: auto')}>
        <table className={tableCls} style={st(`min-width: ${tableMin}px`)}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
            <tr className="sizer" aria-hidden="true">
              <th style={st('width: 72px; position: static')} />
              <th className="acol" style={st('width: 120px; position: static')} />
              <th className="dsz" style={{ position: 'static' }} />
              <th style={st('width: 92px; position: static')} />
              <th className="tsz" style={{ position: 'static' }} />
              {METRICS.map((m) => <th key={m.key} style={st('width: 84px; position: static')} />)}
              <th style={st('width: 80px; position: static')} /><th style={st('width: 92px; position: static')} /><th style={st('width: 100px; position: static')} />
              <th style={st('width: 96px; position: static')} /><th style={st('width: 78px; position: static')} /><th style={st('width: 96px; position: static')} />
            </tr>
            <tr style={{ height: 36 }}>
              <th rowSpan={2} style={st(`${H}; padding-left: 4px; padding-right: 4px`)}>
                <span style={st('display: inline-flex; align-items: center; gap: 3px; white-space: nowrap')}>
                  Asset ID
                  <button type="button" className="acoltog" onClick={toggleAssetCol} aria-pressed={assetColOffStr} aria-label={assetColLabel} title={assetColLabel}>{arrow}</button>
                </span>
              </th>
              <th rowSpan={2} className="acol" style={st(H)}>Asset</th>
              <th rowSpan={2} className="dh" style={st(H)}>
                <span className="colh">
                  <span className="hlong">Damage scenario</span><span className="hshort">Damage</span>
                  <button type="button" className="acoltog" onClick={toggleDcol} aria-pressed={dcolOffStr} aria-label={dcolLabel} title={dcolLabel}>{arrow}</button>
                </span>
              </th>
              <th rowSpan={2} className="pc k0" style={st(`${H}; --pc: #6F6B63`)}>Impact rating</th>
              <th rowSpan={2} className="scen th2" style={st(H)}>
                <span className="colh">
                  <span className="hlong">Threat scenario</span><span className="hshort">Threat</span>
                  <button type="button" className="acoltog" onClick={toggleTcol} aria-pressed={tcolOffStr} aria-label={tcolLabel} title={tcolLabel}>{arrow}</button>
                </span>
              </th>
              <th colSpan={6} style={st(`${H}; border-left: 1px solid #CFCAC0; height: 36px; padding-top: 0; padding-bottom: 0; box-sizing: border-box`)}>Post feasibility rating</th>
              <th rowSpan={2} style={st(`${H}; border-left: 1px solid #CFCAC0`)}>Post CVSS exploitability value</th>
              <th rowSpan={2} style={st(H)}>Post attack feasibility rating</th>
              <th rowSpan={2} style={st(H)}>Risk score</th>
              <th rowSpan={2} style={st(H)}>Residual risk</th>
            </tr>
            <tr>
              {METRICS.map((m, i) => <th key={m.key} style={st(`${SUB}; ${i === 0 ? 'border-left: 1px solid #CFCAC0' : ''}`)}>{m.label}</th>)}
              <th style={st(SUB)} title="The exploitability number of the attack before the controls">CVSS of the attack</th>
              <th style={st(SUB)} title="The attack feasibility before the controls">Attack feasibility rating</th>
            </tr>
          </thead>
          <tbody>
            {(lines as Vals[]).map((r: Vals, __i: number) => (
              <Fragment key={__i}>
                {r.isBand && (
                  <tr className="band">
                    <td colSpan={15}>
                      <button type="button" className="bandbtn" aria-expanded={r.expanded} onClick={r.toggle}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                        <span className="fcode">{r.code}</span>
                        {r.name}
                        <span className="fcount">{r.countLabel}</span>
                      </button>
                    </td>
                  </tr>
                )}
                {r.isRow && (
                  <tr className="row">
                    {r.first && (
                      <>
                        <td rowSpan={Number(r.span)} style={st(r.assetTd)}>
                          <button type="button" className="cell mono" onClick={r.pickRow} onDoubleClick={r.dblRow} aria-label={r.assetLabel} title={r.assetLabel} style={st('font-size: 12px; color: #6B6A66; white-space: nowrap; text-align: center; padding: 8px 4px')}>{r.aid}</button>
                        </td>
                        <td className="acol" rowSpan={Number(r.span)} style={st(`${r.assetTd}; box-shadow: inset -1px 0 0 #E6E2D9`)}>
                          <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st('font-size: 13px; line-height: 1.35; text-align: left; color: #1C1B19')}>
                            <span style={st('display: block; font-weight: 500; color: #1C1B19')}>{r.aname}</span>
                            {r.atype && <span style={st('display: block; margin-top: 2px; font-size: 12px; font-weight: 400; color: #6B6A66')}>{r.atype}</span>}
                          </button>
                        </td>
                      </>
                    )}
                    {r.firstDmg && (
                      <>
                        <td className="dcell" rowSpan={Number(r.dspan)} style={st(r.dmgTd)}>
                          <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} title={r.dscen} style={st('display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px')}>
                            <span className="mono idtag">{r.dmg}</span>
                            <span className="sctext" style={st('font-size: 13px; color: #2F2E2B; line-height: 1.5')}><span className="dscx">{r.dscen}</span></span>
                          </button>
                        </td>
                        <td className="mx k0" rowSpan={Number(r.dspan)} style={st(r.impTd)}>
                          <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st(r.impStyle)} title={r.impTitle}>{r.impText}</button>
                        </td>
                      </>
                    )}
                    <td className="scencell tcell" style={st(r.plainTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} title={r.tscen} style={st('display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px')}>
                        <span style={st('display: inline-flex; align-items: center; gap: 6px')}>
                          <span className="mono idtag">{r.thr}</span>
                          {r.rowCorner && <span className="ndot" aria-hidden="true" style={st('position: static; box-shadow: none')} />}
                        </span>
                        <span className="sctext" style={st('font-size: 13px; color: #2F2E2B; line-height: 1.5')}><span className="scentx">{r.tscen}</span></span>
                      </button>
                    </td>
                    {(r.metrics as Vals[]).map((m: Vals, k: number) => (
                      <td key={m.key} className="kst" style={st(`${m.td}${k === 0 ? '; box-shadow: inset 1px 0 0 #E1DDD3' : ''}`)}>
                        <div className={m.cls} onClick={m.pick} onDoubleClick={m.comment} title={m.title} style={st('--pc: #6F6B63; text-align: center; padding: 8px 4px; cursor: pointer')}>
                          {m.changed ? <span className="tag t-ink">{m.text}</span> : <span style={st('font-size: 13px; color: #2F2E2B')}>{m.text}</span>}
                          {m.dot && <span className="pdot" aria-hidden="true" />}
                        </div>
                      </td>
                    ))}
                    <td style={st(`${r.plainTd}; text-align: center; font-size: 13px; color: #4A4946`)}>{r.preCvss}</td>
                    <td style={st(`${r.preAfrTd}; text-align: center; font-size: 12.5px; font-weight: 500`)}>{r.preAfrText}</td>
                    <td style={st(`${r.plainTd}; text-align: center; font-size: 13px; box-shadow: inset 1px 0 0 #E1DDD3; ${r.postCvssStyle}`)}>{r.postCvss}</td>
                    <td style={st(`${r.postAfrTd}; text-align: center; font-size: 12.5px; font-weight: 500`)}>{r.postAfrText}</td>
                    <td className="rt" style={st(r.scoreTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} title={r.scoreTitle} style={st(`${r.scoreStyle}; text-align: center; padding: 8px 6px`)}>{r.scoreText}</button>
                    </td>
                    <td style={st(r.resTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st('text-align: center; padding: 8px 6px')}>
                        <span className="rchip" style={st(`${r.resChip}; min-width: 0; padding: 0 8px`)}>{r.resText}</span>
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {noRows && <p style={st('margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66')}>No risks match. Clear the search or show all.</p>}
      </div>
    </>
  );
}
