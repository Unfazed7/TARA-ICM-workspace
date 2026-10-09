import { Trash2, Pencil, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { type ThreatAsset, assetCategories } from '@/data/threat-stream-types';

const ciaaanProperties = [
  { key: 'confidentiality' as const, short: 'C', label: 'Confidentiality' },
  { key: 'integrity' as const, short: 'I', label: 'Integrity' },
  { key: 'availability' as const, short: 'A', label: 'Availability' },
  { key: 'authenticity' as const, short: 'Au', label: 'Authenticity' },
  { key: 'authorization' as const, short: 'Az', label: 'Authorization' },
  { key: 'nonRepudiation' as const, short: 'N', label: 'Non-Repudiation' },
] as const;

interface AssetSpecPlateProps {
  asset: ThreatAsset;
  onUpdate: (id: string, updates: Partial<ThreatAsset>) => void;
  onDelete: (id: string) => void;
}

export function AssetSpecPlate({ asset, onUpdate, onDelete }: AssetSpecPlateProps) {
  const activeProps = ciaaanProperties.filter((p) => asset[p.key]);

  return (
    <div
      data-id={asset.id}
      className="group relative bg-card/90 backdrop-blur-xl border border-border border-l-4 border-l-primary rounded-r-lg rounded-l-sm overflow-hidden transition-colors hover:border-border"
    >
      {/* Scanline texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.06) 2px, hsl(var(--foreground) / 0.06) 4px)',
        }}
        aria-hidden="true"
      />

      <div className="relative p-3 space-y-2.5">
        {/* Header: Name + Category + Delete */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Input
              value={asset.name}
              onChange={(e) => onUpdate(asset.id, { name: e.target.value })}
              className="h-7 bg-transparent border-none text-sm font-semibold text-foreground tracking-tight placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 flex-1"
              placeholder="Asset name..."
            />
            <Pencil className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          <Select
            value={asset.category}
            onValueChange={(val) => onUpdate(asset.id, { category: val as ThreatAsset['category'] })}
          >
            <SelectTrigger className="h-5 w-auto bg-muted/70 border-none text-[10px] uppercase tracking-widest text-muted-foreground font-mono px-2 py-0.5 rounded-sm gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assetCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => onDelete(asset.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-destructive shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CIAAAN Multi-Select Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-1.5 h-7 bg-card border border-border rounded-md px-2 text-left hover:border-border transition-colors">
              {activeProps.length > 0 ? (
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {activeProps.map((p) => (
                    <span key={p.key} className="text-[9px] font-semibold bg-primary/15 text-primary border border-primary/30 rounded px-1.5 py-0.5">
                      {p.short}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground/70 flex-1">Select Security Properties...</span>
              )}
              <ChevronDown className="w-3 h-3 text-muted-foreground/70 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-1.5 bg-muted border-border shadow-xl"
            align="start"
            onClick={(e) => e.stopPropagation()}
          >
            {ciaaanProperties.map((prop) => (
              <label
                key={prop.key}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-foreground/5 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={asset[prop.key]}
                  onCheckedChange={(checked) => onUpdate(asset.id, { [prop.key]: !!checked })}
                  className="h-3.5 w-3.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-xs text-foreground">{prop.label}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>

        {/* Footer */}
        <div className="flex justify-end">
          <span className="text-[9px] text-muted-foreground font-mono opacity-60">
            Ref: ISO 21434 Table H.2
          </span>
        </div>
      </div>
    </div>
  );
}
