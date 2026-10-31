/**
 * Ported from the markup of Impact.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from '../review/types';

export function ImpactsTable({ v }: { v: Vals }) {
  const { assetColLabel, assetColOffStr, lines, noRows, rheads, tableCls, toggleAssetCol } = v;
  return (
    <>
      <div className="tscroll" style={st("flex: 1 1 auto; min-height: 0; overflow: auto")}>
        <table className={tableCls}>
          <thead>
            <tr className="sizer" aria-hidden="true">
              <th style={st("width: 74px")} />
              <th className="acol" style={st("width: 128px")} />
              <th style={st("width: 100px")} />
              <th />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 94px")} />
              <th style={st("width: 126px")} />
            </tr>
            <tr>
              <th rowSpan={3} style={st("text-align: center; padding-left: 4px; padding-right: 4px")}>
                <span style={st("display: inline-flex; align-items: center; gap: 3px; white-space: nowrap")}>
                  Asset ID
                  <button type="button" className="acoltog" onClick={toggleAssetCol} aria-pressed={assetColOffStr} aria-label={assetColLabel} title={assetColLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 6-6 6 6 6" />
                    </svg>
                  </button>
                </span>
              </th>
              <th className="acol" rowSpan={3} style={st("text-align: center; padding-left: 6px; padding-right: 6px")}>Asset</th>
              <th rowSpan={3} style={st("text-align: center; padding-left: 6px; padding-right: 6px")}>Property</th>
              <th className="scen" rowSpan={3} style={st("text-align: center; padding-left: 16px")}>Damage scenario</th>
              <th colSpan={7} className="hgroup" style={st("text-align: center; padding: 9px 8px 7px")}>Impact rating</th>
              <th rowSpan={3} className="hover" style={st("text-align: center; padding: 10px 8px; line-height: 1.35")}>
                Overall
                <br />
                impact rating
              </th>
            </tr>
            <tr>
              <th colSpan={4} className="hband hb-user">
                <span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                  </svg>
                  <b>Tool users</b>
                  {' '}
                  <span />
                </span>
              </th>
              <th colSpan={3} className="hband hb-other">
                <span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="8.5" r="3" />
                    <circle cx="16.5" cy="9.5" r="2.4" />
                    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7-3.7" />
                  </svg>
                  <b>Other stakeholders</b>
                  {' '}
                  <span>
                    <br />
                  </span>
                </span>
              </th>
            </tr>
            <tr>
              {(rheads as Vals[]).map((h: Vals, __i: number) => (
                <Fragment key={__i}>
                  <th className={h.cls} style={st(h.style)} title={h.title}>{h.name}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {(lines as Vals[]).map((r: Vals, __i: number) => (
              <Fragment key={__i}>
                {r.isBand && (
                  <>
                  <tr className="band">
                    <td colSpan={12}>
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
                        <button type="button" className="cell mono" onClick={r.pickRow} onDoubleClick={r.dblRow} aria-label={r.assetLabel} title={r.assetLabel} style={st(r.idStyle)}>{r.aid}</button>
                      </td>
                      <td className="acol" rowSpan={Number(r.span)} style={st(`${r.assetTd}; box-shadow: inset -1px 0 0 #E6E2D9`)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st(r.nameStyle)}>{r.aname}</button>
                      </td>
                      </>
                    )}
                    <td style={st(r.idTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("font-size: 12.5px; color: #4A4946; text-align: center; padding: 8px 6px")}>{r.prop}</button>
                    </td>
                    <td className="scencell" style={st(r.plainTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px")}>
                        <span style={st("display: inline-flex; align-items: center; gap: 6px")}>
                          <span className="mono" style={st("padding: 1px 6px; border-radius: 5px; box-shadow: inset 0 0 0 1px #CFCAC0; font-size: 11px; font-weight: 500; color: #4A4946")}>{r.dmg}</span>
                          {r.rowCorner && (
                            <>
                            <span className="ndot" aria-hidden="true" style={st("position: static; box-shadow: none")} />
                            </>
                          )}
                        </span>
                        <span style={st("font-size: 13px; color: #2F2E2B; line-height: 1.5")}>
                          <span className="scentx">{r.scen}</span>
                        </span>
                      </button>
                    </td>
                    {(r.cells as Vals[]).map((c: Vals, __i: number) => (
                      <Fragment key={__i}>
                        <td className={c.cls} style={st(c.td)}>
                          <div className={c.pcls} onClick={c.pick} onDoubleClick={c.comment} title="Double-click to comment" style={st(c.btn)}>
                            <button type="button" className="rchip" style={st(c.chip)} onClick={c.openMenu} disabled={c.locked} aria-haspopup="menu" aria-expanded={c.menuStr} aria-label={c.label} title={c.title}>
                              {c.locked && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={st("margin-right: 4px; opacity: .7")}>
                                  <rect x="5" y="11" width="14" height="9" rx="2" />
                                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                </svg>
                              )}
                              {c.text}
                              {c.corner && (
                                <>
                                <span className="pdot" aria-hidden="true" />
                                </>
                              )}
                            </button>
                            {c.menu && (
                              <>
                              <div className={c.menuCls} role="menu" aria-label={c.label}>
                                {(c.opts as Vals[]).map((o: Vals, __i: number) => (
                                  <Fragment key={__i}>
                                    <button type="button" role="menuitemradio" className="ropt" aria-checked={o.on} onClick={o.pick} style={st(o.sw)} title={`${o.pts} points`}>{o.label}</button>
                                  </Fragment>
                                ))}
                              </div>
                              </>
                            )}
                          </div>
                        </td>
                      </Fragment>
                    ))}
                    <td className="rt" style={st(r.rtTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("text-align: center; padding: 8px 6px")} title={r.rtTitle}>
                        <span className="rchip big" style={st(r.rtChip)}>{r.rtText}</span>
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
          <p style={st("margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66")}>No damage scenarios match. Clear the search or show all.</p>
          </>
        )}
      </div>
    </>
  );
}
