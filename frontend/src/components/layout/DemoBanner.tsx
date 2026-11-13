/**
 * The slim line shown inside the demo TARA (D-67). Blue is the "information" state colour (D-51). The screens that fill
 * the window (03 to 06) read its height from `--preview-banner`, so they still end at the bottom edge.
 */

import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { AI_OFF_NOTE } from '@/lib/preview';

export function DemoBanner({ aiOff }: { aiOff: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--preview-banner', `${el.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--preview-banner');
    };
  }, []);

  return (
    <div ref={ref} className="relative z-10 flex justify-center px-4 pt-2.5">
      <p role="note" aria-label="Demo" className="m-0 flex max-w-full items-start gap-2 rounded-xl border border-state-blue-border bg-state-blue px-3.5 py-1.5 text-[13px] leading-snug text-state-blue-foreground">
        <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          <b className="font-semibold">This is a demo.</b> Your changes last until you log out.{aiOff && ` ${AI_OFF_NOTE}.`}
        </span>
      </p>
    </div>
  );
}
