import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTara } from '@/contexts/TaraContext';
import { AttackVector } from '@/types/risk-assessment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const vectorOptions: { value: AttackVector; label: string }[] = [
  { value: 'network', label: 'Network' },
  { value: 'adjacent', label: 'Adjacent' },
  { value: 'local', label: 'Local' },
  { value: 'physical', label: 'Physical' },
];

export function AttackPathTab() {
  const { assets, threats, attackPaths, addAttackPath, updateAttackPath, removeAttackPath } = useTara();
  const [newPath, setNewPath] = useState({
    linkedThreatId: '',
    linkedAssetId: '',
    attackVector: 'network' as AttackVector,
    description: '',
  });

  // Get asset name for a threat (via threat → asset link)
  const getAssetForThreat = (threatId: string) => {
    const threat = threats.find(t => t.id === threatId);
    if (!threat) return null;
    return assets.find(a => a.id === threat.linkedAssetId) || null;
  };

  // When user selects an asset in the new row, filter threats for that asset
  const filteredThreats = newPath.linkedAssetId
    ? threats.filter(t => t.linkedAssetId === newPath.linkedAssetId)
    : threats;

  const handleAdd = () => {
    if (!newPath.linkedThreatId || !newPath.description.trim()) return;
    addAttackPath({
      linkedThreatId: newPath.linkedThreatId,
      attackVector: newPath.attackVector,
      description: newPath.description,
    });
    setNewPath({ linkedThreatId: '', linkedAssetId: '', attackVector: 'network', description: '' });
  };

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.6 — Attack Path Analysis</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* ─── Header ─── */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset Name</div>
            <div className="w-[260px] min-w-[260px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Linked Threat</div>
            <div className="w-[130px] min-w-[130px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Attack Vector</div>
            <div className="w-[400px] min-w-[400px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Attack Path Description</div>
            <div className="w-[70px] min-w-[70px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Actions</div>
          </div>

          {/* ─── Existing rows ─── */}
          {attackPaths.map(ap => {
            const linkedAsset = getAssetForThreat(ap.linkedThreatId);

            return (
              <div key={ap.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                {/* Asset Name (read-only, derived from threat's linked asset) */}
                <div className="w-[200px] min-w-[200px] px-3 py-3 flex items-center">
                  {linkedAsset ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-mono text-primary/70">{linkedAsset.assetId}</span>
                      <span className="text-foreground truncate" title={linkedAsset.name}>{linkedAsset.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No asset</span>
                  )}
                </div>

                {/* Linked Threat */}
                <div className="w-[260px] min-w-[260px] px-3 py-3">
                  <Select value={ap.linkedThreatId} onValueChange={v => updateAttackPath(ap.id, { linkedThreatId: v })}>
                    <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10 max-w-[350px]">
                      {threats.map(t => {
                        const a = assets.find(x => x.id === t.linkedAssetId);
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            {t.threatId} — {t.scenario.slice(0, 40)}{a ? ` [${a.assetId}]` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attack Vector */}
                <div className="w-[130px] min-w-[130px] px-3 py-3">
                  <Select value={ap.attackVector} onValueChange={(v: AttackVector) => updateAttackPath(ap.id, { attackVector: v })}>
                    <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10">
                      {vectorOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="w-[400px] min-w-[400px] px-3 py-2">
                  <Textarea
                    value={ap.description}
                    onChange={e => updateAttackPath(ap.id, { description: e.target.value })}
                    className="bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-sm text-foreground resize-none min-h-[60px] p-1"
                  />
                </div>

                {/* Actions */}
                <div className="w-[70px] min-w-[70px] px-3 py-3 flex items-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => removeAttackPath(ap.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* ─── Add new row ─── */}
          <div className="flex border-b border-white/5 bg-white/[0.01]">
            {/* Asset selector for new row */}
            <div className="w-[200px] min-w-[200px] px-3 py-3">
              <Select
                value={newPath.linkedAssetId}
                onValueChange={v => {
                  setNewPath(p => ({ ...p, linkedAssetId: v, linkedThreatId: '' }));
                }}
              >
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue placeholder="Select asset..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10 max-w-[300px]">
                  <SelectItem value="__all__">All Assets</SelectItem>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetId} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Threat selector (filtered by selected asset) */}
            <div className="w-[260px] min-w-[260px] px-3 py-3">
              <Select value={newPath.linkedThreatId} onValueChange={v => setNewPath(p => ({ ...p, linkedThreatId: v }))}>
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue placeholder="Select threat..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10 max-w-[350px]">
                  {filteredThreats.length === 0 ? (
                    <SelectItem value="__none__" disabled>No threats for this asset</SelectItem>
                  ) : (
                    filteredThreats.map(t => {
                      const a = assets.find(x => x.id === t.linkedAssetId);
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          {t.threatId} — {t.scenario.slice(0, 40)}{a ? ` [${a.assetId}]` : ''}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Attack Vector */}
            <div className="w-[130px] min-w-[130px] px-3 py-3">
              <Select value={newPath.attackVector} onValueChange={(v: AttackVector) => setNewPath(p => ({ ...p, attackVector: v }))}>
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10">
                  {vectorOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="w-[400px] min-w-[400px] px-3 py-2">
              <Textarea
                value={newPath.description}
                onChange={e => setNewPath(p => ({ ...p, description: e.target.value }))}
                placeholder="Step-by-step attack path..."
                className="bg-[#0b0f17] border-white/10 text-sm text-foreground resize-none min-h-[60px] p-1"
              />
            </div>

            {/* Add button */}
            <div className="w-[70px] min-w-[70px] px-3 py-3 flex items-center">
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
