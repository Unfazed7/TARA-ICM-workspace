import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';

const PROPERTY_STYLES: Record<string, string> = {
  confidentiality: 'bg-blue-500/20 text-blue-400',
  integrity: 'bg-orange-500/20 text-orange-400',
  availability: 'bg-red-500/20 text-red-400',
  authenticity: 'bg-purple-500/20 text-purple-400',
  authorization: 'bg-emerald-500/20 text-emerald-400',
  non_repudiation: 'bg-yellow-500/20 text-yellow-400',
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
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
          Clause 15.4 — Damage Scenario Analysis
        </p>
        <Badge variant="default" className="text-xs">
          {damageScenarios.length} damage scenarios
        </Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[90px] min-w-[90px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">ID</div>
            <div className="w-[190px] min-w-[190px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Asset</div>
            <div className="w-[150px] min-w-[150px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Property</div>
            <div className="flex-1 min-w-[520px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Damage Scenario</div>
            <div className="w-[170px] min-w-[170px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Stakeholder</div>
          </div>

          {damageScenarios.map((damage) => {
            const asset = assetById.get(damage.linkedAssetId);
            const propertyStyle = PROPERTY_STYLES[damage.property] ?? 'bg-slate-500/20 text-slate-400';
            return (
              <div key={damage.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
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
                <div className="flex-1 min-w-[520px] px-3 py-3">
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">{damage.scenario}</p>
                </div>
                <div className="w-[170px] min-w-[170px] px-3 py-3">
                  <span className="text-xs text-slate-300 capitalize">{formatLabel(damage.stakeholderAffected)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
