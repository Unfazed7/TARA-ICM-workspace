import { useTara } from '@/contexts/TaraContext';
import { TreatmentDecision, getRiskColor, getRiskTextColor, getRiskLabel } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const decisionLabels: Record<TreatmentDecision, string> = {
  avoid: 'Avoid',
  reduce: 'Reduce',
  share: 'Share',
  accept: 'Retain',
};

const decisionColors: Record<TreatmentDecision, string> = {
  avoid: 'text-destructive border-destructive/30',
  reduce: 'text-primary border-primary/30',
  share: 'text-signal-ink border-signal/30',
  accept: 'text-primary border-primary/30',
};

export function CybersecurityGoalsTab() {
  const { threats, assets, treatments, updateTreatment, getRiskForThreat } = useTara();

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Clause 15.9 — Cybersecurity Goals & Claims</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Asset</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Risk</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Risk Decision</div>
            <div className="w-[280px] min-w-[280px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Goals</div>
            <div className="w-[280px] min-w-[280px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Claim</div>
            <div className="w-[280px] min-w-[280px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Control</div>
          </div>

          {/* Rows */}
          {threats.map(threat => {
            const asset = assets.find(a => a.id === threat.linkedAssetId);
            const treatment = treatments.find(t => t.linkedThreatId === threat.id);
            const riskValue = getRiskForThreat(threat.id);
            const riskColor = getRiskColor(riskValue);
            const riskLabel = getRiskLabel(riskValue);
            const decision = treatment?.decision ?? 'reduce';

            return (
              <div key={threat.id} className="flex border-b border-border hover:bg-foreground/[0.02] transition-colors">
                {/* Asset */}
                <div className="w-[200px] min-w-[200px] px-3 py-3">
                  <div className="text-sm text-foreground truncate">{asset?.name ?? '—'}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{asset?.assetId} · {threat.threatId}</div>
                </div>

                {/* Risk */}
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center gap-2">
                  <span
                    className="inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-sm font-semibold font-mono"
                    style={{ background: riskColor, color: getRiskTextColor(riskValue) }}
                  >
                    {riskValue}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">{riskLabel}</span>
                </div>

                {/* Risk Decision */}
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center">
                  <Badge variant="outline" className={cn('text-xs', decisionColors[decision])}>
                    {decisionLabels[decision]}
                  </Badge>
                </div>

                {/* Goals */}
                <div className="w-[280px] min-w-[280px] px-3 py-3">
                  <Input
                    value={treatment?.cybersecurityGoal ?? ''}
                    onChange={e => updateTreatment(threat.id, { cybersecurityGoal: e.target.value })}
                    placeholder="Cybersecurity Goal..."
                    className="h-8 bg-transparent border-transparent hover:border-border focus:border-border text-sm text-foreground"
                  />
                </div>

                {/* Claim */}
                <div className="w-[280px] min-w-[280px] px-3 py-3">
                  <Input
                    value={treatment?.cybersecurityClaim ?? ''}
                    onChange={e => updateTreatment(threat.id, { cybersecurityClaim: e.target.value })}
                    placeholder="Cybersecurity Claim..."
                    className="h-8 bg-transparent border-transparent hover:border-border focus:border-border text-sm text-foreground"
                  />
                </div>

                {/* Control */}
                <div className="w-[280px] min-w-[280px] px-3 py-3">
                  <Input
                    value={treatment?.controls ?? ''}
                    onChange={e => updateTreatment(threat.id, { controls: e.target.value })}
                    placeholder="Control measure..."
                    className="h-8 bg-transparent border-transparent hover:border-border focus:border-border text-sm text-foreground"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
