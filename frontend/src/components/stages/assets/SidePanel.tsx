/** The side panel of the 03 Assets design: Assumptions, then the asset or the property that is selected, with comments. */

import { useEffect, useRef, useState } from 'react';
import type { Asset, AssetComment, PropertyCode } from '@/types/stages';
import type { Assumption, Thread } from './useAssetsData';
import { FLIP, keyOf, PROP_NAME, PROPS, splitKey, st, whenWords } from './constants';
import { holdScroll, morphWhy, rememberScroll, revealWhy } from './whyScroll';

export interface PanelProps {
  assets: Asset[];
  assumptions: Assumption[];
  threads: Map<string, Thread>;
  sel: string | null;
  railFilter: 'open' | 'resolved';
  setRailFilter: (f: 'open' | 'resolved') => void;
  needCount: number;
  onClose: () => void;
  onSelect: (key: string | null) => void;
  /** Tick or untick a property (the grid's own toggle and the split buttons). */
  onToggle: (assetId: string, property: PropertyCode, applies: boolean) => void;
  onConfirm: (assetId: string, property: PropertyCode) => Promise<void>;
  onChange: (assetId: string, property: PropertyCode, applies: boolean, reason: string) => Promise<void>;
  onAssumption: (a: Assumption, decision: 'confirmed' | 'disputed') => void;
  onComment: (assetId: string, property: PropertyCode | null, text: string) => Promise<void>;
  onResolve: (key: string, resolved: boolean) => void;
  onProposal: (comment: AssetComment, state: 'applied' | 'kept') => void;
  reply: string;
  setReply: (v: string) => void;
  draft: string;
  setDraft: (v: string) => void;
  changing: boolean;
  setChanging: (v: boolean) => void;
  focusReply: number; // changes when the composer should take focus (double-click)
  busy: boolean;
}

const wordsOf = (applies: boolean) => (applies ? 'Applies' : 'Does not apply');

function MarkBox({ prop, applies, reviewed }: { prop: PropertyCode; applies: boolean; reviewed: boolean }) {
  const t = PROPS.find((p) => p.k === prop)!.t;
  const base = 'flex: none; margin-top: 3px; width: 20px; height: 20px; border-radius: 5px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; ';
  const look = applies ? `background: ${t}${reviewed ? '' : '; opacity: .42'}` : reviewed ? 'border: 1.5px solid #B9B7B0' : 'border: 1.5px dashed #B9B7B0';
  return (
    <span aria-hidden="true" style={st(base + look)}>
      {applies && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

function AssumptionCard({ a, onPick, onDecide, inList }: { a: Assumption; onPick?: () => void; onDecide: (d: 'confirmed' | 'disputed') => void; inList: boolean }) {
  const cls = a.state === 'open' ? 'tag t-yellow' : a.state === 'confirmed' || a.state === 'noted' ? 'tag t-grey' : 'tag t-red';
  const stateWord = a.state === 'open' ? 'Needs you' : a.state === 'confirmed' ? 'Confirmed' : a.state === 'disputed' ? 'Disputed' : 'Noted';
  const buttons = a.state === 'open' && (
    <span style={st('display: flex; gap: 8px')}>
      <button type="button" className="btn btn-dark btn-sm" onClick={(e) => { e.stopPropagation(); onDecide('confirmed'); }}>Confirm</button>
      <button type="button" className="btn btn-line btn-sm" onClick={(e) => { e.stopPropagation(); onDecide('disputed'); }}>Dispute</button>
    </span>
  );
  if (!inList) {
    return (
      <div className="decide" style={st('flex-direction: column; align-items: stretch; background: #FBF8EE; border-color: #F1E2B3')}>
        <span style={st('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
          <span className="mono" style={st('font-size: 11.5px; color: #956400')}>{a.label} · assumption</span>
          <span className={cls}>{stateWord}</span>
        </span>
        <p style={st('margin: 0; font-size: 14px; color: #2F2E2B')}>{a.text}</p>
        {buttons}
      </div>
    );
  }
  return (
    <div className={a.state === 'open' ? 'asm open' : 'asm'}>
      <span style={st('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
        <button type="button" className="tlink" onClick={onPick} style={st('padding: 0; font-size: 12px; color: #6B6A66; text-decoration: none')}>
          <span className="mono">{a.about}</span>
        </button>
        <span className={cls}>{stateWord}</span>
      </span>
      <p>{a.text}</p>
      {buttons}
    </div>
  );
}

export function SidePanel(p: PanelProps) {
  const root = useRef<HTMLElement>(null);
  const reply = useRef<HTMLTextAreaElement>(null);
  const [propWhy, setPropWhy] = useState<string | null>(null);
  const [whyLast, setWhyLast] = useState<string | null>(null);
  const [whySwap, setWhySwap] = useState(0);

  // A new selection starts at the top of the panel, as in the design.
  useEffect(() => {
    const t = setTimeout(() => { const el = root.current?.querySelector('.dscroll'); if (el) el.scrollTop = 0; }, 0);
    return () => clearTimeout(t);
  }, [p.sel]);
  useEffect(() => { if (p.focusReply) reply.current?.focus(); }, [p.focusReply]);

  const asset = p.sel ? p.assets.find((a) => a.asset_id === splitKey(p.sel!)[0]) : undefined;
  const prop = p.sel ? splitKey(p.sel)[1] : null;
  const isProp = Boolean(asset && prop && prop !== 'asset');
  const code = isProp ? (prop as PropertyCode) : null;
  const cell = asset && code ? asset.properties[code] : null;
  const thread = p.sel ? p.threads.get(p.sel) : undefined;
  const messages = thread?.messages ?? [];
  const resolved = Boolean(thread?.resolved);
  const asms = asset ? p.assumptions.filter((a) => a.about === asset.asset_id) : [];
  const left = asset ? PROPS.filter((x) => !asset.properties[x.k].reviewed) : [];

  const openAsm = p.assumptions.filter((a) => a.state === 'open');
  const doneAsm = p.assumptions.filter((a) => a.state !== 'open');
  const asmList = p.railFilter === 'open' ? openAsm : doneAsm;

  const nameOf = (id: string) => p.assets.find((a) => a.asset_id === id)?.name ?? '';
  const titleOf = (key: string) => { const [id, k] = splitKey(key); return nameOf(id) + (k === 'asset' ? '' : ` · ${PROP_NAME[k]}`); };
  const listKeys = [...p.threads.values()]
    .filter((t) => (p.railFilter === 'open' ? !t.resolved : t.resolved) && p.assets.some((a) => a.asset_id === splitKey(t.key)[0]))
    .filter((t) => t.key !== p.sel && (!p.sel || t.key.indexOf(`${splitKey(p.sel)[0]}.`) === 0));
  const showList = !p.sel || listKeys.length > 0;
  const listTitle = p.sel ? (p.railFilter === 'open' ? 'Other comments on this item' : 'Resolved on this item') : p.railFilter === 'open' ? 'Open comments' : 'Resolved comments';

  const segStyle = (on: boolean) => (on ? st('background: #FFFFFF; color: #1C1B19; font-weight: 500; box-shadow: 0 1px 2px rgba(28,27,25,.1)') : undefined);
  const hasNeed = p.needCount > 0;

  const toggleWhy = (wk: string) => {
    const opening = propWhy !== wk;
    const switching = opening && Boolean(propWhy);
    if (!opening) holdScroll(root.current);
    else if (switching) morphWhy(root.current);
    else rememberScroll(root.current);
    setPropWhy(opening ? wk : null);
    setWhyLast(wk);
    setWhySwap((n) => n + (switching ? 1 : 0));
    if (opening) revealWhy(root.current, 0);
  };

  // The "why" box of the asset's property buttons.
  let whyCls = 'whywrap';
  let whyHidden = true;
  let whyAnim = 'propwhy';
  let why: { name: string; state: string; reason: string; flip: string } | null = null;
  if (asset) {
    for (const x of PROPS) {
      const v = asset.properties[x.k];
      const wk = keyOf(asset.asset_id, x.k);
      const open = propWhy === wk;
      if (open) { whyCls = 'whywrap open'; whyHidden = false; whyAnim = whySwap ? `propwhy ${whySwap % 2 ? 'fa' : 'fb'}` : 'propwhy'; }
      if (open || (!propWhy && whyLast === wk)) why = { name: x.name, state: v.applies ? 'applies' : 'does not apply', reason: v.reason, flip: FLIP[x.k][v.applies ? 0 : 1] };
    }
  }

  const stateTag = asset ? (asset.status === 'removed' ? ['tag t-grey', 'Removed'] : asset.interface ? ['tag t-grey', 'Interface'] : ['', '']) : ['', ''];

  return (
    <aside ref={root} className="panel drawer" aria-label="Assumptions" style={st('width: 400px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0')}>
      <div style={st('display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px 12px 20px; background: #F3F1EC; border-bottom: 1px solid #E6E4DE')}>
        {!p.sel ? (
          <span style={st('display: flex; flex-direction: column; gap: 1px')}>
            <span style={st('font-size: 12px; color: #6B6A66')}>03 Asset Analysis</span>
            <span style={st('display: inline-flex; align-items: center; gap: 10px')}>
              <span style={st('font-size: 15px; font-weight: 600; letter-spacing: -0.01em')}>Assumptions</span>
              {hasNeed && <span className="tag t-yellow">{p.needCount} need you</span>}
            </span>
          </span>
        ) : (
          <nav aria-label="Breadcrumb" style={st('display: inline-flex; align-items: baseline; gap: 6px; min-width: 0')}>
            <button type="button" className="tlink" onClick={() => p.onSelect(null)} title="Back to all assumptions" style={st('padding: 0; font-size: 13px; color: #6B6A66; text-decoration: none')}>Assumptions</button>
            <span aria-hidden="true" style={st('font-size: 13px; color: #B5B4AF')}>/</span>
            <span style={st('font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: #1C1B19; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{asset?.name ?? ''}</span>
          </nav>
        )}
        <button type="button" className="ibtn" aria-label="Close assumptions" onClick={p.onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {!p.sel && (
        <div style={st('display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px 10px 20px; border-bottom: 1px solid #E6E4DE')}>
          <span role="group" aria-label="Show" style={st('display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: #F1F0EC')}>
            {([['open', 'Open'], ['resolved', 'Done']] as const).map(([k, label]) => (
              <button key={k} type="button" className="seg" aria-pressed={p.railFilter === k} onClick={() => p.setRailFilter(k)} style={segStyle(p.railFilter === k)}>{label}</button>
            ))}
          </span>
        </div>
      )}

      <div className="dscroll" style={st('scrollbar-gutter: stable; flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; overflow-anchor: none; display: flex; flex-direction: column')}>
        {asset && (
          <article aria-label={isProp ? PROP_NAME[code!] : asset.name} style={st('padding: 26px 20px 14px; border-bottom: 1px solid #E6E4DE; display: flex; flex-direction: column; gap: 10px')}>
            <header className="dhead" style={st('display: flex; align-items: flex-start; gap: 12px; position: sticky; top: -2px; z-index: 3; margin: -26px -20px 0; padding: 16px 20px 16px; align-items: center; background: #FFFFFF; border-bottom: 1px solid #EEECE7')}>
              {isProp && cell && <MarkBox prop={code!} applies={cell.applies} reviewed={cell.reviewed} />}
              <span style={st('display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto')}>
                <span style={st('display: inline-flex; align-items: center; gap: 10px; min-width: 0')}>
                  <span className="mono" style={st('flex: none; padding: 2px 7px; border-radius: 6px; box-shadow: inset 0 0 0 1px #CFCAC0; font-size: 12px; font-weight: 500; color: #4A4946')}>{asset.asset_id}</span>
                  <span style={st('font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; color: #1C1B19; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{isProp ? `${asset.name} · ${PROP_NAME[code!]}` : asset.type_label}</span>
                </span>
              </span>
              <span className={stateTag[0]} style={st('margin-top: 1px')}>{stateTag[1]}</span>
            </header>

            {!isProp && (
              <>
                <section className="dsec" aria-label="Description"><span className="dlabel">Description</span>
                  <p style={st('margin: 0; font-size: 14px; line-height: 1.55; color: #2F2E2B')}>{asset.description}</p>
                </section>
                <section className="dsec" aria-label="Why it is an asset"><span className="dlabel">Why it is an asset</span>
                  <div className="msg-c" style={st('padding-left: 0; border-left: 0')}>
                    <p>{asset.reason}</p>
                    {asset.quotes.map((q, i) => (
                      <blockquote key={i} className="quote"><footer style={st('margin: 0 0 3px; font-size: 11.5px; color: #6B6A66')}>Evidence from <span className="mono">{q.where}</span></footer><p>"{q.text}"</p></blockquote>
                    ))}
                    <p style={st('font-size: 13px; color: #5F5E5B')}><span style={st('color: #1C1B19; font-weight: 500')}>Would change it:</span> {asset.would_change}</p>
                  </div>
                </section>
                <section className="dsec propsec" aria-label="Cybersecurity properties"><span className="dlabel">Cybersecurity properties</span>
                  <div className="propgrid">
                    {PROPS.map((x) => {
                      const v = asset.properties[x.k];
                      const wk = keyOf(asset.asset_id, x.k);
                      const open = propWhy === wk;
                      const style = `--pc: ${x.t}; --ph: ${x.h}; ` + (v.applies
                        ? `--ring: inset 0 0 0 1.5px ${x.t}, 0 0 0 3px color-mix(in srgb, ${x.t} 12%, transparent); background: ${x.h}; color: ${x.t}; box-shadow: var(--ring)`
                        : '--ring: inset 0 0 0 1px #C9C4B9; background: #F3F1EC; color: #7A776F; box-shadow: var(--ring)');
                      const title = `${x.name}${v.applies ? ' applies. Click to untick.' : ' does not apply. Click to tick.'}`;
                      const whyLabel = `${open ? 'Hide' : 'Show'} why ${x.name}${v.applies ? ' applies' : ' does not apply'}`;
                      return (
                        <div key={x.k} className={v.applies ? 'split on' : 'split'} style={st(style)}>
                          <button type="button" className="splitmain" aria-pressed={v.applies} aria-label={title} title={title} onClick={() => p.onToggle(asset.asset_id, x.k, v.applies)}>{x.k}</button>
                          <button type="button" className="splitchev" aria-expanded={open} aria-label={whyLabel} title={whyLabel} onClick={() => toggleWhy(wk)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className={whyCls} aria-hidden={whyHidden}>
                    <div className="whyin">
                      <div className={whyAnim}>
                        <p style={st('font-weight: 600')}>{why?.name} <span style={st('font-weight: 500; color: #6B6A66')}>{why?.state}</span></p>
                        <p>{why?.reason}</p>
                        <p style={st('color: #5F5E5B')}><span style={st('color: #1C1B19; font-weight: 500')}>Would change it:</span> {why?.flip}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {asms.map((x) => (
              <AssumptionCard key={x.id} a={x} inList={false} onDecide={(d) => p.onAssumption(x, d)} />
            ))}

            {isProp && cell && (
              <div className="msg-c">
                <span className="lbl">Why</span>
                <p>{cell.reason}</p>
                <p style={st('font-size: 13px; color: #5F5E5B')}><span style={st('color: #1C1B19; font-weight: 500')}>Would change it:</span> {FLIP[code!][cell.applies ? 0 : 1]}</p>
              </div>
            )}

            {messages.map((m) => {
              const mine = m.author === 'analyst';
              const ch = m.proposed_change;
              return (
                <div key={m.id} style={st(mine ? 'padding: 10px 12px; border-radius: 12px; background: #F7F6F2; border: 1px solid #ECE9E2' : 'padding-left: 12px; border-left: 2px solid #DAD8D1')}>
                  <div className="msg-body">
                    {mine && <span className="who"><b>You</b> · {whenWords(m.created_at)}</span>}
                    <p>{m.text}</p>
                    {ch && (
                      <div className="proposal">
                        <span style={st('display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px')}>
                          <span style={st('font-weight: 500')}>{PROP_NAME[ch.property]}</span>
                          <span className="tag t-grey" style={st('text-decoration: line-through')}>{wordsOf(!ch.applies)}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                          <span className="tag t-ink">{wordsOf(ch.applies)}</span>
                        </span>
                        {ch.state === 'open' ? (
                          <span style={st('display: flex; gap: 8px')}>
                            <button type="button" className="btn btn-dark btn-sm" onClick={() => p.onProposal(m, 'applied')}>Apply</button>
                            <button type="button" className="btn btn-line btn-sm" onClick={() => p.onProposal(m, 'kept')}>Keep as is</button>
                          </span>
                        ) : (
                          <span style={st('font-size: 12.5px; color: #6B6A66')}>{ch.state === 'applied' ? 'Applied by you. The cell is updated.' : 'Kept as it is.'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!isProp && left.length > 0 && (
              <div className="decide">
                <span style={st('font-size: 13px; color: #4A4946')}>{left.length} of 6 properties are still proposed.</span>
                <button type="button" className="btn btn-dark btn-sm" disabled={p.busy} onClick={() => left.forEach((x) => p.onConfirm(asset.asset_id, x.k))}>{left.length === 1 ? 'Confirm it' : `Confirm all ${left.length}`}</button>
              </div>
            )}
            {isProp && cell && !cell.reviewed && !p.changing && (
              <div className="decide">
                <span style={st('font-size: 13px; color: #4A4946')}>Proposed: <b style={st('font-weight: 600; color: #1C1B19')}>{cell.applies ? 'applies' : 'does not apply'}</b></span>
                <span style={st('display: flex; gap: 8px')}>
                  <button type="button" className="btn btn-dark btn-sm" disabled={p.busy} onClick={() => p.onConfirm(asset.asset_id, code!)}>Confirm</button>
                  <button type="button" className="btn btn-line btn-sm" onClick={() => { p.setDraft(''); p.setChanging(true); }}>{cell.applies ? 'Change to does not apply' : 'Change to applies'}</button>
                </span>
              </div>
            )}
            {isProp && cell && p.changing && (
              <div className="decide" style={st('flex-direction: column; align-items: stretch')}>
                <label htmlFor="why" style={st('font-size: 13px; font-weight: 500')}>Why? A reason is kept with the change.</label>
                <textarea id="why" className="fld" rows={2} value={p.draft} onChange={(e) => p.setDraft(e.target.value)} style={st('padding: 8px 10px; resize: vertical; background: #FFFFFF')} />
                <span style={st('display: flex; gap: 8px')}>
                  <button type="button" className="btn btn-dark btn-sm" disabled={p.draft.trim().length < 10 || p.busy} onClick={() => p.onChange(asset.asset_id, code!, !cell.applies, p.draft.trim())}>Save change</button>
                  <button type="button" className="btn btn-line btn-sm" onClick={() => { p.setChanging(false); p.setDraft(''); }}>Cancel</button>
                </span>
              </div>
            )}
          </article>
        )}

        {!p.sel && (
          <>
            <p style={st('margin: 0; padding: 18px 20px; font-size: 13.5px; color: #5F5E5B; border-bottom: 1px solid #E6E4DE')}>Confirm or dispute the assumptions below. Select a row, or double-click a property cell, to see the reasoning and comment.</p>
            <div className="sec"><span>Assumptions</span><span className="n">{asmList.length}</span></div>
            {asmList.map((x) => (
              <AssumptionCard key={x.id} a={x} inList onPick={() => p.assets.some((a) => a.asset_id === x.about) && p.onSelect(keyOf(x.about, null))} onDecide={(d) => p.onAssumption(x, d)} />
            ))}
            {asmList.length === 0 && <p style={st('margin: 0; padding: 4px 20px 12px; font-size: 13px; color: #6B6A66')}>None here.</p>}
          </>
        )}
        {showList && (
          <>
            <div className="sec"><span>{listTitle}</span><span className="n">{listKeys.length}</span></div>
            <div role="list">
              {listKeys.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const [id, k] = splitKey(t.key);
                return (
                  <button key={t.key} type="button" role="listitem" className="trow" onClick={() => p.onSelect(t.key)}>
                    <span style={st('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
                      <span style={st('font-size: 13.5px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>
                        <span className="mono" style={st('font-size: 11.5px; color: #6B6A66; font-weight: 400; margin-right: 6px')}>{id}{k === 'asset' ? '' : `.${k}`}</span>{titleOf(t.key)}
                      </span>
                      <span className="tag t-grey">{t.resolved ? 'Resolved' : 'Comment'}</span>
                    </span>
                    <span style={st('display: block; margin-top: 2px; font-size: 12.5px; color: #6B6A66; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{t.resolved ? 'Resolved' : `${last.author === 'analyst' ? 'You: ' : ''}${last.text}`}</span>
                  </button>
                );
              })}
            </div>
            {listKeys.length === 0 && <p style={st('margin: 0; padding: 4px 20px 16px; font-size: 13px; color: #6B6A66')}>Nothing here.</p>}
          </>
        )}
        <div className="dspacer" aria-hidden="true" />
      </div>

      {asset && p.sel && (
        <div style={st('padding: 12px 16px 14px 20px; border-top: 1px solid #E6E4DE; background: #FFFFFF')}>
          <label htmlFor="reply" style={st('position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)')}>Reply</label>
          <div className="composer">
            <textarea id="reply" ref={reply} rows={2} placeholder="Reply, or ask for a change" value={p.reply} onChange={(e) => p.setReply(e.target.value)} />
            <span style={st('display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 6px 6px 10px')}>
              <button type="button" className="tlink" onClick={() => messages.length && p.onResolve(p.sel!, !resolved)}>{resolved ? 'Reopen' : 'Resolve'}</button>
              <button type="button" className="btn btn-dark btn-sm" disabled={p.reply.trim().length < 2 || p.busy} onClick={() => p.onComment(asset.asset_id, isProp ? code : null, p.reply.trim())}>Comment</button>
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
