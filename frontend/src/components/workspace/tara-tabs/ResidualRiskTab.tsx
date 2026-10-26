import { useTara } from '@/contexts/TaraContext';
import { getFeasibilityLevel, FeasibilityLevel, FeasibilityFactors, calculateRiskValue, impactToNumber, feasibilityLevelToNumber, getRiskColor, getRiskLabel } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CvssMetricKey, TaraResidualRisk } from '@/lib/mappers';

const feasibilityColors: Record<FeasibilityLevel, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-sev-4', text: 'text-sev-4-foreground', label: 'High' },
  medium: { bg: 'bg-sev-3', text: 'text-sev-3-foreground', label: 'Medium' },
  low: { bg: 'bg-sev-2', text: 'text-sev-2-foreground', label: 'Low' },
  'very-low': { bg: 'bg-sev-1', text: 'text-sev-1-foreground', label: 'Very Low' },
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

const METRIC_COLUMNS: { key: CvssMetricKey; short: string; values: Record<string, string> }[] = [
  { key: 'attack_vector', short: 'Vector', values: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' } },
  { key: 'attack_complexity', short: 'Complexity', values: { L: 'Low', H: 'High' } },
  { key: 'privileges_required', short: 'Privileges', values: { N: 'None', L: 'Low', H: 'High' } },
  { key: 'user_interaction', short: 'User step', values: { N: 'None', R: 'Required' } },
];

const LEVEL_STYLE: Record<string, string> = {
  informational: 'bg-muted text-muted-foreground',
  low: 'bg-sev-1 text-sev-1-foreground',
  medium: 'bg-sev-2 text-sev-2-foreground',
  high: 'bg-sev-3 text-sev-3-foreground',
  critical: 'bg-sev-4 text-sev-4-foreground',
};

function LevelTag({ level, score }: { level: string; score: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', LEVEL_STYLE[level] ?? LEVEL_STYLE.informational)}>
      <span className="aegis-mono">{score}</span>
      {level}
    </span>
  );
}

/** What Stage 10 worked out: the same feasibility and risk calculation as before, with the controls applied. */
function Stage10Result({ rows }: { rows: TaraResidualRisk[] }) {
  const { assets } = useTara();
  const assetName = (id: string) => assets.find((a) => a.assetId === id)?.name ?? id;
  return (
    <div className="stage-result-table">
      <div className="stage-result-header border-b border-border sticky top-0 z-10">
        {[['Threat', 'w-[210px]'], ['Controls', 'w-[190px]'], ['What the controls change', 'w-[330px]'], ['Feasibility', 'w-[190px]'], ['Risk', 'w-[250px]']].map(([label, width]) => (
          <div key={label} className={cn(width, 'min-w-0 shrink-0 px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground aegis-mono font-medium')}>{label}</div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="stage-result-row border-b border-border items-start">
          <div className="w-[210px] shrink-0 px-3 py-3">
            <div className="text-sm text-foreground">{assetName(row.assetId)}</div>
            <div className="aegis-mono text-[10px] text-muted-foreground">{row.threatId} · {row.riskId}</div>
          </div>
          <div className="w-[190px] shrink-0 px-3 py-3">
            {row.controls.length === 0 ? (
              <span className="text-xs text-muted-foreground">No controls ({row.treatmentOption})</span>
            ) : (
              <div className="flex flex-col gap-1">
                {row.controls.map((control) => (
                  <span key={control.id} className="text-xs text-foreground"><span className="aegis-mono text-muted-foreground">{control.id}</span> {control.title}</span>
                ))}
              </div>
            )}
          </div>
          <div className="w-[330px] shrink-0 px-3 py-3">
            <div className="flex flex-wrap gap-1.5">
              {METRIC_COLUMNS.map((metric) => {
                const before = row.pre.metrics[metric.key];
                const after = row.post.metrics[metric.key];
                const changed = before !== after;
                return (
                  <Badge key={metric.key} variant={changed ? 'green' : 'grey'} case="normal" title={metric.short}>
                    {metric.short}: {metric.values[before]}{changed && <> → {metric.values[after]}</>}
                  </Badge>
                );
              })}
            </div>
            {row.changes.length > 0 && (
              <ul className="m-0 mt-2 list-none space-y-1 p-0">
                {row.changes.map((change) => (
                  <li key={change.metric} className="text-xs leading-relaxed text-muted-foreground">{change.reason}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-[190px] shrink-0 px-3 py-3 text-xs">
            <div className="capitalize text-muted-foreground">Before: <span className="text-foreground">{row.pre.afrLabel}</span></div>
            <div className="capitalize text-muted-foreground">With controls: <span className="font-medium text-foreground">{row.post.afrLabel}</span></div>
          </div>
          <div className="w-[250px] shrink-0 space-y-1 px-3 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">Before <LevelTag level={row.pre.level} score={row.pre.score} /></div>
            <div className="flex items-center gap-2">With controls <LevelTag level={row.post.level} score={row.post.score} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalystEstimate() {
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
    <div className="flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border">
        <p className="aegis-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your own estimate — change the five factors by hand; kept in the browser draft</p>
      </div>

      <div className="overflow-auto">
        <div className="stage-result-table">
          {/* Header */}
          <div className="stage-result-header bg-card border-b border-border sticky top-0 z-10">
            <div className="w-[200px] min-w-[200px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Asset</div>
            <div className="w-[180px] min-w-[180px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Attack Path</div>
            {/* Post Feasibility Rating group header */}
            <div className="flex flex-col">
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-sev-1-foreground font-mono font-semibold border-b border-border text-center" style={{ width: `${factorColumns.length * 140 + 100}px` }}>
                Post Feasibility Rating
              </div>
              <div className="flex">
                {factorColumns.map(f => (
                  <div key={f.key} className="w-[140px] min-w-[140px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">{f.label}</div>
                ))}
                <div className="w-[100px] min-w-[100px] px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Score</div>
              </div>
            </div>
            <div className="w-[130px] min-w-[130px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Post Feasibility</div>
            <div className="w-[120px] min-w-[120px] px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-medium">Residual Risk</div>
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
              <div key={threat.id} className="stage-result-row border-b border-border transition-colors items-center">
                {/* Asset */}
                <div className="w-[200px] min-w-[200px] px-3 py-3">
                  <div className="text-sm text-foreground truncate">{asset?.name ?? '—'}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{asset?.assetId} · {threat.threatId}</div>
                </div>

                {/* Attack Path */}
                <div className="w-[180px] min-w-[180px] px-3 py-3">
                  <div className="text-xs text-foreground capitalize">{ap?.attackVector ?? '—'}</div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed">{ap?.description ?? '—'}</div>
                </div>

                {/* Post Feasibility Factor Selects */}
                {factorColumns.map(col => (
                  <div key={col.key} className="w-[140px] min-w-[140px] px-3 py-3">
                    <Select
                      value={String(postFactors[col.key])}
                      onValueChange={v => treatment && handlePostFeasibilityChange(threat.id, treatment, col.key, Number(v))}
                    >
                      <SelectTrigger className="h-8 bg-card border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border">
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
                    className={cn('text-xl font-bold font-mono', residualRisk >= 4 && '')}
                    style={{ color: riskColor, ...(residualRisk >= 4 ? { filter: `drop-shadow(0 0 12px ${riskColor})` } : {}) }}
                  >
                    {residualRisk}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">{riskLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ResidualRiskTab() {
  const { residualRisks, stageStatuses } = useTara();
  const state = stageStatuses['10'] ?? 'not_started';
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="px-4 py-3 border-b border-border">
        <p className="aegis-mono text-[10px] uppercase tracking-widest text-muted-foreground">Residual Risk — the same feasibility and risk calculation, with the controls applied</p>
      </div>
      {residualRisks.length > 0 ? (
        <div className="overflow-x-auto"><Stage10Result rows={residualRisks} /></div>
      ) : (
        <p className="m-0 px-4 py-6 text-sm text-muted-foreground">
          {state === 'complete' ? 'Stage 10 has no threats to show.' : 'Run stage 10 above to see the risk before and with the controls.'}
        </p>
      )}
      <AnalystEstimate />
    </div>
  );
}
