/**
 * Ported from the markup of Threat.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from '../review/types';

export function ThreatsTable({ v }: { v: Vals }) {
  const { assetColLabel, assetColOffStr, fheads, lines, noRows, tableCls, toggleAssetCol } = v;
  return (
    <>
      <div className="tscroll" style={st("flex: 1 1 auto; min-height: 0; overflow: auto")}>
        <table className={tableCls} style={st("min-width: 0")}>
          <thead>
            <tr className="sizer" aria-hidden="true">
              <th style={st("width: 72px")} />
              <th className="acol" style={st("width: 120px")} />
              <th style={st("width: 108px")} />
              <th />
              <th style={st("width: 118px")} />
              <th style={st("width: 72px")} />
              <th style={st("width: 92px")} />
              <th style={st("width: 92px")} />
              <th style={st("width: 92px")} />
              <th style={st("width: 92px")} />
              <th style={st("width: 68px")} />
              <th style={st("width: 112px")} />
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
              <th className="scen" style={st("text-align: center; padding-left: 16px")}>Threat scenario</th>
              <th style={st("text-align: center")}>STRIDE category</th>
              <th style={st("text-align: center")}>Attack path</th>
              {(fheads as Vals[]).map((h: Vals, __i: number) => (
                <Fragment key={__i}>
                  <th className={h.cls} style={st(h.style)} title={h.title}>{h.name}</th>
                </Fragment>
              ))}
              <th className="pc cvh" style={st("text-align: center")}>CVSS</th>
              <th className="pc hover" style={st("text-align: center")}>Attack feasibility</th>
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
                        <button type="button" className="cell mono" onClick={r.pickRow} onDoubleClick={r.dblRow} aria-label={r.assetLabel} title={r.assetLabel} style={st("font-size: 12px; color: #6B6A66; white-space: nowrap; text-align: center; padding: 8px 4px")}>{r.aid}</button>
                      </td>
                      <td className="acol" rowSpan={Number(r.span)} style={st(`${r.assetTd}; box-shadow: inset -1px 0 0 #E6E2D9`)}>
                        <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("font-size: 13px; font-weight: 500; line-height: 1.35; text-align: center; color: #1C1B19")}>{r.aname}</button>
                      </td>
                      </>
                    )}
                    <td style={st(r.idTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("font-size: 12.5px; color: #4A4946; text-align: center; padding: 8px 6px; overflow-wrap: anywhere")}>{r.prop}</button>
                    </td>
                    <td className="scencell" style={st(r.plainTd)}>
                      <button type="button" className="cell" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st("display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 10px 16px 11px")}>
                        <span style={st("display: inline-flex; align-items: center; gap: 6px")}>
                          <span className="mono" style={st("padding: 1px 6px; border-radius: 5px; box-shadow: inset 0 0 0 1px #CFCAC0; font-size: 11px; font-weight: 500; color: #4A4946")}>{r.thr}</span>
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
                    <td className={r.stride.cls} style={st(r.stride.td)}>
                      <div className={r.stride.pcls} onClick={r.stride.pick} onDoubleClick={r.stride.comment} title="Double-click to comment" style={st(r.stride.btn)}>
                        <button type="button" className="rchip" style={st(r.stride.chip)} onClick={r.stride.openMenu} aria-haspopup="menu" aria-expanded={r.stride.menuStr} aria-label={r.stride.label} title={r.stride.title}>
                          <span>{r.stride.text}</span>
                        </button>
                        {r.stride.corner && (
                          <>
                          <span className="pdot" aria-hidden="true" />
                          </>
                        )}
                        {r.stride.menu && (
                          <>
                          <div className={r.stride.menuCls} role="menu" aria-label={r.stride.label}>
                            {(r.stride.opts as Vals[]).map((o: Vals, __i: number) => (
                              <Fragment key={__i}>
                                <button type="button" role="menuitemradio" className="ropt sopt" aria-checked={o.on} onClick={o.pick}>{o.label}</button>
                              </Fragment>
                            ))}
                          </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={st(r.plainTd)}>
                      <button type="button" className="apbtn" onClick={r.openPath} title={`Open attack path ${r.ap}`} aria-label={`Open attack path ${r.ap} for ${r.thr}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="4.5" r="2" />
                          <circle cx="5.5" cy="19.5" r="2" />
                          <circle cx="12" cy="19.5" r="2" />
                          <circle cx="18.5" cy="19.5" r="2" />
                          <path d="M12 6.5v4M12 10.5 5.5 17.5M12 10.5v7M12 10.5l6.5 7" />
                        </svg>
                      </button>
                    </td>
                    {(r.cells as Vals[]).map((c: Vals, __i: number) => (
                      <Fragment key={__i}>
                        <td className={c.cls} style={st(c.td)}>
                          <div className={c.pcls} onClick={c.pick} onDoubleClick={c.comment} title="Double-click to comment" style={st(c.btn)}>
                            <button type="button" className="rchip" style={st(c.chip)} onClick={c.openMenu} disabled={c.locked} aria-haspopup="menu" aria-expanded={c.menuStr} aria-label={c.label} title={c.title}>
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
                    <td className="cvc" style={st(r.cvssTd)}>
                      <button type="button" className="cell mono" onClick={r.pickRow} onDoubleClick={r.dblRow} tabIndex={-1} style={st(r.cvssStyle)} title={r.rtTitle}>{r.cvss}</button>
                    </td>
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
          <p style={st("margin: 0; padding: 28px 24px; font-size: 14px; color: #6B6A66")}>No threats match. Clear the search or show all.</p>
          </>
        )}
      </div>
    </>
  );
}
