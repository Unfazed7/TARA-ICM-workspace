/**
 * Shared shell for the stage screens (D-51, spec 24): the floating pill top bar and the one-row
 * page header. Colour marks state only; the bar itself is neutral.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMotionPreset } from '@/lib/motion';
import { cn } from '@/lib/utils';

export type ShellStage = { key: string; label: string; ready: boolean; note?: string; tone?: 'blue' | 'yellow' | 'grey' };

type TopBarProps = {
  stages: ShellStage[];
  current: string;
  onStage: (key: string) => void;
  needCount: number;
  assumptionsOpen: boolean;
  onAssumptions: () => void;
  onSettings: () => void;
  /** Short description of the assessment, shown in the menu. */
  description?: string;
  /** When set, the Assumptions button is off and this plain sentence says why. */
  assumptionsDisabled?: string;
};

export function StageTopBar({ stages, current, onStage, needCount, assumptionsOpen, onAssumptions, onSettings, description, assumptionsDisabled }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { easeOut, riseList, riseItem } = useMotionPreset();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const ready = stages.filter((s) => s.ready);

  return (
    <>
      <div className="pointer-events-none sticky top-0 z-30 flex justify-center px-4 pt-4">
        <nav
          aria-label="Assessment"
          className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full bg-card/80 p-1.5 shadow-[0_0_0_1px_hsl(40_6%_10%/0.08),0_18px_40px_-22px_hsl(40_6%_10%/0.28),inset_0_1px_1px_hsl(0_0%_100%/0.9)] backdrop-blur-xl backdrop-saturate-150"
        >
          <Link to="/dashboard" aria-label="Aegis, back to the dashboard" className="flex items-center gap-2 whitespace-nowrap rounded-full py-1 pl-1.5 pr-3 text-sm font-semibold text-foreground no-underline">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-primary-foreground" aria-hidden="true">
              <Shield className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            Aegis
          </Link>
          <div className="hidden gap-0.5 rounded-full bg-foreground/5 p-[3px] sm:flex" role="tablist" aria-label="Stages">
            {ready.map((s) => {
              const on = s.key === current;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onStage(s.key)}
                  className={cn(
                    'relative flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13.5px] transition-colors',
                    on ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {on && <motion.span layoutId="stage-tab" transition={easeOut} className="aegis-tab-active absolute inset-0 rounded-full" aria-hidden="true" />}
                  <span className={cn('aegis-mono relative text-[11px]', on && 'text-state-blue-foreground')}>{s.key}</span>
                  <span className="relative">{s.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-expanded={assumptionsOpen}
            disabled={Boolean(assumptionsDisabled)}
            title={assumptionsDisabled}
            onClick={onAssumptions}
            className={cn(
              'flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
              assumptionsDisabled
                ? 'cursor-not-allowed text-muted-foreground opacity-60'
                : assumptionsOpen ? 'bg-foreground text-primary-foreground' : 'text-foreground hover:bg-foreground/5',
            )}
          >
            Assumptions
            {needCount > 0 && (
              <span className="aegis-signal-pill flex items-center gap-1.5 px-2 py-0.5 text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-state-yellow-foreground motion-reduce:animate-none" aria-hidden="true" />
                {needCount} need you
              </span>
            )}
          </button>
          <button type="button" aria-label="Settings: what I read" onClick={onSettings} className="flex h-9 w-10 items-center justify-center rounded-full text-foreground hover:bg-foreground/5">
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            ref={menuButton}
            type="button"
            aria-label={menuOpen ? 'Close the menu' : 'Open the menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative h-10 w-10 shrink-0 rounded-full bg-foreground/5"
          >
            <span className={cn('absolute left-[13px] h-[1.5px] w-3.5 rounded bg-foreground transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)]', menuOpen ? 'top-[19px] rotate-45' : 'top-[16px]')} />
            <span className={cn('absolute left-[13px] h-[1.5px] w-3.5 rounded bg-foreground transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)]', menuOpen ? 'top-[19px] -rotate-45' : 'top-[22px]')} />
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-20 overflow-y-auto bg-background/85 backdrop-blur-2xl"
          >
            <motion.div variants={riseList} initial="hidden" animate="show" className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-12 px-[clamp(16px,5vw,64px)] pb-16 pt-[130px]">
              <ol className="m-0 flex list-none flex-col border-t border-border p-0">
                {stages.map((s) => (
                  <motion.li key={s.key} variants={riseItem}>
                    <button
                      type="button"
                      disabled={!s.ready}
                      onClick={() => {
                        onStage(s.key);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-4 border-b border-border py-3.5 text-left text-[clamp(24px,3vw,34px)] font-semibold leading-tight tracking-[-0.03em] disabled:cursor-not-allowed disabled:text-[#B5B4AF]"
                    >
                      <span className="aegis-mono w-7 text-[13px] text-[#8E8D89]">{s.key}</span>
                      <span className="flex-1">{s.label}</span>
                      {s.note && <Badge variant={s.tone ?? 'grey'}>{s.note}</Badge>}
                    </button>
                  </motion.li>
                ))}
              </ol>
              <motion.div variants={riseItem} className="flex flex-col gap-3.5 self-end">
                <Badge variant="blue" className="self-start">Assessment</Badge>
                {description && <p className="m-0 line-clamp-3 max-w-[36ch] text-[15px] text-[#5F5E5B]">{description}</p>}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSettings();
                  }}
                  className="inline-flex min-h-10 items-center self-start rounded-[10px] border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent active:scale-[0.98]"
                >
                  What I read
                </button>
                <Link to="/dashboard" className="inline-flex min-h-10 items-center self-start rounded-[10px] border border-border bg-card px-3.5 text-sm font-medium text-foreground no-underline hover:bg-accent">
                  Back to the dashboard
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type PageHeaderProps = { project: string; title: string; right?: ReactNode; below?: ReactNode };

/** One-row page header: project / page title on the left, status on the right. */
export function PageHeader({ project, title, right, below }: PageHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <nav aria-label="Breadcrumb" className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
            <Link to="/dashboard" className="text-inherit no-underline hover:text-foreground">
              {project}
            </Link>
            <span aria-hidden="true">/</span>
          </nav>
          <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight">{title}</h1>
        </div>
        {right && <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">{right}</div>}
      </div>
      {below}
    </div>
  );
}

/** Small status dot used in page headers. */
export function StatusDot({ tone }: { tone: 'green' | 'yellow' | 'blue' | 'red' }) {
  const bg = { green: 'bg-state-green-foreground', yellow: 'bg-state-yellow-edge', blue: 'bg-state-blue-foreground', red: 'bg-state-red-foreground' }[tone];
  return <span className={cn('inline-block h-[7px] w-[7px] rounded-full', bg)} aria-hidden="true" />;
}
