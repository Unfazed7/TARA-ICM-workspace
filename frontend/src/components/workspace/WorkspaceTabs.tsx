import { Check, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { AssetDamageTab } from './tara-tabs/AssetDamageTab';
import { DamageAnalysisTab } from './tara-tabs/DamageAnalysisTab';
import { ThreatAnalysisTab } from './tara-tabs/ThreatAnalysisTab';
import { ImpactRatingTab } from './tara-tabs/ImpactRatingTab';
import { AttackPathTab } from './tara-tabs/AttackPathTab';
import { RiskScoringTab } from './tara-tabs/RiskScoringTab';
import { RiskTreatmentTab } from './tara-tabs/RiskTreatmentTab';
import { CybersecurityGoalsTab } from './tara-tabs/CybersecurityGoalsTab';
import { AttackTreesTab } from './tara-tabs/AttackTreesTab';
import { ResidualRiskTab } from './tara-tabs/ResidualRiskTab';
import { FinalTaraTab } from './tara-tabs/FinalTaraTab';
import { ReportExportCenter } from './ReportExportCenter';
import { useMemo } from 'react';
import { ThreatScenario } from '@/types/risk-assessment';
import { calculateSheetProgress, phaseTabs, stageForTab, type StageStatus, type TaraTab, type WorkflowPhase } from '@/lib/workflow';
const mockThreatScenarios: ThreatScenario[] = [];

const taraSteps: { id: TaraTab; label: string; description: string }[] = [
  { id: 'asset-id', label: 'Asset Analysis', description: 'Asset identification & cataloging (Clause 15.3)' },
  { id: 'damage-analysis', label: 'Damage Analysis', description: 'Damage scenarios by asset and CIAAAN property (Clause 15.4)' },
  { id: 'threat-analysis', label: 'Threat Analysis', description: 'Threat scenario identification (Clause 15.4)' },
  { id: 'attack-trees', label: 'Attack Trees', description: 'Visual attack tree diagrams for threat paths' },
  { id: 'impact-rating', label: 'Impact Analysis', description: 'Impact rating per damage scenario (Clause 15.5)' },
  { id: 'attack-path', label: 'Attack Path', description: 'Attack path & vector analysis (Clause 15.6)' },
  { id: 'feasibility', label: 'Risk Scoring', description: 'Risk ranking from impact and attack feasibility (Clause 15.8)' },
  { id: 'risk-treatment', label: 'Risk Determination & Decision', description: 'Risk determination & treatment decision (Clause 15.8 & 15.9)' },
  { id: 'cybersecurity-goals', label: 'Cybersecurity Goals', description: 'Cybersecurity goals, claims & controls (Clause 15.9)' },
  { id: 'residual-risk', label: 'Residual Risk', description: 'Post-treatment feasibility & residual risk assessment' },
  { id: 'final-tara', label: 'Final TARA', description: 'Consolidated TARA summary view' },
  { id: 'reports', label: 'Reports', description: 'Work products & compliance documentation' },
];

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  phase: WorkflowPhase;
  stageStatuses: Record<string, StageStatus>;
}

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
        <div className="border-b border-border bg-muted shrink-0">
          <div
            className="flex h-1.5 gap-px bg-border"
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
                    status === 'complete' && 'bg-state-green-foreground',
                    (status === 'pending' || status === 'running') && 'result-progress-running',
                  )} />
                </div>
              );
            })}
          </div>

          <TabsList className="h-auto bg-transparent rounded-none p-0 px-2 gap-0.5 w-full justify-start overflow-x-auto">
            {visibleSteps.map((step) => {
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
                        "px-2 py-2.5 gap-1.5 rounded-none text-[13px] font-normal whitespace-nowrap transition-colors",
                        "text-muted-foreground hover:text-foreground",
                        // data-state is taken over by the wrapping TooltipTrigger, so style off isActive.
                        isActive && "aegis-tab-active text-foreground",
                        isCompleted && "text-foreground"
                      )}
                    >
                      {stage !== undefined && <span className="aegis-mono">{String(stage).padStart(2, '0')}</span>}
                      {status === 'running' || status === 'pending'
                        ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-label="Running" />
                        : isCompleted ? <Check className="size-3.5 text-state-green-foreground" aria-label="Done" /> : null}
                      <span>{step.label}</span>
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
          <TabsContent value="feasibility" className="h-full m-0 p-0"><RiskScoringTab /></TabsContent>
          <TabsContent value="risk-treatment" className="h-full m-0 p-0"><RiskTreatmentTab /></TabsContent>
          <TabsContent value="cybersecurity-goals" className="h-full m-0 p-0"><CybersecurityGoalsTab /></TabsContent>
          <TabsContent value="residual-risk" className="h-full m-0 p-0"><ResidualRiskTab /></TabsContent>
          <TabsContent value="final-tara" className="h-full m-0 p-0"><FinalTaraTab /></TabsContent>
          <TabsContent value="reports" className="h-full m-0 p-0"><ReportExportCenter scenarios={scenarios} /></TabsContent>
          {isActiveRunning && (
            <div className="absolute inset-0 z-50 grid place-items-center bg-background/80" role="status" aria-live="polite">
              <div className="flex min-w-48 flex-col items-center gap-3 aegis-card p-6 text-center">
                <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none text-state-blue-foreground" aria-hidden="true" />
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
