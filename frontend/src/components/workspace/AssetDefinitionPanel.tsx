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
          : 'text-muted-foreground/70 bg-foreground/5 hover:bg-accent'
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <ShieldQuestion className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Select a Function from the Matrix to define its Assets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">
            Assets for: <span className="text-primary">{functionName}</span>
          </h3>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border px-2 py-0.5">
            ISO 21434 Clause 15.3
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset}
          className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add New Asset
        </Button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-4 py-2 border-b border-border">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Asset Name</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Category</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium text-center">C · I · A</span>
        <span />
      </div>

      {/* Asset rows */}
      <div className="flex-1 overflow-auto">
        {assets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground/70 text-xs">
            No assets defined. Click "Add New Asset" to begin.
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-4 py-2 items-center border-b border-border hover:bg-foreground/[0.02] transition-colors"
            >
              <Input
                value={asset.name}
                onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                className="h-8 bg-foreground/5 border-border text-sm text-foreground placeholder:text-muted-foreground/70"
                placeholder="Asset name..."
              />
              <Select
                value={asset.category}
                onValueChange={(val) => onUpdateAsset(asset.id, { category: val as AssetCategory })}
              >
                <SelectTrigger className="h-8 bg-foreground/5 border-border text-xs text-foreground">
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
                  colorClass="text-primary bg-primary/20"
                />
                <CIAToggle
                  label="I"
                  active={asset.integrity}
                  onToggle={() => onUpdateAsset(asset.id, { integrity: !asset.integrity })}
                  colorClass="text-foreground bg-muted"
                />
                <CIAToggle
                  label="A"
                  active={asset.availability}
                  onToggle={() => onUpdateAsset(asset.id, { availability: !asset.availability })}
                  colorClass="text-signal-ink bg-signal/20"
                />
              </div>
              <button
                onClick={() => onDeleteAsset(asset.id)}
                className="flex items-center justify-center text-muted-foreground/70 hover:text-destructive transition-colors"
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
