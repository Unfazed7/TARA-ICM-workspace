import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';

const VECTOR_COLORS: Record<string, string> = {
  network:  'bg-sev-4 text-sev-4-foreground',
  adjacent: 'bg-sev-3 text-sev-3-foreground',
  local:    'bg-sev-2 text-sev-2-foreground',
  physical: 'bg-sev-1 text-sev-1-foreground',
};

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">4</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No attack path data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 04 — Attack Path Modelling is running…'
            : 'Run Stage 04 — Attack Path Modelling from the pipeline panel above.'}
        </p>
      </div>
    </div>
  );
}

export function AttackPathTab() {
  const { attackPaths, threats, assets, stageStatuses } = useTara();
  const status = stageStatuses['04'] ?? 'not_started';

  if (attackPaths.length === 0) return <EmptyState status={status} />;

  const threatById = new Map(threats.map((t) => [t.id, t]));
  const assetById  = new Map(assets.map((a)  => [a.id, a]));

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Clause 15.6 — Attack Path Analysis</p>
        <Badge variant="default" className="text-xs">{attackPaths.length} paths</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[90px]  min-w-[90px]  px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">ID</div>
            <div className="w-[160px] min-w-[160px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Asset</div>
            <div className="w-[90px]  min-w-[90px]  px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Threat</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Vector</div>
            <div className="flex-1 min-w-[500px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Attack Path</div>
          </div>

          {attackPaths.map((ap) => {
            const threat = threatById.get(ap.linkedThreatId);
            const asset  = threat ? assetById.get(threat.linkedAssetId) : undefined;
            const vectorClass = VECTOR_COLORS[ap.attackVector] ?? 'bg-muted-foreground/20 text-muted-foreground';
            return (
              <div key={ap.id} className="flex border-b border-border hover:bg-foreground/[0.02] transition-colors">
                <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-start pt-3.5">
                  <span className="text-xs font-mono text-primary">{ap.id}</span>
                </div>
                <div className="w-[160px] min-w-[160px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{asset?.assetId ?? '—'}</p>
                  <p className="text-xs text-foreground truncate mt-0.5">{asset?.name ?? '—'}</p>
                </div>
                <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-start pt-3.5">
                  <span className="text-xs font-mono text-primary/70">{threat?.threatId ?? ap.linkedThreatId}</span>
                </div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-start pt-3.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium capitalize ${vectorClass}`}>
                    {ap.attackVector}
                  </span>
                </div>
                <div className="flex-1 min-w-[500px] px-3 py-3">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{ap.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
