import { Badge } from '@/components/ui/badge';
import { useTara } from '@/contexts/TaraContext';
import { cn } from '@/lib/utils';

const LEVEL_STYLE: Record<string, string> = {
  critical: 'border-transparent bg-sev-4 text-sev-4-foreground',
  high: 'border-transparent bg-sev-3 text-sev-3-foreground',
  medium: 'border-transparent bg-sev-2 text-sev-2-foreground',
  low: 'border-transparent bg-sev-1 text-sev-1-foreground',
  informational: 'border-border bg-muted text-muted-foreground',
};

function EmptyState({ status }: { status: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">8</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No risk scores available</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {status === 'running' || status === 'pending'
            ? 'Stage 08 — Risk Scoring is running…'
            : status === 'complete'
              ? 'Stage 08 completed, but its output did not contain any risk records.'
              : 'Run Stage 08 — Risk Scoring from the pipeline panel above.'}
        </p>
      </div>
    </div>
  );
}

export function RiskScoringTab() {
  const { riskScores, threats, assets, stageStatuses } = useTara();
  const status = stageStatuses['08'] ?? 'not_started';

  if (riskScores.length === 0) return <EmptyState status={status} />;

  const threatById = new Map(threats.map((threat) => [threat.threatId, threat]));
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Clause 15.8 — Risk Scoring (Impact × Attack Feasibility)
        </p>
        <Badge variant="default" className="text-xs">{riskScores.length} risks</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="stage-result-table min-w-[1010px]">
          <div className="stage-result-header sticky top-0 z-10 border-b border-border bg-muted">
            <div className="w-[70px] min-w-[70px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Rank</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Risk ID</div>
            <div className="w-[210px] min-w-[210px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Asset / Threat</div>
            <div className="w-[130px] min-w-[130px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Attack Path</div>
            <div className="w-[160px] min-w-[160px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Impact</div>
            <div className="w-[150px] min-w-[150px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">AFR</div>
            <div className="w-[90px] min-w-[90px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Level</div>
          </div>

          {riskScores.map((risk) => {
            const threat = threatById.get(risk.threatId);
            const asset = assetById.get(risk.assetId);
            return (
              <div key={risk.id} className="stage-result-row border-b border-border even:bg-muted/40">
                <div className="w-[70px] min-w-[70px] px-3 py-3 font-mono text-sm font-semibold">#{risk.rank}</div>
                <div className="w-[100px] min-w-[100px] px-3 py-3 font-mono text-xs text-primary">{risk.id}</div>
                <div className="w-[210px] min-w-[210px] px-3 py-3 text-xs">
                  <p className="break-words font-medium text-foreground">{asset?.name ?? risk.assetId}</p>
                  <p className="mt-1 break-words font-mono text-muted-foreground">{risk.assetId} · {risk.threatId}</p>
                  {threat?.scenario && <p className="mt-1 break-words leading-relaxed text-muted-foreground">{threat.scenario}</p>}
                </div>
                <div className="w-[130px] min-w-[130px] px-3 py-3 font-mono text-xs text-muted-foreground">{risk.attackId}</div>
                <div className="w-[160px] min-w-[160px] px-3 py-3 text-xs">
                  <p className="font-medium">{risk.impactLabel}</p>
                  <p className="mt-1 font-mono text-muted-foreground">Value {risk.impactValue}</p>
                </div>
                <div className="w-[150px] min-w-[150px] px-3 py-3 text-xs">
                  <p className="font-medium capitalize">{risk.afrLabel}</p>
                  <p className="mt-1 font-mono text-muted-foreground">AFR {risk.afrValue}/5</p>
                </div>
                <div className="w-[90px] min-w-[90px] px-3 py-3 font-mono text-base font-bold">{risk.score}</div>
                <div className="w-[100px] min-w-[100px] px-3 py-3">
                  <span className={cn(
                    'inline-flex rounded border px-2 py-1 text-[11px] font-semibold capitalize',
                    LEVEL_STYLE[risk.level] ?? LEVEL_STYLE.informational,
                  )}>
                    {risk.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
