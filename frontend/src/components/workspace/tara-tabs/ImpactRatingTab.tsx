import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTara } from '@/contexts/TaraContext';
import { ImpactLevel, impactToNumber } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const impactColors: Record<ImpactLevel, { bg: string; text: string; trigger: string; label: string }> = {
  severe: { bg: 'bg-red-500/20', text: 'text-red-400', trigger: 'bg-red-500/15 border-red-500/30 text-red-400', label: 'Severe' },
  major: { bg: 'bg-amber-500/20', text: 'text-amber-400', trigger: 'bg-amber-500/15 border-amber-500/30 text-amber-400', label: 'Major' },
  moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', trigger: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', label: 'Moderate' },
  negligible: { bg: 'bg-slate-500/20', text: 'text-slate-400', trigger: 'bg-slate-500/10 border-white/10 text-slate-400', label: 'Negligible' },
};

const impactOptions = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

const ciaanProperties = [
  { key: 'confidentiality' as const, label: 'C', full: 'Confidentiality' },
  { key: 'integrity' as const, label: 'I', full: 'Integrity' },
  { key: 'availability' as const, label: 'A', full: 'Availability' },
  { key: 'authenticity' as const, label: 'Au', full: 'Authenticity' },
  { key: 'authorization' as const, label: 'Az', full: 'Authorization' },
  { key: 'nonRepudiation' as const, label: 'N', full: 'Non-Repudiation' },
];

function getMaxImpact(s: ImpactLevel, f: ImpactLevel, o: ImpactLevel, p: ImpactLevel): ImpactLevel {
  const max = Math.max(impactToNumber(s), impactToNumber(f), impactToNumber(o), impactToNumber(p));
  if (max >= 4) return 'severe';
  if (max >= 3) return 'major';
  if (max >= 2) return 'moderate';
  return 'negligible';
}

function ImpactSelect({ value, onChange }: { value: ImpactLevel; onChange: (v: ImpactLevel) => void }) {
  return (
    <Select value={value} onValueChange={(v: string) => onChange(v as ImpactLevel)}>
      <SelectTrigger className={cn("h-8 text-xs transition-colors", impactColors[value].trigger)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1f2e] border-white/10">
        {impactOptions.map(o => (
          <SelectItem key={o.value} value={o.value} className={impactColors[o.value as ImpactLevel].text}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ImpactRatingTab() {
  const { assets, impacts, updateImpact } = useTara();

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.5 — Impact Analysis</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header row 1 - group headers */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-20">
            <div className="w-[160px] min-w-[160px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium" />
            <div className="w-[220px] min-w-[220px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium" />
            <div className="w-[100px] min-w-[100px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium" />
            <div className="w-[250px] min-w-[250px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium" />
            <div className="w-[700px] min-w-[700px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary font-mono font-bold text-center border-l border-white/5">
              Impact Rating
            </div>
          </div>

          {/* Header row 2 - column headers */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-[30px] z-10">
            <div className="w-[160px] min-w-[160px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset</div>
            <div className="w-[220px] min-w-[220px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">CIAAAN</div>
            <div className="w-[100px] min-w-[100px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Damage ID</div>
            <div className="w-[250px] min-w-[250px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Damage Scenario</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium border-l border-white/5">Safety (S)</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Financial (F)</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Operational (O)</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Privacy (P)</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Overall</div>
          </div>

          {/* Rows */}
          {assets.map((asset, index) => {
            const impact = impacts.find(i => i.linkedAssetId === asset.id);
            if (!impact) return null;
            const maxLevel = getMaxImpact(impact.safety, impact.financial, impact.operational, impact.privacy);
            const maxStyle = impactColors[maxLevel];
            const damageId = `D-${String(index + 1).padStart(3, '0')}`;

            const activeCiaaan = ciaanProperties.filter(p => asset[p.key]);

            return (
              <div key={asset.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="w-[160px] min-w-[160px] px-3 py-3">
                  <span className="text-xs font-mono text-primary">{asset.assetId}</span>
                  <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{asset.name}</p>
                </div>
                <div className="w-[220px] min-w-[220px] px-3 py-3 flex items-center gap-1.5 flex-wrap">
                  {activeCiaaan.length > 0 ? activeCiaaan.map(prop => (
                    <span key={prop.key} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-medium">
                      {prop.full}
                    </span>
                  )) : (
                    <span className="text-[10px] text-slate-600 italic">None</span>
                  )}
                </div>
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center">
                  <span className="text-xs font-mono text-slate-400">{damageId}</span>
                </div>
                <div className="w-[250px] min-w-[250px] px-3 py-3">
                  <span className="text-xs text-slate-500 line-clamp-2">{asset.damageScenario || '—'}</span>
                </div>
                {/* Safety */}
                <div className="w-[140px] min-w-[140px] px-3 py-3 border-l border-white/5">
                  <ImpactSelect value={impact.safety} onChange={(v) => updateImpact(asset.id, { safety: v })} />
                </div>
                {/* Financial */}
                <div className="w-[140px] min-w-[140px] px-3 py-3">
                  <ImpactSelect value={impact.financial} onChange={(v) => updateImpact(asset.id, { financial: v })} />
                </div>
                {/* Operational */}
                <div className="w-[140px] min-w-[140px] px-3 py-3">
                  <ImpactSelect value={impact.operational} onChange={(v) => updateImpact(asset.id, { operational: v })} />
                </div>
                {/* Privacy */}
                <div className="w-[140px] min-w-[140px] px-3 py-3">
                  <ImpactSelect value={impact.privacy} onChange={(v) => updateImpact(asset.id, { privacy: v })} />
                </div>
                {/* Overall */}
                <div className="w-[140px] min-w-[140px] px-3 py-3 flex items-center">
                  <span className={cn('px-2.5 py-1 rounded text-xs font-medium', maxStyle.bg, maxStyle.text)}>
                    {maxStyle.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
