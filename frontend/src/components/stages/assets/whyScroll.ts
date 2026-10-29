/**
 * The side panel's "why" box animations of the design (morphWhy, holdScroll, revealWhy), ported to take the
 * panel's root element. They keep the scroll position steady while a box opens, switches or closes.
 * Skipped under reduced motion.
 */

type ScrollEl = HTMLElement & { _holding?: boolean; _fitBound?: boolean; _pre?: number | null };

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const raf = (f: () => void) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(f) : setTimeout(f, 16));

export function morphWhy(root: HTMLElement | null) {
  if (!root || reducedMotion()) return;
  const inn = root.querySelector<HTMLElement>('.whyin');
  const sc = root.querySelector<ScrollEl>('.dscroll');
  const sp = root.querySelector<HTMLElement>('.dspacer');
  if (!inn || !sc || !sp) return;
  const h0 = inn.offsetHeight;
  const st = sc.scrollTop;
  const base = sc.scrollHeight - sp.offsetHeight;
  sc._holding = true;
  sp.style.height = `${sp.offsetHeight + h0}px`;
  inn.style.height = `${h0}px`;
  raf(() => {
    const box = inn.querySelector<HTMLElement>('.propwhy');
    const h1 = box ? box.offsetHeight + parseFloat(getComputedStyle(box).marginTop) + parseFloat(getComputedStyle(box).marginBottom) : h0;
    void inn.offsetHeight;
    inn.style.transition = 'height .3s cubic-bezier(.32,.72,0,1)';
    inn.style.height = `${h1}px`;
    const to = Math.max(0, Math.min(st, base - h0 + h1 - sc.clientHeight));
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / 300);
      const e = 1 - Math.pow(1 - k, 3);
      if (to < st) sc.scrollTop = st + (to - st) * e;
      if (k < 1) raf(step);
      else {
        inn.style.transition = '';
        inn.style.height = '';
        sc._holding = false;
        const need = sc.scrollTop + sc.clientHeight - (sc.scrollHeight - sp.offsetHeight);
        sp.style.height = `${Math.max(0, Math.ceil(need))}px`;
      }
    };
    raf(step);
  });
}

export function holdScroll(root: HTMLElement | null) {
  if (!root || reducedMotion()) return;
  const sc = root.querySelector<ScrollEl>('.dscroll');
  const sp = root.querySelector<HTMLElement>('.dspacer');
  const w = root.querySelector<HTMLElement>('.whywrap');
  if (!sc || !sp) return;
  const fit = () => {
    if (sc._holding) return;
    const h = sp.offsetHeight;
    const need = sc.scrollTop + sc.clientHeight - (sc.scrollHeight - h);
    sp.style.height = `${Math.max(0, Math.ceil(need))}px`;
  };
  if (!sc._fitBound) {
    sc.addEventListener('scroll', fit, { passive: true });
    sc._fitBound = true;
  }
  const from = sc.scrollTop;
  const wh = w ? w.offsetHeight : 0;
  const to = Math.max(0, Math.min(from, sc.scrollHeight - sp.offsetHeight - wh - sc.clientHeight, typeof sc._pre === 'number' ? sc._pre : Infinity));
  sc._pre = null;
  sc._holding = true;
  sp.style.height = `${sp.offsetHeight + wh}px`;
  const t0 = Date.now();
  const D = 300;
  const keep = () => {
    const k = Math.min(1, (Date.now() - t0) / D);
    const e = 1 - Math.pow(1 - k, 3);
    sc.scrollTop = from + (to - from) * e;
    if (k < 1 || Date.now() - t0 < 340) raf(keep);
    else {
      sc._holding = false;
      fit();
    }
  };
  raf(keep);
}

/** Remember where the panel was scrolled to before a box opens, so closing it can return there. */
export function rememberScroll(root: HTMLElement | null) {
  const sc = root?.querySelector<ScrollEl>('.dscroll');
  if (sc) sc._pre = sc.scrollTop;
}

export function revealWhy(root: HTMLElement | null, n = 0) {
  if (!root || reducedMotion()) return;
  raf(() => {
    const w = root.querySelector<HTMLElement>('.whywrap.open');
    if (!w) {
      if (n < 20) revealWhy(root, n + 1);
      return;
    }
    const sc = root.querySelector<HTMLElement>('.dscroll');
    if (!sc) return;
    const box = w.querySelector<HTMLElement>('.propwhy');
    const t0 = Date.now();
    const step = () => {
      const need = w.getBoundingClientRect().top + (box ? box.offsetHeight + 14 : 0) + 16 - sc.getBoundingClientRect().bottom;
      if (need > 0.5) sc.scrollTop = sc.scrollTop + Math.max(1, need * 0.22);
      if (Date.now() - t0 < 700 && w.classList.contains('open')) raf(step);
    };
    raf(step);
  });
}
