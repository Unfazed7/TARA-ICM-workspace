import { Plus, Trash2, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FunctionAsset, AssetCategory } from '@/data/feature-types';
import { assetCategories } from '@/data/feature-types';

interface Props {
  functionName: string | null;
  componentName: string | null;
  assets: FunctionAsset[];
  onAddAsset: () => void;
  onDeleteAsset: (assetId: string) => void;
  onUpdateAsset: (assetId: string, updates: Partial<FunctionAsset>) => void;
}

function CIAToggle({
  label,
  active,
  onToggle,
  colorClass,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  colorClass: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-7 h-7 rounded text-[10px] font-bold transition-all flex items-center justify-center',
        active ? colorClass : 'text-slate-600 bg-white/5 hover:bg-white/10'
      )}
    >
      {label}
    </button>
  );
}

export function AssetColumn({
  functionName,
  componentName,
  assets,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset,
}: Props) {
  if (!functionName || !componentName) {
    return (
      <div className="flex flex-col h-full bg-[#0b0f17]">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium">
            Assets & Cybersecurity Properties
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 px-6">
          <ShieldQuestion className="w-10 h-10 opacity-30" />
          <p className="text-xs font-medium text-center">
            Select a Function and an allocated Component to define Assets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0f17]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="min-w-0">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium">
            Assets & Cybersecurity Properties
          </h3>
          <div className="text-[10px] text-slate-600 mt-0.5 truncate">
            Assets for <span className="text-cyan-400/80">{functionName}</span> on{' '}
            <span className="text-cyan-400/80">{componentName}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset}
          className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-[10px] h-7 px-2 shrink-0"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Asset
        </Button>
      </div>

      {/* Asset Cards */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {assets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No assets defined. Click "Add Asset" to begin.
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={asset.name}
                  onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                  className="h-7 bg-white/5 border-white/10 text-xs text-slate-200 placeholder:text-slate-600 flex-1"
                  placeholder="Asset name..."
                />
                <button
                  onClick={() => onDeleteAsset(asset.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={asset.category}
                  onValueChange={(val) => onUpdateAsset(asset.id, { category: val as AssetCategory })}
                >
                  <SelectTrigger className="h-7 bg-white/5 border-white/10 text-[10px] text-slate-300 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 ml-auto">
                  <CIAToggle
                    label="C"
                    active={asset.confidentiality}
                    onToggle={() => onUpdateAsset(asset.id, { confidentiality: !asset.confidentiality })}
                    colorClass="text-blue-400 bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  />
                  <CIAToggle
                    label="I"
                    active={asset.integrity}
                    onToggle={() => onUpdateAsset(asset.id, { integrity: !asset.integrity })}
                    colorClass="text-purple-400 bg-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  />
                  <CIAToggle
                    label="A"
                    active={asset.availability}
                    onToggle={() => onUpdateAsset(asset.id, { availability: !asset.availability })}
                    colorClass="text-orange-400 bg-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer compliance reference */}
      {assets.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5">
          <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-700 px-2 py-0.5">
            Ref: ISO 21434 Table H.2
          </Badge>
        </div>
      )}
    </div>
  );
}
