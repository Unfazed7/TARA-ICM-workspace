import { useTara } from '@/contexts/TaraContext';
import { TreatmentDecision, getRiskColor, getRiskLabel, impactToNumber, getFeasibilityLevel, feasibilityLevelToNumber } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const feasibilityColors: Record<string, string> = {
  'high': 'text-red-400',
  'medium': 'text-amber-400',
  'low': 'text-emerald-400',
  'very-low': 'text-sky-400',
};

export function RiskTreatmentTab() {
  const { threats, assets, impacts, attackPaths, feasibilities, treatments, updateTreatment } = useTara();

  return (
    <div className="h-full flex flex-col bg-[#05070a]">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Clause 15.8 & 15.9 — Risk Determination & Decision</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-10">
            <div className="w-[220px] min-w-[220px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Asset</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Overall Impact</div>
            <div className="w-[140px] min-w-[140px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Attack Feasibility</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Risk Score</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium">Risk Decision</div>
          </div>

          {/* Rows */}
          {threats.map(threat => {
            const asset = assets.find(a => a.id === threat.linkedAssetId);
            const impact = impacts.find(i => i.linkedAssetId === threat.linkedAssetId);
            const ap = attackPaths.find(a => a.linkedThreatId === threat.id);
            const feas = ap ? feasibilities.find(f => f.linkedAttackPathId === ap.id) : undefined;
            const treatment = treatments.find(t => t.linkedThreatId === threat.id);

            // Calculate overall impact
            const overallImpact = impact
              ? Math.max(
                  impactToNumber(impact.safety),
                  impactToNumber(impact.financial),
                  impactToNumber(impact.operational),
                  impactToNumber(impact.privacy)
                )
              : 1;

            // Calculate feasibility
            const feasLevel = feas ? getFeasibilityLevel(feas.factors) : 'very-low';
            const feasNum = feasibilityLevelToNumber(feasLevel);

            // Risk
            const riskValue = treatment?.riskValue ?? 1;
            const riskColor = getRiskColor(riskValue);
            const riskLabel = getRiskLabel(riskValue);

            const impactLabels: Record<number, string> = { 1: 'Negligible', 2: 'Moderate', 3: 'Major', 4: 'Severe' };

            return (
              <div key={threat.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                {/* Asset */}
                <div className="w-[220px] min-w-[220px] px-3 py-3">
                  <div className="text-sm text-foreground truncate">{asset?.name ?? '—'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{asset?.assetId} · {threat.threatId}</div>
                </div>

                {/* Overall Impact */}
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center">
                  <Badge variant="outline" className="text-xs border-white/10 bg-white/5">
                    {overallImpact} — {impactLabels[overallImpact] ?? 'N/A'}
                  </Badge>
                </div>

                {/* Attack Feasibility */}
                <div className="w-[140px] min-w-[140px] px-3 py-3 flex items-center">
                  <span className={cn('text-xs font-mono capitalize', feasibilityColors[feasLevel])}>
                    {feasLevel} ({feasNum})
                  </span>
                </div>

                {/* Risk Score */}
                <div className="w-[120px] min-w-[120px] px-3 py-3 flex items-center gap-2">
                  <span
                    className={cn('text-xl font-bold font-mono', riskValue >= 4 && 'drop-shadow-[0_0_10px]')}
                    style={{ color: riskColor, ...(riskValue >= 4 ? { filter: `drop-shadow(0 0 12px ${riskColor})` } : {}) }}
                  >
                    {riskValue}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{riskLabel}</span>
                </div>

                {/* Risk Decision */}
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <Select
                    value={treatment?.decision ?? 'reduce'}
                    onValueChange={(v: string) => updateTreatment(threat.id, { decision: v as TreatmentDecision })}
                  >
                    <SelectTrigger className="h-8 bg-[#0b0f17] border-white/10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10">
                      <SelectItem value="avoid">Avoid</SelectItem>
                      <SelectItem value="reduce">Reduce</SelectItem>
                      <SelectItem value="share">Share</SelectItem>
                      <SelectItem value="accept">Retain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
