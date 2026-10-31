/**
 * Ported from the markup of Tara.dc.html (.meta/design/04-06). The values come in as `v`, the way the design's script feeds its page;
 * the logic that builds them is in the screen's own hook. Every class is the design's own (styles/*-stage.css).
 */

import { Fragment } from 'react';
import { st } from '../assets/constants';
import type { Vals } from './types';

export function ReviewRail({ v }: { v: Vals }) {
  const { asideCls, asmCount, asmEmpty, asmHint, asmList, cancelChange, clearPick, crumb, draft, draftShort, hasNeed, hasSel, listEmpty, listTitle, needYou, noSel, onDraft, onReply, panelName, railFilters, railOpen, railWrap, reply, replyShort, sel, showList, threadCount, threadList, toggleRail } = v;
  return (
    <>
      <div className="railwrap" style={st(railWrap)}>
        {railOpen && (
          <>
          <aside className={asideCls} aria-label="Assumptions" style={st("width: 400px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0")}>
            <div style={st("display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px 12px 20px; background: #F3F1EC; border-bottom: 1px solid #E6E4DE")}>
              {noSel && (
                <>
                <span style={st("display: flex; flex-direction: column; gap: 1px")}>
                  <span style={st("font-size: 12px; color: #6B6A66")}>{panelName}</span>
                  <span style={st("display: inline-flex; align-items: center; gap: 10px")}>
                    <span style={st("font-size: 15px; font-weight: 600; letter-spacing: -0.01em")}>Assumptions</span>
                    {hasNeed && (
                      <>
                      <span className="tag t-yellow">{needYou} need you</span>
                      </>
                    )}
                  </span>
                </span>
                </>
              )}
              {hasSel && (
                <>
                <nav aria-label="Breadcrumb" style={st("display: inline-flex; align-items: baseline; gap: 6px; min-width: 0")}>
                  <button type="button" className="tlink" onClick={clearPick} title="Back to all assumptions" style={st("padding: 0; font-size: 13px; color: #6B6A66; text-decoration: none")}>Assumptions</button>
                  <span aria-hidden="true" style={st("font-size: 13px; color: #B5B4AF")}>/</span>
                  <span style={st("font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: #1C1B19; white-space: nowrap; overflow: hidden; text-overflow: ellipsis")}>{crumb}</span>
                </nav>
                </>
              )}
              <button type="button" className="ibtn" aria-label="Close assumptions" onClick={toggleRail}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {noSel && (
              <>
              <div style={st("display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px 10px 20px; border-bottom: 1px solid #E6E4DE")}>
                <span role="group" aria-label="Show" style={st("display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: #F1F0EC")}>
                  {(railFilters as Vals[]).map((f: Vals, __i: number) => (
                    <Fragment key={__i}>
                      <button type="button" className="seg" aria-pressed={f.pressed} onClick={f.pick} style={st(f.style)}>{f.label}</button>
                    </Fragment>
                  ))}
                </span>
              </div>
              </>
            )}
            <div className="dscroll" style={st("scrollbar-gutter: stable; overflow-anchor: none; flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column")}>
              {hasSel && (
                <>
                <article aria-label={sel.title} style={st("padding: 26px 20px 14px; border-bottom: 1px solid #E6E4DE; display: flex; flex-direction: column; gap: 10px")}>
                  <header className="dhead" style={st("display: flex; align-items: flex-start; gap: 12px; position: sticky; top: -2px; z-index: 3; margin: -26px -20px 0; padding: 16px 20px 16px; background: #FFFFFF; border-bottom: 1px solid #EEECE7; align-items: center;")}>
                    <span style={st("display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 auto")}>
                      <span className="mono" style={st("flex: none; padding: 2px 7px; border-radius: 6px; box-shadow: inset 0 0 0 1px #CFCAC0; font-size: 12px; font-weight: 500; color: #4A4946")}>{sel.code}</span>
                      <span style={st("font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; color: #1C1B19; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")} title={sel.sub}>{sel.sub}</span>
                    </span>
                    <span className={sel.stateCls}>{sel.state}</span>
                  </header>
                  {sel.hasDesc2 && (
                    <>
                    <section className="dsec" aria-label={sel.desc2Label}>
                      <span className="dlabel">
                        {sel.desc2Label}
                        <span className="mono idtag">{sel.desc2Tag}</span>
                      </span>
                      <p style={st("margin: 0; font-size: 14px; line-height: 1.55; color: #2F2E2B")}>{sel.desc2}</p>
                    </section>
                    </>
                  )}
                  {sel.hasDesc && (
                    <>
                    <section className="dsec" aria-label={sel.descLabel}>
                      <span className="dlabel">
                        {sel.descLabel}
                        {sel.descTag && <span className="mono idtag">{sel.descTag}</span>}
                      </span>
                      <p style={st("margin: 0; font-size: 14px; line-height: 1.55; color: #2F2E2B")}>{sel.desc}</p>
                    </section>
                    </>
                  )}
                  <section className="dsec" aria-label={sel.whyLabel}>
                    <span className="dlabel">{sel.whyLabel}</span>
                    <div className="msg-c" style={st("padding-left: 0; border-left: 0")}>
                      <p>{sel.reason}</p>
                      {(sel.quotes as Vals[]).map((q: Vals, __i: number) => (
                        <Fragment key={__i}>
                          <blockquote className="quote">
                            <footer style={st("margin: 0 0 3px; font-size: 11.5px; color: #6B6A66")}>
                              Evidence from{' '}
                              <span className="mono">{q.w}</span>
                            </footer>
                            <p>"{q.q}"</p>
                          </blockquote>
                        </Fragment>
                      ))}
                      {sel.hasFlip && (
                        <>
                        <p style={st("font-size: 13px; color: #5F5E5B")}>
                          <span style={st("color: #1C1B19; font-weight: 500")}>Would change it:</span>
                          {' '}{sel.flip}
                        </p>
                        </>
                      )}
                    </div>
                  </section>
                  {sel.isRow && (
                    <>
                    <section className="dsec propsec" aria-label={sel.groupsLabel}>
                      <span className="dlabel">{sel.groupsLabel}</span>
                      {(sel.groups as Vals[]).map((g: Vals, __i: number) => (
                        <Fragment key={__i}>
                          <div className="igrp">
                            <span className="iglbl">{g.name}</span>
                            <div className="igrid">
                              {(g.items as Vals[]).map((p: Vals, __i: number) => (
                                <Fragment key={__i}>
                                  <button type="button" className="ibtn2" style={st(p.style)} aria-expanded={p.openStr} aria-label={p.whyLabel} title={p.whyLabel} onClick={p.toggleWhy}>
                                    <span className="inm">{p.name}</span>
                                    <span className="ilv">
                                      {p.lv}
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="m6 9 6 6 6-6" />
                                      </svg>
                                    </span>
                                    {p.dot && (
                                      <>
                                      <span className="ipdot" aria-hidden="true" />
                                      </>
                                    )}
                                  </button>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                      <div className={sel.whyCls} aria-hidden={sel.whyHidden}>
                        <div className="whyin">
                          <div className={sel.whyAnim}>
                            <p style={st("font-weight: 600")}>
                              {sel.whyName}{' '}
                              <span style={st("font-weight: 500; color: #6B6A66")}>{sel.whyState}</span>
                            </p>
                            <p>{sel.whyReason}</p>
                            {sel.whyHasFlip && (
                              <>
                              <p style={st("color: #5F5E5B")}>
                                <span style={st("color: #1C1B19; font-weight: 500")}>Would change it:</span>
                                {' '}{sel.whyFlip}
                              </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                    </>
                  )}
                  {sel.hasGoal && (
                    <>
                    <section className="dsec" aria-label={sel.goalLabel}>
                      <span className="dlabel">
                        {sel.goalLabel}
                        {sel.hasGoalTag && (
                          <>
                          <span className="mono idtag">{sel.goalTag}</span>
                          </>
                        )}
                      </span>
                      <p style={st("margin: 0; font-size: 14px; line-height: 1.55; color: #2F2E2B")}>{sel.goalText}</p>
                    </section>
                    </>
                  )}
                  {(sel.asms as Vals[]).map((x: Vals, __i: number) => (
                    <Fragment key={__i}>
                      <div className="decide" style={st("flex-direction: column; align-items: stretch; background: #FBF8EE; border-color: #F1E2B3")}>
                        <span style={st("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
                          <span className="mono" style={st("font-size: 11.5px; color: #956400")}>{x.id} · assumption</span>
                          <span className={x.cls}>{x.state}</span>
                        </span>
                        <p style={st("margin: 0; font-size: 14px; color: #2F2E2B")}>{x.text}</p>
                        {x.open && (
                          <>
                          <span style={st("display: flex; gap: 8px")}>
                            <button type="button" className="btn btn-dark btn-sm" onClick={x.confirm}>Confirm</button>
                            <button type="button" className="btn btn-line btn-sm" onClick={x.dispute}>Dispute</button>
                          </span>
                          </>
                        )}
                      </div>
                    </Fragment>
                  ))}
                  {(sel.msgs as Vals[]).map((m: Vals, __i: number) => (
                    <Fragment key={__i}>
                      <div style={st(m.wrap)}>
                        <div className="msg-body">
                          {m.mine && (
                            <>
                            <span className="who">
                              <b>You</b>
                              {' '}· {m.when}
                            </span>
                            </>
                          )}
                          <p>{m.text}</p>
                          {m.hasChange && (
                            <>
                            <div className="proposal">
                              <span style={st("display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px")}>
                                <span style={st("font-weight: 500")}>{m.changeProp}</span>
                                <span className={m.fromCls} style={st("text-decoration: line-through")}>{m.fromWord}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M5 12h14M13 6l6 6-6 6" />
                                </svg>
                                <span className={m.toCls}>{m.toWord}</span>
                              </span>
                              {m.changeOpen && (
                                <>
                                <span style={st("display: flex; gap: 8px")}>
                                  <button type="button" className="btn btn-dark btn-sm" onClick={m.apply}>Apply</button>
                                  <button type="button" className="btn btn-line btn-sm" onClick={m.keep}>Keep as is</button>
                                </span>
                                </>
                              )}
                              {m.changeDone && (
                                <>
                                <span style={st("font-size: 12.5px; color: #6B6A66")}>{m.changeDoneText}</span>
                                </>
                              )}
                            </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                  {sel.rowLeft && (
                    <>
                    <div className="decide">
                      <span style={st("font-size: 13px; color: #4A4946")}>{sel.rowLeftHint}</span>
                      <button type="button" className="btn btn-dark btn-sm" onClick={sel.confirmRow}>{sel.rowLeftLabel}</button>
                    </div>
                    </>
                  )}
                  {sel.isProp && (
                    <>
                    {sel.canReview && (
                      <>
                      <div className="decide">
                        <span style={st("font-size: 13px; color: #4A4946")}>
                          Proposed:{' '}
                          <b style={st("font-weight: 600; color: #1C1B19")}>{sel.proposedWord}</b>
                        </span>
                        <span style={st("display: flex; gap: 8px")}>
                          <button type="button" className="btn btn-dark btn-sm" onClick={sel.confirm}>Confirm</button>
                          <button type="button" className="btn btn-line btn-sm" onClick={sel.startChange}>{sel.changeLabel}</button>
                        </span>
                      </div>
                      </>
                    )}
                    {sel.changing && (
                      <>
                      <div className="decide" style={st("flex-direction: column; align-items: stretch")}>
                        {sel.changeExtra}
                        <label htmlFor="why" style={st("font-size: 13px; font-weight: 500")}>Why? A reason is kept with the change.</label>
                        <textarea id="why" className="fld" rows={2} value={draft} onChange={onDraft} style={st("padding: 8px 10px; resize: vertical; background: #FFFFFF")} />
                        <span style={st("display: flex; gap: 8px")}>
                          <button type="button" className="btn btn-dark btn-sm" disabled={draftShort} onClick={sel.saveChange}>Save change</button>
                          <button type="button" className="btn btn-line btn-sm" onClick={cancelChange}>Cancel</button>
                        </span>
                      </div>
                      </>
                    )}
                    </>
                  )}
                </article>
                </>
              )}
              {noSel && (
                <>
                <p style={st("margin: 0; padding: 18px 20px; font-size: 13.5px; color: #5F5E5B; border-bottom: 1px solid #E6E4DE")}>{asmHint}</p>
                </>
              )}
              {noSel && (
                <>
                <div className="sec">
                  <span>Assumptions</span>
                  <span className="n">{asmCount}</span>
                </div>
                {(asmList as Vals[]).map((x: Vals, __i: number) => (
                  <Fragment key={__i}>
                    <div className={x.rowCls}>
                      <span style={st("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
                        <button type="button" className="tlink" onClick={x.pick} style={st("padding: 0; font-size: 12px; color: #6B6A66; text-decoration: none")}>
                          <span className="mono">{x.about}</span>
                          {' '}· {x.aboutName}
                        </button>
                        <span className={x.cls}>{x.state}</span>
                      </span>
                      <p>{x.text}</p>
                      {x.open && (
                        <>
                        <span style={st("display: flex; gap: 8px")}>
                          <button type="button" className="btn btn-dark btn-sm" onClick={x.confirm}>Confirm</button>
                          <button type="button" className="btn btn-line btn-sm" onClick={x.dispute}>Dispute</button>
                        </span>
                        </>
                      )}
                    </div>
                  </Fragment>
                ))}
                {asmEmpty && (
                  <>
                  <p style={st("margin: 0; padding: 4px 20px 12px; font-size: 13px; color: #6B6A66")}>None here.</p>
                  </>
                )}
                </>
              )}
              {showList && (
                <>
                <div className="sec">
                  <span>{listTitle}</span>
                  <span className="n">{threadCount}</span>
                </div>
                <div role="list">
                  {(threadList as Vals[]).map((t: Vals, __i: number) => (
                    <Fragment key={__i}>
                      <button type="button" role="listitem" className="trow" onClick={t.pick}>
                        <span style={st("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
                          <span style={st("font-size: 13.5px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                            <span className="mono" style={st("font-size: 11.5px; color: #6B6A66; font-weight: 400; margin-right: 6px")}>{t.key}</span>
                            {t.title}
                          </span>
                          <span className={t.cls}>{t.tag}</span>
                        </span>
                        <span style={st("display: block; margin-top: 2px; font-size: 12.5px; color: #6B6A66; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{t.snippet}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
                {listEmpty && (
                  <>
                  <p style={st("margin: 0; padding: 4px 20px 16px; font-size: 13px; color: #6B6A66")}>Nothing here.</p>
                  </>
                )}
                </>
              )}
              <div className="dspacer" aria-hidden="true" />
            </div>
            {hasSel && (
              <>
              <div style={st("padding: 12px 16px 14px 20px; border-top: 1px solid #E6E4DE; background: #FFFFFF")}>
                <label htmlFor="reply" style={st("position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)")}>Reply</label>
                <div className="composer">
                  <textarea id="reply" rows={2} placeholder="Reply, or ask for a change" value={reply} onChange={onReply} />
                  <span style={st("display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 6px 6px 10px")}>
                    <button type="button" className="tlink" onClick={sel.resolve}>{sel.resolveLabel}</button>
                    <button type="button" className="btn btn-dark btn-sm" disabled={replyShort} onClick={sel.send}>Comment</button>
                  </span>
                </div>
              </div>
              </>
            )}
          </aside>
          </>
        )}
      </div>
    </>
  );
}
