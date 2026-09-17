import { useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CardDeckProps {
  steps: { id: string; title: string; icon: React.ElementType; content: ReactNode }[];
  canAdvance: boolean[];
  onComplete: () => void;
  onStepChange?: (step: number) => void;
  heading?: string;
}

type AnimationState = 'idle' | 'swipe-left' | 'swipe-right';

export function CardDeck({ steps, canAdvance, onComplete, onStepChange, heading }: CardDeckProps) {
  const [current, setCurrent] = useState(0);
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  // When true, the incoming card is at its start position (no transition yet)
  const [incomingReady, setIncomingReady] = useState(false);

  const isLast = current === steps.length - 1;

  const handleNext = useCallback(() => {
    if (animState !== 'idle') return;
    if (isLast) { onComplete(); return; }
    const next = current + 1;
    setExitingIndex(current);
    setIncomingIndex(next);
    setAnimState('swipe-left');
    setCurrent(next);
    onStepChange?.(next);
    setIncomingReady(true);
    setTimeout(() => {
      setExitingIndex(null);
      setIncomingIndex(null);
      setIncomingReady(false);
      setAnimState('idle');
    }, 500);
  }, [animState, current, isLast, onComplete]);

  const handleBack = useCallback(() => {
    if (animState !== 'idle' || current === 0) return;
    const prev = current - 1;
    setExitingIndex(current);
    setIncomingIndex(prev);
    setAnimState('swipe-right');
    setCurrent(prev);
    onStepChange?.(prev);
    setIncomingReady(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIncomingReady(true);
      });
    });
    setTimeout(() => {
      setExitingIndex(null);
      setIncomingIndex(null);
      setIncomingReady(false);
      setAnimState('idle');
    }, 500);
  }, [animState, current]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto flex-1 min-h-0 pb-6">
      {/* Orb breathing animation */}
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.04); }
        }
      `}</style>
      {/* Single centered orb with smudge */}
      <div
        className="pointer-events-none absolute left-1/2"
        style={{
          top: '-30%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(100,60,220,0.85) 0%, rgba(50,100,255,0.8) 40%, rgba(40,160,255,0.7) 70%, rgba(60,200,240,0.6) 100%)',
          boxShadow: '0 0 80px 20px rgba(50,100,255,0.15), 0 0 160px 60px rgba(40,80,200,0.08)',
          filter: 'blur(30px)',
          animation: 'orb-breathe 8s ease-in-out infinite',
        }}
      />

      {/* Heading */}
      {heading && (
        <h1 className="text-2xl font-bold tracking-tight mb-6 text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] relative z-10 text-center">
          {heading}
        </h1>
      )}

      {/* Deck area */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 22rem)' }}>
        {steps.map((step, i) => {
          const isExiting = exitingIndex === i;
          const isIncoming = incomingIndex === i && !isExiting;
          const isHero = i === current && !isExiting;
          const isBehind = i > current && !isExiting && !isIncoming;
          const isPast = i < current && !isExiting && !isIncoming;

          if (isPast) return null;

          const stackOffset = isBehind ? i - current : 0;
          const maxVisible = 3;
          if (isBehind && stackOffset > maxVisible) return null;

          let transform = '';
          let opacity = 1;
          let zIndex = steps.length - i;
          let boxShadow = 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.4)';
          let transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.45s ease-out';

          if (isHero) {
            transform = 'translateX(0) rotate(0deg) scale(1)';
            zIndex = steps.length + 1;
          } else if (isBehind) {
            const tx = stackOffset * 25;
            const rot = stackOffset * 3;
            const s = 1 - stackOffset * 0.04;
            transform = `translateX(${tx}px) rotate(${rot}deg) scale(${s})`;
            opacity = 1 - stackOffset * 0.2;
          }

          // Incoming card during back: slides in from left, ON TOP of current
          if (isIncoming && animState === 'swipe-right') {
            zIndex = steps.length + 3;
            if (!incomingReady) {
              transform = 'translateX(-110%) rotate(-6deg) scale(0.95)';
              opacity = 0;
              transition = 'none';
              boxShadow = 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.4)';
            } else {
              transform = 'translateX(0) rotate(0deg) scale(1)';
              opacity = 1;
              boxShadow = 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.4), -30px 0 60px -10px rgba(0,0,0,0.5)';
            }
          }

          // Exiting card flies out (forward/next)
          if (isExiting && animState === 'swipe-left') {
            transform = 'translateX(-120%) rotate(-8deg) scale(0.92)';
            opacity = 0;
            zIndex = steps.length + 2;
            transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out';
          }
          // Exiting card during back: stays in place, fades underneath
          if (isExiting && animState === 'swipe-right') {
            transform = 'translateX(0) rotate(0deg) scale(0.96)';
            opacity = 0.3;
            zIndex = steps.length + 1;
            transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s ease-out';
          }

          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "absolute inset-0 rounded-2xl p-6 sm:p-8 overflow-hidden",
                isExiting || isBehind ? "pointer-events-none" : ""
              )}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isHero ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow,
                transform,
                opacity,
                zIndex,
                transformOrigin: 'bottom center',
                transition,
              }}
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-mono block" style={{ color: 'hsl(210, 40%, 98%)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-base font-semibold tracking-tight">{step.title}</h2>
                </div>
              </div>

              {/* Card content */}
              <div className="relative z-10 overflow-y-auto" style={{ maxHeight: 'calc(100% - 4rem)' }}>
                {step.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - above deck */}
      <div className="flex items-center justify-between w-full pt-10 relative z-50">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={current === 0 || animState !== 'idle'}
          className="gap-1.5 text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <span className="text-xs font-mono tabular-nums" style={{ color: 'hsl(210, 40%, 98%)' }}>
          Step {current + 1} of {steps.length}
        </span>

        <Button
          onClick={handleNext}
          disabled={!canAdvance[current] || animState !== 'idle'}
          className="gap-1.5 px-6 shadow-lg shadow-primary/10"
        >
          {isLast ? 'Create Project' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
