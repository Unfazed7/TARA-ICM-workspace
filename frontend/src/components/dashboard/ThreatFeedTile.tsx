import { useState } from 'react';
import { ThreatScenario } from '@/types/risk-assessment';
const mockThreatScenarios: ThreatScenario[] = [];
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, Target, Crosshair } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const riskColors: Record<string, string> = {
  critical: 'bg-sev-4',
  high: 'bg-sev-3',
  medium: 'bg-sev-2',
};

const riskLabels = ['', 'Low', 'Low', 'Medium', 'High', 'Critical'];

const impactBadge = (level: string) => {
  const colors: Record<string, string> = {
    severe: 'bg-sev-4 text-sev-4-foreground border-transparent',
    major: 'bg-sev-3 text-sev-3-foreground border-transparent',
    moderate: 'bg-sev-2 text-sev-2-foreground border-transparent',
    negligible: 'bg-sev-1 text-sev-1-foreground border-transparent',
  };
  return colors[level] || colors.moderate;
};

export function ThreatFeedTile() {
  const threats = mockThreatScenarios.slice(0, 5);
  const [selectedThreat, setSelectedThreat] = useState<ThreatScenario | null>(null);

  return (
    <>
      <div
        className={cn(
          'bento-tile relative overflow-hidden',
          'col-span-1 md:col-span-1 lg:col-span-1 lg:row-span-2',
          'flex flex-col p-5'
        )}
      >
        {/* Danger ambient light */}
        <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,hsl(38_80%_55%/0.04),transparent_50%)]" />
        </div>

        <div className="relative z-10 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-critical" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Threat Feed
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 flex-1 overflow-y-auto glass-scroll">
          {threats.map((t) => {
            const level = riskLabels[t.riskValue] || 'Medium';
            const colorClass =
              t.riskValue >= 5
                ? riskColors.critical
                : t.riskValue >= 4
                  ? riskColors.high
                  : riskColors.medium;

            return (
              <button
                key={t.id}
                onClick={() => setSelectedThreat(t)}
                className="w-full rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm p-3 flex items-start gap-3 text-left transition-colors hover:bg-primary/5 hover:border-primary/20"
              >
                <span className={cn(
                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                  colorClass,
                  t.riskValue >= 5 ? 'status-dot-critical' : t.riskValue >= 4 ? 'status-dot-warning' : ''
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t.targetAsset} · {level}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Threat Detail Dialog */}
      <Dialog open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <DialogContent className="sm:max-w-md glass-card-premium border-border/30">
          <DialogHeader>
            <DialogTitle className="gradient-text flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {selectedThreat?.name}
            </DialogTitle>
            <DialogDescription>{selectedThreat?.description}</DialogDescription>
          </DialogHeader>

          {selectedThreat && (
            <div className="space-y-4">
              {/* Target & Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border/20 bg-card/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">Target</p>
                  </div>
                  <p className="text-sm font-medium">{selectedThreat.targetAsset}</p>
                </div>
                <div className="p-3 rounded-xl border border-border/20 bg-card/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">Risk Level</p>
                  </div>
                  <p className={cn(
                    'text-sm font-bold',
                    selectedThreat.riskValue >= 5 ? 'text-destructive' :
                      selectedThreat.riskValue >= 4 ? 'text-signal-ink' :
                        selectedThreat.riskValue >= 3 ? 'text-signal-ink' : 'text-primary'
                  )}>
                    {riskLabels[selectedThreat.riskValue] || 'Medium'} ({selectedThreat.riskValue}/5)
                  </p>
                </div>
              </div>

              {/* Impact Levels */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-mono mb-2">Impact Assessment</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['Safety', selectedThreat.impactSafety],
                    ['Financial', selectedThreat.impactFinancial],
                    ['Operational', selectedThreat.impactOperational],
                    ['Privacy', selectedThreat.impactPrivacy],
                  ] as [string, string][]).map(([label, level]) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded-lg border border-border/15 bg-card/10">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', impactBadge(level))}>
                        {level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feasibility */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-mono mb-2">Feasibility Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(selectedThreat.feasibilityScore / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-bold">{selectedThreat.feasibilityScore}/5</span>
                </div>
              </div>

              {/* Cybersecurity Goal */}
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-[10px] text-primary uppercase font-mono mb-1">Cybersecurity Goal</p>
                <p className="text-xs text-foreground">{selectedThreat.cybersecurityGoal}</p>
              </div>

              {/* Treatment */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/20 pt-3">
                <span>Treatment: <span className="capitalize font-medium text-foreground">{selectedThreat.treatmentDecision}</span></span>
                <span>Review: <span className="capitalize font-medium text-foreground">{selectedThreat.reviewStatus}</span></span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
