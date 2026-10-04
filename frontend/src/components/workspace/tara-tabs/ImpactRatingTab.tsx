import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const RATING_STYLE: Record<string, string> = {
  severe:     'bg-sev-4 text-sev-4-foreground',
  major:      'bg-sev-3 text-sev-3-foreground',
  moderate:   'bg-sev-2 text-sev-2-foreground',
  negligible: 'bg-sev-1 text-sev-1-foreground',
};

function RatingBadge({ value }: { value: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-medium capitalize', RATING_STYLE[value] ?? RATING_STYLE.negligible)}>
      {value}
    </span>
  );
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">5</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No impact data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 05 — Impact Analysis is running…'
            : 'Run Stage 05 — Impact Analysis from the pipeline panel above.'}
        </p>
      </div>
    </div>
  );
}

export function ImpactRatingTab() {
  const { impacts, assets, threats, stageStatuses } = useTara();
  const status = stageStatuses['05'] ?? 'not_started';

  if (impacts.length === 0) return <EmptyState status={status} />;

  const assetById  = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Clause 15.5 — Impact Analysis</p>
        <Badge variant="default" className="text-xs">{impacts.length} records</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Column headers */}
          <div className="flex bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[90px]  min-w-[90px]  px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">IM ID</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Asset</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Safety</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Financial</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Operational</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Privacy</div>
          </div>

          {impacts.map((impact) => {
            const asset = assetById.get(impact.linkedAssetId);
            return (
              <div key={impact.id} className="flex border-b border-border hover:bg-foreground/[0.02] transition-colors">
                <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-center">
                  <span className="text-xs font-mono text-primary">{impact.id}</span>
                </div>
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{asset?.assetId ?? impact.linkedAssetId}</p>
                  <p className="text-xs text-foreground truncate mt-0.5">{asset?.name ?? '—'}</p>
                </div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center"><RatingBadge value={impact.safety} /></div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center"><RatingBadge value={impact.financial} /></div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center"><RatingBadge value={impact.operational} /></div>
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center"><RatingBadge value={impact.privacy} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
