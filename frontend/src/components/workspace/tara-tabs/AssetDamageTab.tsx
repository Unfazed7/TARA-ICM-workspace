import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTara, AssetType, assetTypeOptions } from '@/contexts/TaraContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ciaanProperties = [
  { key: 'confidentiality' as const, label: 'C', full: 'Confidentiality' },
  { key: 'integrity' as const, label: 'I', full: 'Integrity' },
  { key: 'availability' as const, label: 'A', full: 'Availability' },
  { key: 'authenticity' as const, label: 'Au', full: 'Authenticity' },
  { key: 'authorization' as const, label: 'Az', full: 'Authorization' },
  { key: 'nonRepudiation' as const, label: 'N', full: 'Non-Repudiation' },
];

const emptyAsset = {
  assetId: '', name: '', assetType: 'other' as AssetType, description: '',
  confidentiality: false, integrity: false, availability: false,
  authenticity: false, authorization: false, nonRepudiation: false, damageScenario: '',
};

export function AssetDamageTab() {
  const { assets, addAsset, updateAsset, removeAsset } = useTara();
  const [newAsset, setNewAsset] = useState({ ...emptyAsset });

  const handleAdd = () => {
    if (!newAsset.name.trim()) return;
    addAsset(newAsset);
    setNewAsset({ ...emptyAsset });
  };

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.3 — Asset Analysis</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset ID</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset Name</div>
            <div className="w-[150px] min-w-[150px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset Type</div>
            <div className="w-[250px] min-w-[250px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset Description</div>
            <div className="w-[280px] min-w-[280px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">CIAAAN</div>
            <div className="w-[80px] min-w-[80px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Actions</div>
          </div>

          {/* Rows */}
          {assets.map(asset => (
            <div key={asset.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div className="w-[100px] min-w-[100px] px-3 py-2 flex items-center">
                <span className="text-xs font-mono text-primary">{asset.assetId}</span>
              </div>
              <div className="w-[180px] min-w-[180px] px-3 py-2">
                <Input
                  value={asset.name}
                  onChange={e => updateAsset(asset.id, { name: e.target.value })}
                  className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-sm text-foreground"
                />
              </div>
              <div className="w-[150px] min-w-[150px] px-3 py-2">
                <Select value={asset.assetType} onValueChange={(v: AssetType) => updateAsset(asset.id, { assetType: v })}>
                  <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypeOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[250px] min-w-[250px] px-3 py-2">
                <Input
                  value={asset.description}
                  onChange={e => updateAsset(asset.id, { description: e.target.value })}
                  placeholder="Brief description..."
                  className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-xs text-foreground"
                />
              </div>
              <div className="w-[280px] min-w-[280px] px-3 py-2 flex items-center gap-3 flex-wrap">
                {ciaanProperties.map(prop => (
                  <label key={prop.key} className="flex items-center gap-1 cursor-pointer" title={prop.full}>
                    <Checkbox
                      checked={asset[prop.key]}
                      onCheckedChange={(v) => updateAsset(asset.id, { [prop.key]: !!v })}
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{prop.label}</span>
                  </label>
                ))}
              </div>
              <div className="w-[80px] min-w-[80px] px-3 py-2 flex items-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => removeAsset(asset.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add Row */}
          <div className="flex border-b border-white/5 bg-white/[0.01]">
            <div className="w-[100px] min-w-[100px] px-3 py-2 flex items-center">
              <span className="text-[10px] text-slate-600 font-mono italic">Auto</span>
            </div>
            <div className="w-[180px] min-w-[180px] px-3 py-2">
              <Input
                value={newAsset.name}
                onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                placeholder="New asset name..."
                className="h-8 bg-[#0b0f17] border-white/10 text-sm text-foreground"
              />
            </div>
            <div className="w-[150px] min-w-[150px] px-3 py-2">
              <Select value={newAsset.assetType} onValueChange={(v: AssetType) => setNewAsset(p => ({ ...p, assetType: v }))}>
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypeOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[250px] min-w-[250px] px-3 py-2">
              <Input
                value={newAsset.description}
                onChange={e => setNewAsset(p => ({ ...p, description: e.target.value }))}
                placeholder="Description..."
                className="h-8 bg-[#0b0f17] border-white/10 text-xs text-foreground"
              />
            </div>
            <div className="w-[280px] min-w-[280px] px-3 py-2 flex items-center gap-3 flex-wrap">
              {ciaanProperties.map(prop => (
                <label key={prop.key} className="flex items-center gap-1 cursor-pointer" title={prop.full}>
                  <Checkbox
                    checked={newAsset[prop.key]}
                    onCheckedChange={(v) => setNewAsset(p => ({ ...p, [prop.key]: !!v }))}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{prop.label}</span>
                </label>
              ))}
            </div>
            <div className="w-[80px] min-w-[80px] px-3 py-2 flex items-center">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
