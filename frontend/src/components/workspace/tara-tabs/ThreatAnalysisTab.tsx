import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';

const STRIDE_COLORS: Record<string, string> = {
  spoofing:               'bg-purple-500/20 text-purple-400',
  tampering:              'bg-orange-500/20 text-orange-400',
  repudiation:            'bg-yellow-500/20 text-yellow-400',
  'information-disclosure': 'bg-blue-500/20 text-blue-400',
  'denial-of-service':    'bg-red-500/20 text-red-400',
  'elevation-of-privilege': 'bg-emerald-500/20 text-emerald-400',
};

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">3</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No threat data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 03 — Threat Identification is running…'
            : 'Run Stage 02 (Damage Analysis) then Stage 03 (Threat Identification) from the pipeline panel above.'}
        </p>
      </div>
    </div>
  );
}

export function ThreatAnalysisTab() {
  const { threats, assets, stageStatuses } = useTara();
  const status = stageStatuses['03'] ?? 'not_started';

  if (threats.length === 0) return <EmptyState status={status} />;

  const assetById = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.4 — Threat Scenario Identification</p>
        <Badge variant="default" className="text-xs">{threats.length} threats</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[90px]  min-w-[90px]  px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">ID</div>
            <div className="w-[160px] min-w-[160px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Asset</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">STRIDE</div>
            <div className="flex-1 min-w-[400px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Threat Statement</div>
          </div>

          {threats.map((threat) => {
            const asset = assetById.get(threat.linkedAssetId);
            const strideClass = STRIDE_COLORS[threat.strideCategory] ?? 'bg-slate-500/20 text-slate-400';
            return (
              <div key={threat.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-center">
                  <span className="text-xs font-mono text-primary">{threat.threatId}</span>
                </div>
                <div className="w-[160px] min-w-[160px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{asset?.assetId ?? threat.linkedAssetId}</p>
                  <p className="text-xs text-foreground truncate mt-0.5">{asset?.name ?? '—'}</p>
                </div>
                <div className="w-[180px] min-w-[180px] px-3 py-3 flex items-start pt-3.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium capitalize ${strideClass}`}>
                    {threat.strideCategory.replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 min-w-[400px] px-3 py-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{threat.scenario}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
