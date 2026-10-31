/**
 * Ported from the markup of Threat.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from '../review/types';

export function AttackPathSheet({ v }: { v: Vals }) {
  const { closePath, path, pathOpen, stopEv } = v;
  return (
    <>
      {pathOpen && (
        <>
        <div className="apback" onClick={closePath}>
          <div className="apsheet" role="dialog" aria-modal="true" aria-label={`Attack path ${path.ap}`} onClick={stopEv}>
            <div className="aphead">
              <span style={st("display: flex; flex-direction: column; gap: 4px; min-width: 0")}>
                <span style={st("display: inline-flex; align-items: center; gap: 8px")}>
                  <span className="mono aptag">{path.ap}</span>
                  <span style={st("font-size: 16px; font-weight: 600; letter-spacing: -0.01em")}>Attack tree</span>
                  <span style={st("font-size: 13px; color: #6B6A66")}>
                    for{' '}
                    <span className="mono">{path.thr}</span>
                    {' '}· {path.stride}
                  </span>
                </span>
                <span style={st("font-size: 12.5px; color: #6B6A66")}>{path.asset}</span>
              </span>
              <button type="button" className="ibtn" aria-label="Close attack path" onClick={closePath}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="apbody">
              <div className="aptree">
                <div className="apnode goal">
                  <span className="apk">
                    Attack goal ·{' '}
                    <span className="mono">{path.dmg}</span>
                  </span>
                  <span>{path.dmgText}</span>
                </div>
                <span className="apline" aria-hidden="true" />
                <div className="apnode threat">
                  <span className="apk">
                    Threat ·{' '}
                    <span className="mono">{path.thr}</span>
                  </span>
                  <span>{path.scen}</span>
                </div>
                <span className="apline" aria-hidden="true" />
                <span className="apand">AND · all steps in order</span>
                <div className="apsteps">
                  {(path.steps as Vals[]).map((st: Vals, __i: number) => (
                    <Fragment key={__i}>
                      <div className="apstep">
                        <span className="apnum">{st.n}</span>
                        <span>{st.text}</span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
              <aside className="apside">
                <span className="apk">Attack feasibility</span>
                <span style={st("display: inline-flex; align-items: center; gap: 10px")}>
                  <span className="apafr" style={st(path.afrStyle)}>{path.afr}</span>
                  <span style={st("font-size: 12.5px; color: #6B6A66")}>
                    CVSS{' '}
                    <span className="mono" style={st("color: #1C1B19")}>{path.cvss}</span>
                  </span>
                </span>
                <span className="apk" style={st("margin-top: 10px")}>Factors along this path</span>
                {(path.factors as Vals[]).map((fx: Vals, __i: number) => (
                  <Fragment key={__i}>
                    <span className="apfx">
                      <span>{fx.name}</span>
                      <span className="apfxv" style={st(fx.style)}>{fx.val}</span>
                    </span>
                  </Fragment>
                ))}
              </aside>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
