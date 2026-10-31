/**
 * Ported from the markup of Impact.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from './types';

export function ReviewFooter({ v }: { v: Vals }) {
  const { finish, finishLabel, legendNode, legendOpen, legendStr, noun, nextDisabled, nextPage, pageLabel, pageMatched, pageRange, pageSize, prevDisabled, prevPage, sizeMenuOpen, sizeMenuStr, sizeOpts, toggleLegend, toggleSizeMenu } = v;
  return (
    <>
      <div style={st("flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; padding: 12px 24px; border-top: 1px solid #E6E4DE; background: #FAF9F7; font-size: 12.5px; color: #4A4946")}>
        <span style={st("display: inline-flex; align-items: center; gap: 16px")}>
          <span style={st("position: relative; display: inline-flex; align-items: center; gap: 10px")}>
            <button type="button" className="ibtn helpb" aria-expanded={legendStr} aria-label="What the marks mean" title="What the marks mean" onClick={toggleLegend}>?</button>
            {legendOpen && legendNode}
          </span>
          <span style={st("color: #6B6A66")}>
            <span className="mono" style={st("color: #1C1B19")}>{pageRange}</span>
            {' '}of{' '}
            <span className="mono">{pageMatched}</span>
            {' '}{noun}
          </span>
        </span>
        <span style={st("display: inline-flex; align-items: center; gap: 16px")}>
          <span style={st("display: inline-flex; align-items: center; gap: 14px")}>
            <span className="psize" style={st("display: inline-flex; align-items: center; gap: 8px; color: #6B6A66")}>
              Page size
              <span style={st("position: relative; display: inline-flex")}>
                <button type="button" className="psbtn" aria-haspopup="listbox" aria-expanded={sizeMenuStr} aria-label={`Rows per page: ${pageSize}`} onClick={toggleSizeMenu}>
                  <span>{pageSize}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {sizeMenuOpen && (
                  <>
                  <div className="psmenu" role="listbox" aria-label="Rows per page">
                    {(sizeOpts as Vals[]).map((o: Vals, __i: number) => (
                      <Fragment key={__i}>
                        <button type="button" role="option" className="psopt" aria-selected={o.selStr} onClick={o.pick}>{o.label}</button>
                      </Fragment>
                    ))}
                  </div>
                  </>
                )}
              </span>
            </span>
            <span style={st("display: inline-flex; align-items: center; gap: 6px")}>
              <button type="button" className="btn btn-line btn-sm pbtn" onClick={prevPage} disabled={prevDisabled}>Previous</button>
              <span className="mono" style={st("min-width: 48px; text-align: center; color: #3A3936")}>{pageLabel}</span>
              <button type="button" className="btn btn-line btn-sm pbtn" onClick={nextPage} disabled={nextDisabled}>Next</button>
            </span>
          </span>
          <span aria-hidden="true" style={st("width: 1px; height: 24px; background: #E6E4DE")} />
          <button type="button" className="btn btn-dark" onClick={finish} style={st("min-height: 38px; font-size: 13.5px")}>{finishLabel}</button>
        </span>
      </div>
    </>
  );
}
