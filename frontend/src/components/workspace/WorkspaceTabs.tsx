import { Target, Gauge, Route, Activity, FileCheck, ShieldAlert, GitBranch, Package, ClipboardList, Shield, ShieldCheck, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { AssetDamageTab } from './tara-tabs/AssetDamageTab';
import { DamageAnalysisTab } from './tara-tabs/DamageAnalysisTab';
import { ThreatAnalysisTab } from './tara-tabs/ThreatAnalysisTab';
import { ImpactRatingTab } from './tara-tabs/ImpactRatingTab';
import { AttackPathTab } from './tara-tabs/AttackPathTab';
import { FeasibilityTab } from './tara-tabs/FeasibilityTab';
import { RiskTreatmentTab } from './tara-tabs/RiskTreatmentTab';
import { CybersecurityGoalsTab } from './tara-tabs/CybersecurityGoalsTab';
import { AttackTreesTab } from './tara-tabs/AttackTreesTab';
import { ResidualRiskTab } from './tara-tabs/ResidualRiskTab';
import { FinalTaraTab } from './tara-tabs/FinalTaraTab';
import { ReportExportCenter } from './ReportExportCenter';
import { useMemo } from 'react';
import { ThreatScenario } from '@/types/risk-assessment';
import { calculateSheetProgress, type WorkflowPhase } from '@/lib/workflow';
const mockThreatScenarios: ThreatScenario[] = [];

type TaraTab = 'asset-id' | 'damage-analysis' | 'threat-analysis' | 'attack-trees' | 'impact-rating' | 'attack-path' | 'feasibility' | 'risk-treatment' | 'cybersecurity-goals' | 'residual-risk' | 'final-tara' | 'reports';

const taraSteps = [
  { id: 'asset-id' as TaraTab, step: 1, label: 'Asset Analysis', description: 'Asset identification & cataloging (Clause 15.3)', icon: Package },
  { id: 'damage-analysis' as TaraTab, step: 2, label: 'Damage Analysis', description: 'Damage scenarios by asset and CIAAAN property (Clause 15.4)', icon: ShieldAlert },
  { id: 'threat-analysis' as TaraTab, step: 3, label: 'Threat Analysis', description: 'Threat scenario identification (Clause 15.4)', icon: Target },
  { id: 'attack-trees' as TaraTab, step: 4, label: 'Attack Trees', description: 'Visual attack tree diagrams for threat paths', icon: GitBranch },
  { id: 'impact-rating' as TaraTab, step: 5, label: 'Impact Analysis', description: 'Impact rating per damage scenario (Clause 15.5)', icon: Gauge },
  { id: 'attack-path' as TaraTab, step: 6, label: 'Attack Path', description: 'Attack path & vector analysis (Clause 15.6)', icon: Route },
  { id: 'feasibility' as TaraTab, step: 7, label: 'Feasibility', description: 'Attack feasibility rating (Clause 15.7)', icon: Activity },
  { id: 'risk-treatment' as TaraTab, step: 8, label: 'Risk Determination & Decision', description: 'Risk determination & treatment decision (Clause 15.8 & 15.9)', icon: ShieldAlert },
  { id: 'cybersecurity-goals' as TaraTab, step: 9, label: 'Cybersecurity Goals', description: 'Cybersecurity goals, claims & controls (Clause 15.9)', icon: Shield },
  { id: 'residual-risk' as TaraTab, step: 10, label: 'Residual Risk', description: 'Post-treatment feasibility & residual risk assessment', icon: ShieldCheck },
  { id: 'final-tara' as TaraTab, step: 11, label: 'Final TARA', description: 'Consolidated TARA summary view', icon: ClipboardList },
  { id: 'reports' as TaraTab, step: 12, label: 'Reports', description: 'Work products & compliance documentation', icon: FileCheck },
];

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  phase: WorkflowPhase;
  stageStatuses: Record<string, 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed'>;
}

const phaseTabs: Record<WorkspaceTabsProps['phase'], TaraTab[]> = {
  'assets-damage': ['asset-id', 'damage-analysis'],
  'threat-analysis': ['threat-analysis', 'attack-trees', 'attack-path'],
  'risk-treatment': ['impact-rating', 'feasibility', 'risk-treatment', 'cybersecurity-goals', 'residual-risk'],
  'review-publish': ['final-tara', 'reports'],
};

const stageForTab: Partial<Record<TaraTab, number>> = {
  'asset-id': 3,
  'damage-analysis': 4,
  'threat-analysis': 5,
  'attack-trees': 6,
  'attack-path': 6,
  'impact-rating': 7,
  'feasibility': 8,
  'risk-treatment': 9,
  'cybersecurity-goals': 9,
  'residual-risk': 9,
  'final-tara': 9,
};

export function WorkspaceTabs({ activeTab, onTabChange, phase, stageStatuses }: WorkspaceTabsProps) {
  const scenarios = mockThreatScenarios;
  const visibleSteps = useMemo(() => taraSteps.filter((step) => phaseTabs[phase].includes(step.id)), [phase]);

  const mappedTab: TaraTab = visibleSteps.find((step) => step.id === activeTab)?.id ?? visibleSteps[0].id;
  const tabStatuses = visibleSteps.map((step) => {
    const stage = stageForTab[step.id];
    return stage ? stageStatuses[String(stage).padStart(2, '0')] ?? 'not_started' : 'not_started';
  });
  const completedTabs = tabStatuses.filter((status) => status === 'complete').length;
  const progress = calculateSheetProgress(visibleSteps.map((step) => stageForTab[step.id]), stageStatuses);
  const activeStage = stageForTab[mappedTab];
  const activeStatus = activeStage ? stageStatuses[String(activeStage).padStart(2, '0')] ?? 'not_started' : 'not_started';
  const isActiveRunning = activeStatus === 'pending' || activeStatus === 'running';

  return (
      <Tabs value={mappedTab} onValueChange={(v) => onTabChange(v)} className="flex flex-col h-full">
        <div className="border-b border-border bg-card/50 shrink-0">
          <div
            className="flex h-2 gap-px bg-border"
            role="progressbar"
            aria-label={`${phase.replace('-', ' ')} completion: ${completedTabs} of ${visibleSteps.length} sheets`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            {visibleSteps.map((step, index) => {
              const status = tabStatuses[index];
              return (
                <div
                  key={step.id}
                  className="relative flex-1 overflow-hidden bg-muted"
                  title={`${step.label}: ${status.replace('_', ' ')}`}
                >
                  <div className={cn(
                    'absolute inset-0 transition-colors duration-300',
                    status === 'complete' && 'bg-primary',
                    (status === 'pending' || status === 'running') && 'result-progress-running',
                  )} />
                </div>
              );
            })}
          </div>
          
          <TabsList className="h-14 bg-transparent rounded-none px-2 gap-0.5 w-full justify-start overflow-x-auto">
            {visibleSteps.map((step) => {
              const Icon = step.icon;
              const isActive = mappedTab === step.id;
              const stage = stageForTab[step.id];
              const status = stage ? stageStatuses[String(stage).padStart(2, '0')] : 'not_started';
              const isCompleted = status === 'complete';
              
              return (
                <Tooltip key={step.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={step.id}
                      className={cn(
                        "h-12 px-5 gap-3 rounded-none border-b-2 border-transparent transition-all",
                        "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                        "data-[state=active]:text-foreground",
                        "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                        isCompleted && "text-primary/70"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && !isActive && "bg-primary/20 text-primary",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}>
                        {status === 'running' || status === 'pending'
                          ? <LoaderCircle className="size-4 animate-spin" aria-label="Running" />
                          : isCompleted ? '✓' : step.step}
                      </div>
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="text-[15px] font-medium whitespace-nowrap">{step.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>
        </div>

        <div className="result-surface relative flex-1 overflow-hidden">
          <TabsContent value="asset-id" className="h-full m-0 p-0"><AssetDamageTab /></TabsContent>
          <TabsContent value="damage-analysis" className="h-full m-0 p-0"><DamageAnalysisTab /></TabsContent>
          <TabsContent value="threat-analysis" className="h-full m-0 p-0"><ThreatAnalysisTab /></TabsContent>
          <TabsContent value="attack-trees" className="h-full m-0 p-0"><AttackTreesTab /></TabsContent>
          <TabsContent value="impact-rating" className="h-full m-0 p-0"><ImpactRatingTab /></TabsContent>
          <TabsContent value="attack-path" className="h-full m-0 p-0"><AttackPathTab /></TabsContent>
          <TabsContent value="feasibility" className="h-full m-0 p-0"><FeasibilityTab /></TabsContent>
          <TabsContent value="risk-treatment" className="h-full m-0 p-0"><RiskTreatmentTab /></TabsContent>
          <TabsContent value="cybersecurity-goals" className="h-full m-0 p-0"><CybersecurityGoalsTab /></TabsContent>
          <TabsContent value="residual-risk" className="h-full m-0 p-0"><ResidualRiskTab /></TabsContent>
          <TabsContent value="final-tara" className="h-full m-0 p-0"><FinalTaraTab /></TabsContent>
          <TabsContent value="reports" className="h-full m-0 p-0"><ReportExportCenter scenarios={scenarios} /></TabsContent>
          {isActiveRunning && (
            <div className="absolute inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-[2px]" role="status" aria-live="polite">
              <div className="flex min-w-48 flex-col items-center gap-3 rounded-md border bg-card p-6 text-center shadow-sm">
                <LoaderCircle className="size-7 animate-spin text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">Running...</p>
                  <p className="mt-1 text-xs text-muted-foreground">Preparing {visibleSteps.find((step) => step.id === mappedTab)?.label} results</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Tabs>
  );
}
