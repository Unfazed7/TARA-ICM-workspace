import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTara } from '@/contexts/TaraContext';
import { StrideCategory } from '@/types/risk-assessment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ciaanProperties = [
  { key: 'confidentiality' as const, label: 'C', full: 'Confidentiality' },
  { key: 'integrity' as const, label: 'I', full: 'Integrity' },
  { key: 'availability' as const, label: 'A', full: 'Availability' },
  { key: 'authenticity' as const, label: 'Au', full: 'Authenticity' },
  { key: 'authorization' as const, label: 'Az', full: 'Authorization' },
  { key: 'nonRepudiation' as const, label: 'N', full: 'Non-Repudiation' },
];

const strideOptions: { value: StrideCategory; label: string }[] = [
  { value: 'spoofing', label: 'Spoofing' },
  { value: 'tampering', label: 'Tampering' },
  { value: 'repudiation', label: 'Repudiation' },
  { value: 'information-disclosure', label: 'Info Disclosure' },
  { value: 'denial-of-service', label: 'Denial of Service' },
  { value: 'elevation-of-privilege', label: 'Elevation of Privilege' },
];

export function ThreatAnalysisTab() {
  const { assets, threats, addThreat, updateThreat, removeThreat } = useTara();
  const [newThreat, setNewThreat] = useState({ scenario: '', linkedAssetId: '', strideCategory: 'spoofing' as StrideCategory });

  const handleAdd = () => {
    if (!newThreat.scenario.trim() || !newThreat.linkedAssetId) return;
    addThreat(newThreat);
    setNewThreat({ scenario: '', linkedAssetId: '', strideCategory: 'spoofing' });
  };

  const getAssetById = (id: string) => assets.find(a => a.id === id);

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.4 — Threat Scenario Identification</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[160px] min-w-[160px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset</div>
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">CIAAAN</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">STRIDE</div>
            <div className="w-[90px] min-w-[90px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Threat ID</div>
            <div className="flex-1 min-w-[400px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Threat</div>
            <div className="w-[80px] min-w-[80px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Actions</div>
          </div>

          {threats.map(threat => {
            const asset = getAssetById(threat.linkedAssetId);
            const activeCiaaan = asset ? ciaanProperties.filter(p => asset[p.key]) : [];

            return (
              <div key={threat.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                {/* Asset */}
                <div className="w-[160px] min-w-[160px] px-3 py-3">
                  <Select value={threat.linkedAssetId} onValueChange={v => updateThreat(threat.id, { linkedAssetId: v })}>
                    <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10">
                      {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetId} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* CIAAAN (read-only from asset) */}
                <div className="w-[200px] min-w-[200px] px-3 py-3 flex items-center gap-1.5 flex-wrap">
                  {activeCiaaan.length > 0 ? activeCiaaan.map(prop => (
                    <span key={prop.key} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-medium">
                      {prop.label}
                    </span>
                  )) : (
                    <span className="text-[10px] text-slate-600 italic">—</span>
                  )}
                </div>
                {/* STRIDE */}
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <Select value={threat.strideCategory} onValueChange={(v: StrideCategory) => updateThreat(threat.id, { strideCategory: v })}>
                    <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10">
                      {strideOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Threat ID */}
                <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-center">
                  <span className="text-xs font-mono text-primary">{threat.threatId}</span>
                </div>
                {/* Threat */}
                <div className="flex-1 min-w-[400px] px-3 py-2">
                  <Textarea
                    value={threat.scenario}
                    onChange={e => updateThreat(threat.id, { scenario: e.target.value })}
                    className="bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-sm text-foreground resize-none min-h-[60px] p-2 whitespace-pre-wrap break-words"
                  />
                </div>
                {/* Actions */}
                <div className="w-[80px] min-w-[80px] px-3 py-3 flex items-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => removeThreat(threat.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add Row */}
          <div className="flex border-b border-white/5 bg-white/[0.01]">
            <div className="w-[160px] min-w-[160px] px-3 py-3">
              <Select value={newThreat.linkedAssetId} onValueChange={v => setNewThreat(p => ({ ...p, linkedAssetId: v }))}>
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue placeholder="Select asset..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10">
                  {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetId} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px] min-w-[200px] px-3 py-3 flex items-center">
              {newThreat.linkedAssetId ? (
                <div className="flex gap-1.5 flex-wrap">
                  {ciaanProperties.filter(p => getAssetById(newThreat.linkedAssetId)?.[p.key]).map(prop => (
                    <span key={prop.key} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-medium">
                      {prop.label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 italic">—</span>
              )}
            </div>
            <div className="w-[180px] min-w-[180px] px-3 py-3">
              <Select value={newThreat.strideCategory} onValueChange={(v: StrideCategory) => setNewThreat(p => ({ ...p, strideCategory: v }))}>
                <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10">
                  {strideOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[90px] min-w-[90px] px-3 py-3 flex items-center">
              <span className="text-xs font-mono text-slate-600">T-{String(threats.length + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 min-w-[400px] px-3 py-2">
              <Textarea
                value={newThreat.scenario}
                onChange={e => setNewThreat(p => ({ ...p, scenario: e.target.value }))}
                placeholder="Describe the threat scenario..."
                className="bg-[#0b0f17] border-white/10 text-sm text-foreground resize-none min-h-[60px] p-2"
              />
            </div>
            <div className="w-[80px] min-w-[80px] px-3 py-3 flex items-center">
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
