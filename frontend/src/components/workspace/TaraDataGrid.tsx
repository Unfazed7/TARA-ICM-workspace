import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaraRow, ImpactLevel, AttackVector, StrideCategory, FeasibilityFactors, FeasibilityLevel, TreatmentDecision, impactToNumber, calculateRiskValue, getFeasibilityLevel, feasibilityLevelToNumber, getRiskColor } from '@/types/risk-assessment';
import { mockTaraRows } from '@/data/mock-tara-grid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Asset group colors
const assetGroupColors: Record<string, string> = {
  powertrain: '#ef4444',
  chassis: '#f59e0b',
  infotainment: '#3b82f6',
  body: '#8b5cf6',
  networks: '#06b6d4',
  adas: '#10b981',
};

// Impact badge colors
const impactColors: Record<ImpactLevel, { bg: string; text: string; label: string }> = {
  severe: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Severe' },
  major: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Major' },
  moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Moderate' },
  negligible: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Negligible' },
};

const feasibilityColors: Record<FeasibilityLevel, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'High' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Medium' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Low' },
  'very-low': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Very Low' },
};

const strideLabels: Record<StrideCategory, string> = {
  spoofing: 'Spoofing',
  tampering: 'Tampering',
  repudiation: 'Repudiation',
  'information-disclosure': 'Info Disclosure',
  'denial-of-service': 'DoS',
  'elevation-of-privilege': 'Elev. of Privilege',
};

const feasibilitySliderLabels = [
  { key: 'time' as const, label: 'Elapsed Time' },
  { key: 'expertise' as const, label: 'Expertise' },
  { key: 'knowledge' as const, label: 'Knowledge' },
  { key: 'opportunity' as const, label: 'Window of Opp.' },
  { key: 'equipment' as const, label: 'Equipment' },
];

// === Sub-components ===

function ImpactCalculatorPopover({ row, onChange }: { row: TaraRow; onChange: (field: string, value: ImpactLevel) => void }) {
  const maxImpact = (['impactSafety', 'impactFinancial', 'impactOperational', 'impactPrivacy'] as const)
    .reduce((max, key) => {
      const val = impactToNumber(row[key]);
      return val > max ? val : max;
    }, 0);
  
  const maxLevel: ImpactLevel = maxImpact >= 4 ? 'severe' : maxImpact >= 3 ? 'major' : maxImpact >= 2 ? 'moderate' : 'negligible';
  const style = impactColors[maxLevel];

  const categories = [
    { key: 'impactSafety', label: 'S', full: 'Safety' },
    { key: 'impactFinancial', label: 'F', full: 'Financial' },
    { key: 'impactOperational', label: 'O', full: 'Operational' },
    { key: 'impactPrivacy', label: 'P', full: 'Privacy' },
  ] as const;

  const levels: ImpactLevel[] = ['negligible', 'moderate', 'major', 'severe'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors', style.bg, style.text, 'hover:brightness-125')}>
          {style.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#1a1f2e] border-white/10 p-4" side="right" align="start">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-3">Impact Calculator</p>
        <div className="space-y-2.5">
          {categories.map(cat => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-20 shrink-0">{cat.full}</span>
              <div className="flex gap-1 flex-1">
                {levels.map(level => (
                  <button
                    key={level}
                    onClick={() => onChange(cat.key, level)}
                    className={cn(
                      'flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-all',
                      row[cat.key] === level
                        ? cn(impactColors[level].bg, impactColors[level].text, 'ring-1 ring-current')
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    )}
                  >
                    {impactColors[level].label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FeasibilityCalculatorPopover({ factors, onChange }: { factors: FeasibilityFactors; onChange: (factors: FeasibilityFactors) => void }) {
  const level = getFeasibilityLevel(factors);
  const style = feasibilityColors[level];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors', style.bg, style.text, 'hover:brightness-125')}>
          {style.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-[#1a1f2e] border-white/10 p-4" side="right" align="start">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-3">Attack Potential Calculator</p>
        <div className="space-y-3">
          {feasibilitySliderLabels.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs text-slate-300 font-mono">{factors[key]}</span>
              </div>
              <Slider
                value={[factors[key]]}
                onValueChange={([v]) => onChange({ ...factors, [key]: v })}
                min={0}
                max={4}
                step={1}
                className="h-4"
              />
            </div>
          ))}
          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <span className="text-xs text-slate-500">Aggregate</span>
            <span className={cn('text-sm font-semibold', style.text)}>{style.label}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TreatmentDrawer({ type, value, onChange, open, onOpenChange }: {
  type: 'goal' | 'claim';
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0f1219] border-white/10">
        <DrawerHeader>
          <DrawerTitle className="text-foreground">
            {type === 'goal' ? 'Cybersecurity Goal' : 'Cybersecurity Claim'}
          </DrawerTitle>
          <DrawerDescription>
            {type === 'goal'
              ? 'Define the cybersecurity goal for risk reduction (ISO 21434 Clause 15.9)'
              : 'Provide justification for retaining the risk (ISO 21434 Clause 15.9)'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={type === 'goal' ? 'The system shall...' : 'The risk is accepted because...'}
            className="min-h-[120px] bg-[#05070a] border-white/10 text-foreground"
          />
        </div>
        <DrawerFooter>
          <Button onClick={() => { onChange(draft); onOpenChange(false); }}>Save</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// === Main Component ===

export function TaraDataGrid() {
  const [rows, setRows] = useState<TaraRow[]>(mockTaraRows);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drawerState, setDrawerState] = useState<{ open: boolean; rowId: string; type: 'goal' | 'claim' }>({ open: false, rowId: '', type: 'goal' });

  const updateRow = useCallback((id: string, updates: Partial<TaraRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const computedRows = useMemo(() => rows.map(row => {
    const maxImpact = Math.max(
      impactToNumber(row.impactSafety),
      impactToNumber(row.impactFinancial),
      impactToNumber(row.impactOperational),
      impactToNumber(row.impactPrivacy)
    );
    const feasLevel = getFeasibilityLevel(row.feasibilityFactors);
    const feasNum = feasibilityLevelToNumber(feasLevel);
    const riskValue = calculateRiskValue(maxImpact, feasNum);
    return { ...row, riskValue, feasLevel };
  }), [rows]);

  const columns = [
    { header: 'Asset Context', width: 'w-[240px] min-w-[240px]', sticky: 'sticky left-0 z-20 bg-[#05070a]' },
    { header: 'Impact', width: 'w-[100px] min-w-[100px]', sticky: '' },
    { header: 'Threat Description', width: 'w-[220px] min-w-[220px]', sticky: '' },
    { header: 'Attack Vector', width: 'w-[130px] min-w-[130px]', sticky: '' },
    { header: 'Feasibility', width: 'w-[100px] min-w-[100px]', sticky: '' },
    { header: 'Risk', width: 'w-[80px] min-w-[80px]', sticky: 'sticky right-0 z-20 bg-[#05070a]' },
    { header: 'Treatment', width: 'w-[130px] min-w-[130px]', sticky: '' },
  ];

  return (
    <div className="h-full bg-[#05070a] flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex bg-[#080c14] border-b border-white/5 sticky top-0 z-30">
            {columns.map((col, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-500 font-mono font-medium',
                  col.width,
                  col.sticky,
                  col.sticky && 'bg-[#080c14]'
                )}
              >
                {col.header}
              </div>
            ))}
          </div>

          {/* Rows */}
          {computedRows.map(row => {
            const isExpanded = expandedRows.has(row.id);
            const riskColor = getRiskColor(row.riskValue);

            return (
              <div key={row.id}>
                <div className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  {/* Col 1: Asset Context */}
                  <div className={cn('px-3 py-3 flex items-start gap-2', columns[0].width, columns[0].sticky)}>
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: assetGroupColors[row.assetGroup] || '#666' }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{row.assetName}</div>
                      <div className="text-xs text-slate-500 truncate">{row.damageScenario}</div>
                    </div>
                  </div>

                  {/* Col 2: Impact */}
                  <div className={cn('px-3 py-3 flex items-center', columns[1].width)}>
                    <ImpactCalculatorPopover
                      row={row}
                      onChange={(field, value) => updateRow(row.id, { [field]: value })}
                    />
                  </div>

                  {/* Col 3: Threat Description */}
                  <div className={cn('px-3 py-2', columns[2].width)}>
                    <Textarea
                      value={row.threatDescription}
                      onChange={e => updateRow(row.id, { threatDescription: e.target.value })}
                      className="bg-transparent border-transparent hover:border-white/10 focus:border-white/20 text-sm text-foreground resize-none min-h-[48px] p-1"
                      placeholder="Describe the threat..."
                    />
                    <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                      {strideLabels[row.strideCategory]}
                    </Badge>
                  </div>

                  {/* Col 4: Attack Vector */}
                  <div className={cn('px-3 py-3', columns[3].width)}>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={row.attackVector}
                        onValueChange={(v: AttackVector) => updateRow(row.id, { attackVector: v })}
                      >
                        <SelectTrigger className="h-7 bg-[#0b0f17] border-white/10 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1f2e] border-white/10">
                          <SelectItem value="network">Network</SelectItem>
                          <SelectItem value="adjacent">Adjacent</SelectItem>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="physical">Physical</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => toggleExpand(row.id)}
                        className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Col 5: Feasibility */}
                  <div className={cn('px-3 py-3 flex items-center', columns[4].width)}>
                    <FeasibilityCalculatorPopover
                      factors={row.feasibilityFactors}
                      onChange={factors => updateRow(row.id, { feasibilityFactors: factors })}
                    />
                  </div>

                  {/* Col 6: Risk */}
                  <div className={cn('px-3 py-3 flex items-center justify-center', columns[5].width, columns[5].sticky)}>
                    <span
                      className={cn(
                        'text-xl font-bold font-mono',
                        row.riskValue === 5 && 'drop-shadow-[0_0_10px]'
                      )}
                      style={{ color: riskColor, ...(row.riskValue === 5 ? { filter: `drop-shadow(0 0 20px ${riskColor})` } : {}) }}
                    >
                      {row.riskValue}
                    </span>
                  </div>

                  {/* Col 7: Treatment */}
                  <div className={cn('px-3 py-3 flex items-center', columns[6].width)}>
                    <Select
                      value={row.treatmentDecision}
                      onValueChange={(v: string) => {
                        const decision = v as TreatmentDecision;
                        updateRow(row.id, { treatmentDecision: decision });
                        if (decision === 'reduce') {
                          setDrawerState({ open: true, rowId: row.id, type: 'goal' });
                        } else if (decision === 'accept') {
                          setDrawerState({ open: true, rowId: row.id, type: 'claim' });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 bg-[#0b0f17] border-white/10 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-white/10">
                        <SelectItem value="reduce">Reduce</SelectItem>
                        <SelectItem value="avoid">Avoid</SelectItem>
                        <SelectItem value="share">Share</SelectItem>
                        <SelectItem value="accept">Retain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Expanded Attack Path */}
                {isExpanded && (
                  <div className="flex border-b border-white/5 bg-[#080c14]">
                    <div className={cn(columns[0].width, columns[0].sticky, 'bg-[#080c14]')} />
                    <div className="flex-1 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Attack Path Description</p>
                      <Textarea
                        value={row.attackPathDescription}
                        onChange={e => updateRow(row.id, { attackPathDescription: e.target.value })}
                        className="bg-[#05070a] border-white/10 text-sm text-foreground min-h-[80px]"
                        placeholder="Describe the step-by-step attack path..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Treatment Drawer */}
      <TreatmentDrawer
        type={drawerState.type}
        value={
          drawerState.type === 'goal'
            ? (rows.find(r => r.id === drawerState.rowId)?.cybersecurityGoal ?? '')
            : (rows.find(r => r.id === drawerState.rowId)?.cybersecurityClaim ?? '')
        }
        onChange={v => {
          const field = drawerState.type === 'goal' ? 'cybersecurityGoal' : 'cybersecurityClaim';
          updateRow(drawerState.rowId, { [field]: v });
        }}
        open={drawerState.open}
        onOpenChange={o => setDrawerState(prev => ({ ...prev, open: o }))}
      />
    </div>
  );
}
