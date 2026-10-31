/**
 * Ported from the markup of Impact.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from './types';

export function ReviewWarn({ v }: { v: Vals }) {
  const { closeWarn, finishAnyway, reviewAsm, stop, warnItems, warnOpen, warnText, warnTitle } = v;
  return (
    <>
      {warnOpen && (
        <>
        <div className="wback" onClick={closeWarn}>
          <div className="wdlg" role="alertdialog" aria-modal="true" aria-labelledby="wtitle" onClick={stop}>
            <span style={st("display: flex; align-items: center; gap: 10px")}>
              <span aria-hidden="true" style={st("flex: none; width: 28px; height: 28px; border-radius: 99px; background: #FBF3DA; display: inline-flex; align-items: center; justify-content: center")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#956400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v5M12 16.5v.5" />
                  <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
              </span>
              <span id="wtitle" style={st("font-size: 16px; font-weight: 600; letter-spacing: -0.01em; color: #1C1B19")}>{warnTitle}</span>
            </span>
            <p style={st("margin: 0; font-size: 14px; line-height: 1.5; color: #4A4946")}>{warnText}</p>
            <div style={st("display: flex; flex-direction: column; gap: 6px")}>
              {(warnItems as Vals[]).map((w: Vals, __i: number) => (
                <Fragment key={__i}>
                  <div style={st("display: flex; gap: 10px; align-items: baseline; padding: 8px 10px; border-radius: 8px; background: #FBF8EE; border: 1px solid #F1E2B3")}>
                    <span className="mono" style={st("flex: none; font-size: 11.5px; color: #956400")}>{w.id}</span>
                    <span style={st("font-size: 13px; line-height: 1.45; color: #2F2E2B")}>{w.text}</span>
                  </div>
                </Fragment>
              ))}
            </div>
            <span style={st("display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px")}>
              <button type="button" className="btn btn-line btn-sm" onClick={finishAnyway}>Finish anyway</button>
              <button type="button" className="btn btn-dark btn-sm" onClick={reviewAsm}>Review assumptions</button>
            </span>
          </div>
        </div>
        </>
      )}
    </>
  );
}
