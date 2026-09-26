import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DECISION_STYLE: Record<string, string> = {
  reduce: 'bg-blue-500/20 text-blue-400',
  accept: 'bg-emerald-500/20 text-emerald-400',
  share:  'bg-purple-500/20 text-purple-400',
  avoid:  'bg-red-500/20 text-red-400',
};

const RISK_LEVEL_STYLE = (v: number) => {
  if (v >= 4) return 'text-red-400';
  if (v >= 3) return 'text-amber-400';
  if (v >= 2) return 'text-yellow-400';
  return 'text-emerald-400';
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
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.8 & 15.9 — Risk Treatment</p>
        <Badge variant="default" className="text-xs">{treatments.length} treatments</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">ID</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Asset / Threat</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Decision</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Residual</div>
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Controls</div>
            <div className="flex-1 min-w-[300px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Goal / Claim</div>
          </div>

          {treatments.map((t) => {
            const threat = threatById.get(t.linkedThreatId);
            const asset  = threat ? assetById.get(threat.linkedAssetId) : undefined;
            const decisionClass = DECISION_STYLE[t.decision] ?? 'bg-slate-500/20 text-slate-400';
            return (
              <div key={t.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-start pt-3.5">
                  <span className="text-xs font-mono text-primary">{t.id}</span>
                </div>
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{asset?.assetId ?? '—'}</p>
                  <p className="text-xs text-foreground truncate mt-0.5">{asset?.name ?? '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{threat?.threatId ?? t.linkedThreatId}</p>
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
                  <p className="text-xs font-mono text-slate-400">{t.controls || '—'}</p>
                </div>
                <div className="flex-1 min-w-[300px] px-3 py-3">
                  {t.cybersecurityGoal && (
                    <p className="text-xs text-slate-300 leading-relaxed mb-1">
                      <span className="text-[10px] font-mono text-primary/70 mr-1">Goal:</span>
                      {t.cybersecurityGoal}
                    </p>
                  )}
                  {t.cybersecurityClaim && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <span className="text-[10px] font-mono text-slate-500 mr-1">Claim:</span>
                      {t.cybersecurityClaim}
                    </p>
                  )}
                  {!t.cybersecurityGoal && !t.cybersecurityClaim && <span className="text-xs text-slate-600">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
