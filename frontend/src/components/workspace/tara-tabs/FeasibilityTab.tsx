import { useTara } from '@/contexts/TaraContext';
import { getFeasibilityLevel, FeasibilityLevel } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const feasibilityColors: Record<FeasibilityLevel, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'High' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Medium' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Low' },
  'very-low': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Very Low' },
};

const timeOptions = [
  { value: '0', label: '< 1 day' },
  { value: '1', label: '< 1 week' },
  { value: '2', label: '< 1 month' },
  { value: '3', label: '< 6 months' },
  { value: '4', label: '> 6 months' },
];

const expertiseOptions = [
  { value: '0', label: 'Layman' },
  { value: '1', label: 'Proficient' },
  { value: '2', label: 'Expert' },
  { value: '3', label: 'Multiple Experts' },
];

const knowledgeOptions = [
  { value: '0', label: 'Public' },
  { value: '1', label: 'Restricted' },
  { value: '2', label: 'Confidential' },
  { value: '3', label: 'Strictly Conf.' },
];

const opportunityOptions = [
  { value: '0', label: 'Unlimited' },
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Moderate' },
  { value: '3', label: 'Difficult' },
];

const equipmentOptions = [
  { value: '0', label: 'Standard' },
  { value: '1', label: 'Specialized' },
  { value: '2', label: 'Bespoke' },
  { value: '3', label: 'Multi-Bespoke' },
];

type FactorKey = 'time' | 'expertise' | 'knowledge' | 'opportunity' | 'equipment';

const factorColumns: { key: FactorKey; label: string; options: { value: string; label: string }[] }[] = [
  { key: 'time', label: 'Elapsed Time', options: timeOptions },
  { key: 'expertise', label: 'Expertise', options: expertiseOptions },
  { key: 'knowledge', label: 'Knowledge', options: knowledgeOptions },
  { key: 'opportunity', label: 'Window of Opp.', options: opportunityOptions },
  { key: 'equipment', label: 'Equipment', options: equipmentOptions },
];

export function FeasibilityTab() {
  const { threats, attackPaths, feasibilities, updateFeasibility } = useTara();

  const getAttackPathContext = (attackPathId: string) => {
    const ap = attackPaths.find(a => a.id === attackPathId.replace('feas-', ''));
    if (!ap) {
      // Try matching by linkedAttackPathId
      const f = feasibilities.find(f => f.id === attackPathId);
      if (f) {
        const realAp = attackPaths.find(a => a.id === f.linkedAttackPathId);
        if (realAp) {
          const threat = threats.find(t => t.id === realAp.linkedThreatId);
          return { ap: realAp, threat };
        }
      }
      return null;
    }
    const threat = threats.find(t => t.id === ap.linkedThreatId);
    return { ap, threat };
  };

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.7 — Attack Feasibility Rating (Table G.6)</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[250px] min-w-[250px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Attack Path Reference</div>
            {factorColumns.map(f => (
              <div key={f.key} className="w-[150px] min-w-[150px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">{f.label}</div>
            ))}
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Score</div>
          </div>

          {feasibilities.map(feas => {
            const ctx = getAttackPathContext(feas.id);
            const level = getFeasibilityLevel(feas.factors);
            const style = feasibilityColors[level];

            return (
              <div key={feas.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="w-[250px] min-w-[250px] px-3 py-3">
                  <div className="text-sm text-foreground font-medium truncate">
                    {ctx?.threat ? ctx.threat.threatId : '—'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {ctx?.ap ? `${ctx.ap.attackVector} — ${ctx.ap.description.slice(0, 40)}...` : '—'}
                  </div>
                </div>
                {factorColumns.map(col => (
                  <div key={col.key} className="w-[150px] min-w-[150px] px-3 py-3">
                    <Select
                      value={String(feas.factors[col.key])}
                      onValueChange={v => updateFeasibility(feas.linkedAttackPathId, { ...feas.factors, [col.key]: Number(v) })}
                    >
                      <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-white/10">
                        {col.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center">
                  <span className={cn('px-2.5 py-1 rounded text-xs font-medium', style.bg, style.text)}>
                    {style.label}
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
