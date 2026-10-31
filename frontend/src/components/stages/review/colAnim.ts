/**
 * The column toggles of the designs (acoltog): a column folds away while its text stays laid out at its final width,
 * so only the column widths move. Ported from the designs' toggleAssetCol (04, 05) and animCols (06).
 * Under reduced motion the change is applied at once.
 */

import { reducedMotion } from '../assets/whyScroll';

let busy = false;
const later = (f: () => void, ms: number) => setTimeout(f, ms);

/** 04 Impacts and 05 Threats: the asset-name column. The scenario text grows or shrinks to its final width first. */
export function animAssetCol(root: HTMLElement | null, off: boolean, apply: () => void) {
  if (!root || reducedMotion() || busy) { apply(); return; }
  busy = true;
  const spans = [...root.querySelectorAll<HTMLElement>('.scentx')];
  const nameW = root.querySelector<HTMLElement>('th.acol')?.offsetWidth || 128;
  const td0 = spans.length ? spans[0].closest('td') : null;
  const cw = td0 ? td0.clientWidth - 32 : 260;
  const target = Math.max(120, off ? cw + nameW : cw - 128);
  spans.forEach((sp) => { sp.style.width = `${target}px`; });
  apply();
  later(() => { spans.forEach((sp) => { sp.style.width = ''; }); busy = false; }, 460);
}

const CLS: Record<string, string> = { assetColOff: 'acol-off', dcolOff: 'dcol-off', tcolOff: 'tcol-off' };

/** 06 TARA: the asset-name, damage-scenario and threat-scenario columns. */
export function animCols(root: HTMLElement | null, flag: 'assetColOff' | 'dcolOff' | 'tcolOff', on: boolean, apply: () => void) {
  const tbl = root?.querySelector<HTMLElement>('table.assets');
  if (!root || !tbl || reducedMotion() || busy) { apply(); return; }
  busy = true;
  const flex = [...tbl.querySelectorAll<HTMLElement>('tr.sizer th.dsz, tr.sizer th.tsz, tr.sizer th.gsz')];
  const cols: [string, string][] = [['th.dsz', '.dscx'], ['th.tsz', '.scentx']];
  const widths = () => flex.map((th) => th.getBoundingClientRect().width);
  const colWidths = () => cols.map(([th]) => tbl.querySelector(`tr.sizer ${th}`)?.getBoundingClientRect().width ?? 0);
  const was = tbl.className;
  tbl.classList.add('nomo');
  const before = widths();
  tbl.classList.toggle(CLS[flag], on);
  const after = widths();
  const afterC = colWidths();
  tbl.className = `${was} nomo`;
  flex.forEach((th, i) => { th.style.transition = 'none'; th.style.width = `${before[i]}px`; });
  cols.forEach(([, text], i) => tbl.querySelectorAll<HTMLElement>(text).forEach((sp) => { sp.style.width = `${Math.max(60, afterC[i] - 32)}px`; }));
  void tbl.offsetWidth;
  tbl.classList.remove('nomo');
  void tbl.offsetWidth;
  tbl.classList.toggle(CLS[flag], on);
  flex.forEach((th, i) => { th.style.transition = 'width .42s cubic-bezier(.32,.72,0,1)'; th.style.width = `${after[i]}px`; });
  apply();
  later(() => {
    flex.forEach((th) => { th.style.transition = ''; th.style.width = ''; });
    root.querySelectorAll<HTMLElement>('.dscx, .scentx').forEach((sp) => { sp.style.width = ''; });
    busy = false;
  }, 460);
}
