/** The asset table of the 03 Assets design: family bands, six property columns, marks you can tick. */

import type { MouseEvent } from 'react';
import type { Asset, PropertyCode } from '@/types/stages';
import { keyOf, PROPS, st } from './constants';

export interface TableProps {
  families: { code: string; name: string }[];
  rows: Asset[];
  compact: boolean;
  collapsed: Record<string, boolean>;
  openDesc: Record<string, boolean>;
  sel: string | null;
  hasNote: (key: string) => boolean; // an open comment or Assumption on this cell or asset
  onBand: (code: string) => void;
  onDesc: (assetId: string) => void;
  onPickRow: (assetId: string) => void;
  onDblRow: (assetId: string) => void;
  onPickCell: (assetId: string, property: PropertyCode) => void;
  onDblCell: (assetId: string, property: PropertyCode) => void;
  onToggle: (assetId: string, property: PropertyCode, applies: boolean, event: MouseEvent) => void;
}

const Tick = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="tickp" d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export function AssetTable(p: TableProps) {
  const lines: React.ReactNode[] = [];
  let rn = 0;
  for (const family of p.families) {
    const rows = p.rows.filter((a) => a.family === family.code);
    if (!rows.length) continue;
    const closed = Boolean(p.collapsed[family.code]);
    lines.push(
      <tr className="band" key={`band-${family.code}`}>
        <td colSpan={10}>
          <button type="button" className="bandbtn" aria-expanded={!closed} onClick={() => p.onBand(family.code)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="fcode">{family.code}</span>
            {family.name}
            <span className="fcount">{rows.length + (rows.length === 1 ? ' asset' : ' assets')}</span>
          </button>
        </td>
      </tr>,
    );
    if (closed) continue;
    rows.forEach((a, ri) => {
      const even = ri % 2 === 1;
      const n = Math.min(rn++, 24);
      const rowSel = p.sel === keyOf(a.asset_id, null);
      const bg = rowSel ? '#F4FAFE' : even ? '#FAF9F6' : '#FFFFFF';
      const long = a.description.length > 120;
      const open = Boolean(p.openDesc[a.asset_id]);
      const removed = a.status === 'removed';
      lines.push(
        <tr className="row" key={a.asset_id} style={{ ...st(`--r: ${n}`), ...(removed ? { opacity: 0.55 } : {}) }}>
          <td style={st(`background: ${bg}${rowSel ? '; box-shadow: inset 3px 0 0 #1F6C9F' : ''}`)}>
            <button type="button" className="cell mono" onClick={() => p.onPickRow(a.asset_id)} onDoubleClick={(e) => { e.preventDefault(); p.onDblRow(a.asset_id); }} aria-label={`${a.asset_id} ${a.name}, open comments`} style={st('font-size: 12.5px; color: #6B6A66; white-space: nowrap; text-align: center')}>{a.asset_id}</button>
          </td>
          <td style={st(`background: ${bg}`)}>
            <button type="button" className="cell" onClick={() => p.onPickRow(a.asset_id)} onDoubleClick={(e) => { e.preventDefault(); p.onDblRow(a.asset_id); }} style={st('font-size: 13.5px; font-weight: 500; line-height: 1.35; text-align: center')}>{a.name}</button>
          </td>
          <td style={st(`background: ${bg}`)}>
            <button type="button" className="cell" tabIndex={-1} onClick={() => p.onPickRow(a.asset_id)} onDoubleClick={(e) => { e.preventDefault(); p.onDblRow(a.asset_id); }} style={st('font-size: 13px; color: #5F5E5B; line-height: 1.35; text-align: center')}>
              {a.type_label}
              {a.interface && <span className="tag t-grey" style={st('font-size: 10px; padding: 1px 7px; margin: 4px auto 0; display: table')}>Interface</span>}
              {removed && <span className="tag t-grey" style={st('font-size: 10px; padding: 1px 7px; margin: 4px auto 0; display: table')}>Removed</span>}
            </button>
          </td>
          <td style={st(`background: ${bg}`)}>
            <button type="button" className="cell" tabIndex={-1} onClick={() => p.onPickRow(a.asset_id)} onDoubleClick={(e) => { e.preventDefault(); p.onDblRow(a.asset_id); }} style={st('color: #1c1b19')}>
              <span className={open ? 'fadein' : 'clamp'}>{a.description}</span>
            </button>
            {long && (
              <button type="button" className="tlink" onClick={() => p.onDesc(a.asset_id)} aria-expanded={open} style={st('display: block; margin: 0 18px 10px; padding: 0; font-size: 12.5px')}>
                {open ? 'Show less' : 'Show more'}
              </button>
            )}
          </td>
          {PROPS.map((prop, i) => {
            const v = a.properties[prop.k];
            const key = keyOf(a.asset_id, prop.k);
            const on = p.sel === key;
            const fill = v.applies ? 'background: #6F6B63; border: 1.5px solid #6F6B63' : v.reviewed ? 'border: 1.5px solid #B9B7B0; background: #FFFFFF' : 'border: 1.5px dashed #B9B7B0; background: #FFFFFF';
            return (
              <td key={prop.k} className={`k${i}`} style={st(`width: 100px; background: ${on ? '#FFFFFF' : even ? '#F3F1EC' : '#F7F6F2'}${i === 0 ? '; box-shadow: inset 1px 0 0 #DAD8D1' : ''}`)}>
                <div
                  className={on ? 'pcell sel' : 'pcell'}
                  onClick={() => p.onPickCell(a.asset_id, prop.k)}
                  onDoubleClick={(e) => { e.preventDefault(); p.onDblCell(a.asset_id, prop.k); }}
                  title="Double-click to comment"
                  style={st(`--pc: ${prop.t}`)}
                >
                  <button
                    type="button"
                    className={v.applies ? 'mark on' : 'mark'}
                    onClick={(e) => p.onToggle(a.asset_id, prop.k, v.applies, e)}
                    aria-pressed={v.applies}
                    aria-label={`${prop.name} for ${a.asset_id}: ${v.applies ? 'applies' : 'does not apply'}${v.reviewed ? '' : ', proposed'}. Double-click to comment.`}
                    title={`${prop.name}${v.applies ? ' applies. Click to untick.' : ' does not apply. Click to tick.'} Double-click to comment.`}
                    style={{ ...st(`--pc: ${prop.t}; ${fill}`), ...(v.applies && !v.reviewed ? { opacity: 0.42 } : {}) }}
                  >
                    {v.applies && <Tick />}
                  </button>
                  {p.hasNote(key) && <span className="pdot" aria-hidden="true" />}
                </div>
              </td>
            );
          })}
        </tr>,
      );
    });
  }
  return (
    <table className={p.compact ? 'assets compact' : 'assets'}>
      <thead>
        <tr>
          <th style={st('width: 76px; text-align: center')}>Asset ID</th>
          <th style={st('text-align: center')}>Asset</th>
          <th style={st('width: 116px; text-align: center')}>Asset type</th>
          <th style={st('text-align: center; padding-left: 18px')}>Description</th>
          {PROPS.map((prop, i) => (
            <th key={prop.k} className={`pc k${i}`} title={prop.name} style={st(`width: 100px; background: #E6E2D9; color: #2F2E2B; font-weight: 600; --pc: ${prop.t}${i === 0 ? '; box-shadow: inset 1px 0 0 #C9C4B9' : ''}`)}>
              {prop.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{lines}</tbody>
    </table>
  );
}
