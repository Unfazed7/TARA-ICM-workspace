import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DECISION_STYLE: Record<string, string> = {
  reduce: 'bg-primary/20 text-primary',
  accept: 'bg-primary/20 text-primary',
  share:  'bg-muted text-foreground',
  avoid:  'bg-destructive/20 text-destructive',
};

const RISK_LEVEL_STYLE = (v: number) => {
  if (v >= 4) return 'text-destructive';
  if (v >= 3) return 'text-signal-ink';
  if (v >= 2) return 'text-signal-ink';
  return 'text-primary';
};

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">7</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No risk treatment data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 07 — Risk Treatment is running…'
            : 'Run Stage 06 (Risk Scoring) then Stage 07 (Risk Treatment) from the pipeline panel above.'}
        </p>
      </div>
    </div>
  );
}

export function RiskTreatmentTab() {
  const { treatments, threats, assets, stageStatuses } = useTara();
  const status = stageStatuses['07'] ?? 'not_started';

  if (treatments.length === 0) return <EmptyState status={status} />;

  const threatById = new Map(threats.map((t) => [t.id, t]));
  const assetById  = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Clause 15.8 & 15.9 — Risk Treatment</p>
        <Badge variant="default" className="text-xs">{treatments.length} treatments</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">ID</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Asset / Threat</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Decision</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Residual</div>
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Controls</div>
            <div className="flex-1 min-w-[300px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Goal / Claim</div>
          </div>

          {treatments.map((t) => {
            const threat = threatById.get(t.linkedThreatId);
            const asset  = threat ? assetById.get(threat.linkedAssetId) : undefined;
            const decisionClass = DECISION_STYLE[t.decision] ?? 'bg-muted-foreground/20 text-muted-foreground';
            return (
              <div key={t.id} className="flex border-b border-border hover:bg-foreground/[0.02] transition-colors">
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-start pt-3.5">
                  <span className="text-xs font-mono text-primary">{t.id}</span>
                </div>
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{asset?.assetId ?? '—'}</p>
                  <p className="text-xs text-foreground truncate mt-0.5">{asset?.name ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{threat?.threatId ?? t.linkedThreatId}</p>
                </div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-start pt-3.5">
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-medium capitalize', decisionClass)}>
                    {t.decision}
                  </span>
                </div>
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-start pt-3.5">
                  <span className={cn('text-sm font-bold font-mono', RISK_LEVEL_STYLE(t.residualRisk))}>
                    {t.residualRisk}
                  </span>
                </div>
                <div className="w-[200px] min-w-[200px] px-3 py-3">
                  <p className="text-xs font-mono text-muted-foreground">{t.controls || '—'}</p>
                </div>
                <div className="flex-1 min-w-[300px] px-3 py-3">
                  {t.cybersecurityGoal && (
                    <p className="text-xs text-foreground leading-relaxed mb-1">
                      <span className="text-[10px] font-mono text-primary/70 mr-1">Goal:</span>
                      {t.cybersecurityGoal}
                    </p>
                  )}
                  {t.cybersecurityClaim && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-[10px] font-mono text-muted-foreground mr-1">Claim:</span>
                      {t.cybersecurityClaim}
                    </p>
                  )}
                  {!t.cybersecurityGoal && !t.cybersecurityClaim && <span className="text-xs text-muted-foreground/70">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
