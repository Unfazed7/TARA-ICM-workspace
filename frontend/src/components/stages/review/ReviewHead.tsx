/**
 * Ported from the markup of Impact.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from './types';

export function ReviewHead({ v }: { v: Vals }) {
  const { dist, distLegend, distTitle, fActive, fCount, filters, fmenuOpen, fmenuStr, headTitle, onSearch, pointsLabel, pointsStr, q, resetFilters, searchLabel, showPoints, toggleFmenu, togglePoints, totalText } = v;
  return (
    <>
      <div className="phead">
        <span style={st("display: inline-flex; align-items: center; gap: 12px")}>
          <span style={st("font-size: 15px; font-weight: 600")}>{headTitle}</span>
          <span className="hidesm" style={st("font-size: 12.5px; color: #6B6A66")}>
            <br />
          </span>
          <span className="hidesm dsum" title={distTitle}>
            <span style={st("display: inline-flex; align-items: center; gap: 12px")}>
              <span className="dist" aria-hidden="true">
                {(dist as Vals[]).map((d: Vals, __i: number) => (
                  <Fragment key={__i}>
                    <span style={st(d.style)} />
                  </Fragment>
                ))}
              </span>
              <span style={st("font-size: 12.5px; font-weight: 600; color: #1C1B19")}>{totalText}</span>
            </span>
            <span style={st("display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 16px")}>
              {(distLegend as Vals[]).map((l: Vals, __i: number) => (
                <Fragment key={__i}>
                  <span style={st("display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: #4A4946")}>
                    <span aria-hidden="true" style={st(l.dot)} />
                    <span className="mono" style={st("color: #1C1B19")}>{l.n}</span>
                    {' '}{l.label}
                  </span>
                </Fragment>
              ))}
            </span>
          </span>
        </span>
        <span style={st("display: inline-flex; flex-wrap: wrap; align-items: center; gap: 10px")}>
          <span className="fwrap" style={st("position: relative; display: inline-flex")}>
            <button type="button" className="fbtn" aria-haspopup="dialog" aria-expanded={fmenuStr} onClick={toggleFmenu}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M7 12h10M10 17h4" />
              </svg>
              Filters
              {fActive && (
                <>
                <span className="fcountb">{fCount}</span>
                </>
              )}
            </button>
            {fmenuOpen && (
              <>
              <div className="fpop" role="dialog" aria-label="Filters">
                <span className="fhd">Show</span>
                {(filters as Vals[]).map((f: Vals, __i: number) => (
                  <Fragment key={__i}>
                    <button type="button" className="fopt" role="menuitemradio" aria-checked={f.pressed} onClick={f.pick}>
                      <span className="fradio" aria-hidden="true" />
                      {f.label}
                    </button>
                  </Fragment>
                ))}
                <span className="fsep" aria-hidden="true" />
{showPoints && (
<>
                <span className="fhd">Display</span>
                <button type="button" className="fopt" role="menuitemcheckbox" aria-checked={pointsStr} onClick={togglePoints}>
                  <span className="ftog" aria-hidden="true" />
                  {pointsLabel}
                </button>
</>
)}
                {fActive && (
                  <>
                  <span className="fsep" aria-hidden="true" />
                  <button type="button" className="freset" onClick={resetFilters}>Reset to default</button>
                  </>
                )}
              </div>
              </>
            )}
          </span>
          <label style={st("display: inline-flex; align-items: center; position: relative")}>
            <span style={st("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)")}>{searchLabel}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" style={st("position: absolute; left: 10px; pointer-events: none")}>
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input className="fld" type="search" placeholder={searchLabel} value={q} onChange={onSearch} style={st("height: 36px; width: 200px; padding: 0 10px 0 32px")} />
          </label>
        </span>
      </div>
    </>
  );
}
