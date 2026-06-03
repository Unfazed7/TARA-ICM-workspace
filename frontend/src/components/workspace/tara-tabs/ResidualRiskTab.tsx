import { useTara } from '@/contexts/TaraContext';
import { getFeasibilityLevel, FeasibilityLevel, FeasibilityFactors, calculateRiskValue, impactToNumber, feasibilityLevelToNumber, getRiskColor, getRiskLabel } from '@/types/risk-assessment';
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

export function ResidualRiskTab() {
  const { threats, assets, impacts, attackPaths, treatments, updateTreatment } = useTara();

  const handlePostFeasibilityChange = (threatId: string, treatment: typeof treatments[0], key: FactorKey, value: number) => {
    const current = treatment.postFeasibilityFactors ?? { time: 0, expertise: 0, knowledge: 0, equipment: 0, opportunity: 0 };
    const updated: FeasibilityFactors = { ...current, [key]: value };
    const level = getFeasibilityLevel(updated);
    const feasNum = feasibilityLevelToNumber(level);

    // Recalculate residual risk from impact × post-feasibility
    const impact = impacts.find(i => i.linkedAssetId === threats.find(t => t.id === threatId)?.linkedAssetId);
    const maxImpact = impact
      ? Math.max(impactToNumber(impact.safety), impactToNumber(impact.financial), impactToNumber(impact.operational), impactToNumber(impact.privacy))
      : 1;
    const residualRisk = calculateRiskValue(maxImpact, feasNum);

    updateTreatment(threatId, { postFeasibilityFactors: updated, residualRisk });
  };

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Residual Risk — Post-treatment feasibility & risk assessment</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Attack Path</div>
            {/* Post Feasibility Rating group header */}
            <div className="flex flex-col">
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-semibold border-b border-white/5 text-center" style={{ width: `${factorColumns.length * 140 + 100}px` }}>
                Post Feasibility Rating
              </div>
              <div className="flex">
                {factorColumns.map(f => (
                  <div key={f.key} className="w-[140px] min-w-[140px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">{f.label}</div>
                ))}
                <div className="w-[100px] min-w-[100px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Score</div>
              </div>
            </div>
            <div className="w-[130px] min-w-[130px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Post Feasibility</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Residual Risk</div>
          </div>

          {/* Rows */}
          {threats.map(threat => {
            const asset = assets.find(a => a.id === threat.linkedAssetId);
            const ap = attackPaths.find(a => a.linkedThreatId === threat.id);
            const treatment = treatments.find(t => t.linkedThreatId === threat.id);
            const postFactors = treatment?.postFeasibilityFactors ?? { time: 0, expertise: 0, knowledge: 0, equipment: 0, opportunity: 0 };
            const postLevel = getFeasibilityLevel(postFactors);
            const postStyle = feasibilityColors[postLevel];
            const postScore = postFactors.time + postFactors.expertise + postFactors.knowledge + postFactors.opportunity + postFactors.equipment;
            const residualRisk = treatment?.residualRisk ?? 1;
            const riskColor = getRiskColor(residualRisk);
            const riskLabel = getRiskLabel(residualRisk);

            return (
              <div key={threat.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
                {/* Asset */}
                <div className="w-[200px] min-w-[200px] px-3 py-3">
                  <div className="text-sm text-foreground truncate">{asset?.name ?? '—'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{asset?.assetId} · {threat.threatId}</div>
                </div>

                {/* Attack Path */}
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <div className="text-xs text-foreground capitalize">{ap?.attackVector ?? '—'}</div>
                  <div className="text-[10px] text-slate-500 truncate">{ap?.description?.slice(0, 50) ?? '—'}{ap && ap.description.length > 50 ? '...' : ''}</div>
                </div>

                {/* Post Feasibility Factor Selects */}
                {factorColumns.map(col => (
                  <div key={col.key} className="w-[140px] min-w-[140px] px-3 py-3">
                    <Select
                      value={String(postFactors[col.key])}
                      onValueChange={v => treatment && handlePostFeasibilityChange(threat.id, treatment, col.key, Number(v))}
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

                {/* Score */}
                <div className="w-[100px] min-w-[100px] px-3 py-3 flex items-center">
                  <span className="text-sm font-mono text-foreground">{postScore}</span>
                </div>

                {/* Post Feasibility Level */}
                <div className="w-[130px] min-w-[130px] px-3 py-3 flex items-center">
                  <span className={cn('px-2.5 py-1 rounded text-xs font-medium', postStyle.bg, postStyle.text)}>
                    {postStyle.label}
                  </span>
                </div>

                {/* Residual Risk */}
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center gap-2">
                  <span
                    className={cn('text-xl font-bold font-mono', residualRisk >= 4 && 'drop-shadow-[0_0_10px]')}
                    style={{ color: riskColor, ...(residualRisk >= 4 ? { filter: `drop-shadow(0 0 12px ${riskColor})` } : {}) }}
                  >
                    {residualRisk}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{riskLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
