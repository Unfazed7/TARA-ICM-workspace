import { useTara } from '@/contexts/TaraContext';
import { Badge } from '@/components/ui/badge';

const CIAAAN = [
  { key: 'confidentiality', label: 'C' },
  { key: 'integrity',       label: 'I' },
  { key: 'availability',    label: 'A' },
  { key: 'authenticity',    label: 'Au' },
  { key: 'authorization',   label: 'Az' },
  { key: 'nonRepudiation',  label: 'NR' },
] as const;

function EmptyState({ status }: { status: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">1</div>
      <div>
        <p className="text-sm font-semibold text-foreground">No asset data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === 'running'
            ? 'Stage 03 — Asset Identification is running…'
            : 'Complete the Item Definition and run Stage 03 — Asset Identification.'}
        </p>
      </div>
    </div>
  );
}

export function AssetDamageTab() {
  const { assets, stageStatuses } = useTara();
  const status = stageStatuses['03'] ?? 'not_started';

  if (assets.length === 0) return <EmptyState status={status} />;

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.3 — Asset Register</p>
        <Badge variant="default" className="text-xs">{assets.length} assets</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="stage-result-table">
          <div className="stage-result-header bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">ID</div>
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Asset Title</div>
            <div className="w-[380px] min-w-[380px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">Description</div>
            <div className="w-[300px] min-w-[300px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono">CIAAAN Properties</div>
          </div>

          {assets.map((asset) => (
            <div key={asset.id} className="stage-result-row border-b border-white/5 transition-colors">
              <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center">
                <span className="text-xs font-mono text-primary">{asset.assetId}</span>
              </div>
              <div className="w-[200px] min-w-[200px] px-3 py-3">
                <p className="text-sm font-semibold text-foreground">{asset.name}</p>
              </div>
              <div className="w-[380px] min-w-[380px] px-3 py-3">
                <p className="text-xs text-slate-400 leading-relaxed whitespace-normal break-words">{asset.description || '—'}</p>
              </div>
              <div className="w-[300px] min-w-[300px] px-3 py-3 flex items-center gap-1.5 flex-wrap">
                {CIAAAN.filter((p) => asset[p.key]).map((p) => (
                  <span key={p.key} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-medium">
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
