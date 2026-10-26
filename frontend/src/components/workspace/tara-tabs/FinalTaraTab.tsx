import { useTara } from '@/contexts/TaraContext';
import { getRiskColor, getRiskTextColor, getFeasibilityLevel, ImpactLevel, impactToNumber } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const impactLabelMap: Record<number, { label: string; className: string }> = {
  1: { label: 'Negligible', className: 'aegis-sev-1' },
  2: { label: 'Moderate', className: 'aegis-sev-2' },
  3: { label: 'Major', className: 'aegis-sev-3' },
  4: { label: 'Severe', className: 'aegis-sev-4' },
};

export function FinalTaraTab() {
  const { threats, assets, impacts, attackPaths, feasibilities, treatments, getRiskForThreat } = useTara();

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="px-4 py-3 border-b border-border/30 sticky top-0 z-20 bg-background">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          Final TARA Summary — Consolidated View (Clauses 15.3–15.9)
        </p>
      </div>

      <div className="min-w-max">
        {/* Header */}
        <div className="flex bg-card border-b border-border/30 sticky top-[41px] z-10">
          <div className="w-[80px] min-w-[80px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Threat</div>
          <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Asset / Scenario</div>
          <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium text-center">Final Impact</div>
          <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium text-center">Feasibility</div>
          <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium text-center">Risk Score</div>
          <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium text-center">Treatment</div>
          <div className="w-[240px] min-w-[240px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Controls</div>
          <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium text-center">Residual Risk</div>
          <div className="w-[240px] min-w-[240px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Goals</div>
        </div>

        {/* Rows */}
        {threats.map((threat) => {
          const asset = assets.find(a => a.id === threat.linkedAssetId);
          const impact = impacts.find(i => i.linkedAssetId === threat.linkedAssetId);
          const ap = attackPaths.find(a => a.linkedThreatId === threat.id);
          const feas = ap ? feasibilities.find(f => f.linkedAttackPathId === ap.id) : undefined;
          const feasLevel = feas ? getFeasibilityLevel(feas.factors) : 'N/A';
          const treatment = treatments.find(t => t.linkedThreatId === threat.id);
          const riskValue = getRiskForThreat(threat.id);
          const riskColor = getRiskColor(riskValue);
          const residualRisk = treatment?.residualRisk ?? 1;
          const residualColor = getRiskColor(residualRisk);

          const maxImpact = impact ? Math.max(
            impactToNumber(impact.safety),
            impactToNumber(impact.financial),
            impactToNumber(impact.operational),
            impactToNumber(impact.privacy)
          ) : 1;
          const impactInfo = impactLabelMap[maxImpact] ?? impactLabelMap[1];

          return (
            <div key={threat.id} className="flex border-b border-border/20 hover:bg-muted/5 transition-colors">
              <div className="w-[80px] min-w-[80px] px-3 py-3 flex items-center">
                <span className="text-sm font-mono text-primary font-medium">{threat.threatId}</span>
              </div>
              <div className="w-[200px] min-w-[200px] px-3 py-3">
                <div className="text-sm text-foreground font-medium truncate">{asset?.name ?? '—'}</div>
                <div className="text-[11px] text-muted-foreground truncate">{threat.scenario.slice(0, 55)}</div>
              </div>
              <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center justify-center">
                <span className={cn('rounded px-[7px] py-0.5 text-[11px] font-bold', impactInfo.className)}>{impactInfo.label}</span>
              </div>
              <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center justify-center">
                <Badge variant="outline" className="text-xs font-mono capitalize border-border/50">{feasLevel}</Badge>
              </div>
              <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center justify-center">
                <span className="inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-sm font-semibold font-mono" style={{ background: riskColor, color: getRiskTextColor(riskValue) }}>{riskValue}</span>
              </div>
              <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center justify-center">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono uppercase border-border/50',
                    treatment?.decision === 'reduce' && 'text-primary border-primary/30',
                    treatment?.decision === 'avoid' && 'text-destructive border-destructive/30',
                    treatment?.decision === 'share' && 'text-signal-ink border-sev-3/30',
                    treatment?.decision === 'accept' && 'text-primary border-primary/30',
                  )}
                >
                  {treatment?.decision ?? '—'}
                </Badge>
              </div>
              <div className="w-[240px] min-w-[240px] px-3 py-3 flex items-center">
                <span className="text-xs text-muted-foreground truncate">{treatment?.controls || '—'}</span>
              </div>
              <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center justify-center">
                <span className="inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-sm font-semibold font-mono" style={{ background: residualColor, color: getRiskTextColor(residualRisk) }}>{residualRisk}</span>
              </div>
              <div className="w-[240px] min-w-[240px] px-3 py-3 flex items-center">
                <span className="text-xs text-muted-foreground truncate">
                  {treatment?.cybersecurityGoal || treatment?.cybersecurityClaim || '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
