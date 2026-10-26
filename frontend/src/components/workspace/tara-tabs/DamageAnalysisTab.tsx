import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';

const PROPERTY_STYLES: Record<string, string> = {
  confidentiality: 'bg-state-grey text-state-grey-foreground',
  integrity: 'bg-state-grey text-state-grey-foreground',
  availability: 'bg-state-grey text-state-grey-foreground',
  authenticity: 'bg-state-grey text-state-grey-foreground',
  authorization: 'bg-state-grey text-state-grey-foreground',
  non_repudiation: 'bg-state-grey text-state-grey-foreground',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">4</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No damage scenarios yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 04 — Damage Analysis is running…'
            : status === 'failed'
              ? 'Stage 04 — Damage Analysis failed. Retry it from the pipeline panel.'
              : 'Complete Stage 03 — Asset Identification, then run Stage 04 — Damage Analysis.'}
        </p>
      </div>
    </div>
  );
}

export function DamageAnalysisTab() {
  const { damageScenarios, assets, stageStatuses } = useTara();
  const status = stageStatuses['04'] ?? 'not_started';

  if (damageScenarios.length === 0) return <EmptyState status={status} />;

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          Clause 15.4 — Damage Scenario Analysis
        </p>
        <Badge variant="default" className="text-xs">
          {damageScenarios.length} damage scenarios
        </Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="stage-result-table">
          <div className="stage-result-header bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[90px] min-w-[90px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">ID</div>
            <div className="w-[190px] min-w-[190px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Asset</div>
            <div className="w-[150px] min-w-[150px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Property</div>
            <div className="w-[560px] min-w-[560px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Damage Scenario</div>
            <div className="w-[170px] min-w-[170px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Stakeholder</div>
          </div>

          {damageScenarios.map((damage) => {
            const asset = assetById.get(damage.linkedAssetId);
            const propertyStyle = PROPERTY_STYLES[damage.property] ?? 'bg-muted text-muted-foreground';
            return (
              <div key={damage.id} className="stage-result-row border-b border-border transition-colors">
                <div className="w-[90px] min-w-[90px] px-3 py-3">
                  <span className="text-xs font-mono text-primary">{damage.damageId}</span>
                </div>
                <div className="w-[190px] min-w-[190px] px-3 py-3">
                  <p className="text-xs font-mono text-primary/70">{damage.linkedAssetId}</p>
                  <p className="text-xs text-foreground mt-0.5 whitespace-normal">
                    {asset?.name ?? damage.assetTitle}
                  </p>
                </div>
                <div className="w-[150px] min-w-[150px] px-3 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium capitalize ${propertyStyle}`}>
                    {formatLabel(damage.property)}
                  </span>
                </div>
                <div className="w-[560px] min-w-[560px] px-3 py-3">
                  <p className="text-xs text-foreground leading-relaxed whitespace-normal">{damage.scenario}</p>
                </div>
                <div className="w-[170px] min-w-[170px] px-3 py-3">
                  <span className="text-xs text-foreground capitalize">{formatLabel(damage.stakeholderAffected)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
