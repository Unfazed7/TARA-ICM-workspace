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
import type { FunctionAsset, AssetCategory } from '@/data/mock-feature-analysis';
import { assetCategories } from '@/data/mock-feature-analysis';

interface Props {
  functionName: string | null;
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
        'w-8 h-8 rounded text-xs font-bold transition-all flex items-center justify-center',
        active
          ? colorClass
          : 'text-slate-600 bg-white/5 hover:bg-white/10'
      )}
    >
      {label}
    </button>
  );
}

export function AssetDefinitionPanel({
  functionName,
  assets,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset,
}: Props) {
  if (!functionName) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
        <ShieldQuestion className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Select a Function from the Matrix to define its Assets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0f17]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-slate-200">
            Assets for: <span className="text-cyan-400">{functionName}</span>
          </h3>
          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 px-2 py-0.5">
            ISO 21434 Clause 15.3
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset}
          className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add New Asset
        </Button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-4 py-2 border-b border-white/5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium">Asset Name</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium">Category</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium text-center">C · I · A</span>
        <span />
      </div>

      {/* Asset rows */}
      <div className="flex-1 overflow-auto">
        {assets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No assets defined. Click "Add New Asset" to begin.
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-4 py-2 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors"
            >
              <Input
                value={asset.name}
                onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                className="h-8 bg-white/5 border-white/10 text-sm text-slate-200 placeholder:text-slate-600"
                placeholder="Asset name..."
              />
              <Select
                value={asset.category}
                onValueChange={(val) => onUpdateAsset(asset.id, { category: val as AssetCategory })}
              >
                <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-slate-300">
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
              <div className="flex items-center justify-center gap-1">
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
              <button
                onClick={() => onDeleteAsset(asset.id)}
                className="flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
