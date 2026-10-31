/**
 * Ported from the markup of Tara.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from '../review/types';

export function TaraTable({ v }: { v: Vals }) {
  const { assetColLabel, assetColOffStr, dcolLabel, dcolOffStr, lines, noRows, tableCls, tcolLabel, tcolOffStr, toggleAssetCol, toggleDcol, toggleTcol } = v;
  return (
    <>
      <div className="tscroll" style={st("flex: 1 1 auto; min-height: 0; overflow: auto")}>
        <table className={tableCls} style={st("min-width: 0")}>
          <thead>
            <tr className="sizer" aria-hidden="true">
              <th style={st("width: 72px")} />
              <th className="acol" style={st("width: 120px")} />
              <th style={st("width: 100px")} />
              <th className="dsz" />
              <th style={st("width: 92px")} />
              <th className="tsz" />
              <th style={st("width: 100px")} />
              <th style={st("width: 76px")} />
              <th style={st("width: 104px")} />
              <th className="gsz" />
            </tr>
            <tr>
              <th style={st("text-align: center; padding-left: 4px; padding-right: 4px")}>
                <span style={st("display: inline-flex; align-items: center; gap: 3px; white-space: nowrap")}>
                  Asset ID
                  <button type="button" className="acoltog" onClick={toggleAssetCol} aria-pressed={assetColOffStr} aria-label={assetColLabel} title={assetColLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 6-6 6 6 6" />
                    </svg>
                  </button>
                </span>
              </th>
              <th className="acol" style={st("text-align: center; padding-left: 6px; padding-right: 6px")}>Asset</th>
              <th style={st("text-align: center")}>Property</th>
              <th className="dh" style={st("text-align: center; padding-left: 6px; padding-right: 6px")}>
                <span className="colh">
                  <span className="hlong">Damage scenario</span>
                  <span className="hshort">Damage</span>
                  <button type="button" className="acoltog" onClick={toggleDcol} aria-pressed={dcolOffStr} aria-label={dcolLabel} title={dcolLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 6-6 6 6 6" />
                    </svg>
                  </button>
                </span>
              </th>
              <th className="pc k0" style={st("text-align: center; --pc: #6F6B63")}>Impact rating</th>
              <th className="scen th2" style={st("text-align: center; padding-left: 6px; padding-right: 6px")}>
                <span className="colh">
                  <span className="hlong">Threat scenario</span>
                  <span className="hshort">Threat</span>
                  <button type="button" className="acoltog" onClick={toggleTcol} aria-pressed={tcolOffStr} aria-label={tcolLabel} title={tcolLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 6-6 6 6 6" />
                    </svg>
                  </button>
                </span>
              </th>
              <th className="pc k1" style={st("text-align: center; --pc: #6F6B63")}>Attack feasibility</th>
              <th className="pc" style={st("text-align: center")}>Risk score</th>
              <th className="pc k2" style={st("text-align: center; --pc: #6F6B63")}>Risk treatment</th>
              <th className="hover" style={st("text-align: center")}>Cybersecurity goal</th>
            </tr>
          </thead>
          <tbody>
            {(lines as Vals[]).map((r: Vals, __i: number) => (
              <Fragment key={__i}>
                {r.isBand && (
                  <>
                  <tr className="band">
                    <td colSpan={10}>
                      <button type="button" className="bandbtn" aria-expanded={r.expanded} onClick={r.toggle}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                        <span className="fcode">{r.code}</span>
                        {r.name}
                        <span className="fcount">{r.countLabel}</span>
                      </button>
                    </td>
                  </tr>
                  </>
                )}
                {r.isRow && (
                  <>
                  <tr className="row">
                    {r.first && (
                      <>
                      <td rowSpan={Number(r.span)} style={st(r.assetTd)}>
                        <button type="button" className="cell mono" onClick={r.pickRow} onDoubleClick={r.dblRow} aria-label={r.assetLabel} title={r.assetLabel} style={st("font-size: 12px; color: #6B6A66; white-space: nowrap; text-align: center; padding: 8px 4px")}>{r.aid}</button>
                      </td>
                      <td className="acol" rowSpan={Number(r.span)} style={st(`${r.assetTd}; box-shadow: inset -1px 0 0 #E6E2D9`)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("font-size: 13px; font-weight: 500; line-height: 1.35; text-align: center; color: #1C1B19")}>{r.aname}</button>
                      </td>
                      </>
                    )}
                    {r.firstDmg && (
                      <>
                      <td rowSpan={Number(r.dspan)} style={st(r.dmgTd)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("font-size: 12.5px; color: #4A4946; text-align: center; padding: 8px 6px; overflow-wrap: anywhere")}>{r.prop}</button>
                      </td>
                      <td className="dcell" rowSpan={Number(r.dspan)} style={st(r.dmgTd)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} title={r.dscen} style={st("display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px")}>
                          <span className="mono idtag">{r.dmg}</span>
                          <span className="sctext" style={st("font-size: 13px; color: #2F2E2B; line-height: 1.5")}>
                            <span className="dscx">{r.dscen}</span>
                          </span>
                        </button>
                      </td>
                      <td className="mx k0" rowSpan={Number(r.dspan)} style={st(r.impTd)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st(r.impStyle)} title={r.impTitle}>{r.impText}</button>
                      </td>
                      </>
                    )}
                    <td className="scencell tcell" style={st(r.plainTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} title={r.tscen} style={st("display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px")}>
                        <span style={st("display: inline-flex; align-items: center; gap: 6px")}>
                          <span className="mono idtag">{r.thr}</span>
                          {r.rowCorner && (
                            <>
                            <span className="ndot" aria-hidden="true" style={st("position: static; box-shadow: none")} />
                            </>
                          )}
                        </span>
                        <span className="sctext" style={st("font-size: 13px; color: #2F2E2B; line-height: 1.5")}>
                          <span className="scentx">{r.tscen}</span>
                        </span>
                      </button>
                    </td>
                    <td className="mx k1" style={st(r.afTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st(r.afStyle)} title={r.afTitle}>
                        {r.afText}
                        {r.afDot && (
                          <>
                          <span className="pdot" aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </td>
                    <td className="rt" style={st(r.rtTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("text-align: center; padding: 8px 6px")} title={r.rtTitle}>
                        <span className="rchip big" style={st(r.rtChip)}>{r.rtText}</span>
                      </button>
                    </td>
                    <td className={r.tr.cls} style={st(r.tr.td)}>
                      <div className={r.tr.pcls} onClick={r.tr.pick} onDoubleClick={r.tr.comment} title="Double-click to comment" style={st(r.tr.btn)}>
                        <button type="button" className="rchip" style={st(r.tr.chip)} onClick={r.tr.openMenu} aria-haspopup="menu" aria-expanded={r.tr.menuStr} aria-label={r.tr.label} title={r.tr.title}>
                          <span>{r.tr.text}</span>
                        </button>
                        {r.tr.corner && (
                          <>
                          <span className="pdot" aria-hidden="true" />
                          </>
                        )}
                        {r.tr.menu && (
                          <>
                          <div className={r.tr.menuCls} role="menu" aria-label={r.tr.label}>
                            {(r.tr.opts as Vals[]).map((o: Vals, __i: number) => (
                              <Fragment key={__i}>
                                <button type="button" role="menuitemradio" className="ropt sopt" aria-checked={o.on} onClick={o.pick}>
                                  {o.label}
                                  <span className="sopth">{o.pts}</span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={st(r.plainTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 14px 11px")}>
                        {r.hasGoalId && (
                          <>
                          <span className="mono idtag">{r.goalId}</span>
                          </>
                        )}
                        <span style={st(r.goalStyle)}>{r.goal}</span>
                      </button>
                    </td>
                  </tr>
                  </>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {noRows && (
          <>
          <p style={st("margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66")}>No risks match. Clear the search or show all.</p>
          </>
        )}
      </div>
    </>
  );
}
