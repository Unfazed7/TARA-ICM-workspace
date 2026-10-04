import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { AssetDamageTab } from './tara-tabs/AssetDamageTab';
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
import { useState } from 'react';
import { ThreatScenario } from '@/types/risk-assessment';
const mockThreatScenarios: ThreatScenario[] = [];

type TaraTab = 'asset-id' | 'threat-analysis' | 'attack-trees' | 'impact-rating' | 'attack-path' | 'feasibility' | 'risk-treatment' | 'cybersecurity-goals' | 'residual-risk' | 'final-tara' | 'reports';

const taraSteps = [
  { id: 'asset-id' as TaraTab, step: 1, label: 'Asset Analysis', description: 'Asset identification & cataloging (Clause 15.3)' },
  { id: 'impact-rating' as TaraTab, step: 2, label: 'Impact Analysis', description: 'Impact rating per damage scenario (Clause 15.5)' },
  { id: 'threat-analysis' as TaraTab, step: 3, label: 'Threat Analysis', description: 'Threat scenario identification (Clause 15.4)' },
  { id: 'attack-trees' as TaraTab, step: 4, label: 'Attack Trees', description: 'Visual attack tree diagrams for threat paths' },
  { id: 'attack-path' as TaraTab, step: 5, label: 'Attack Path', description: 'Attack path & vector analysis (Clause 15.6)' },
  { id: 'feasibility' as TaraTab, step: 6, label: 'Feasibility', description: 'Attack feasibility rating (Clause 15.7)' },
  { id: 'risk-treatment' as TaraTab, step: 7, label: 'Risk Determination & Decision', description: 'Risk determination & treatment decision (Clause 15.8 & 15.9)' },
  { id: 'cybersecurity-goals' as TaraTab, step: 8, label: 'Cybersecurity Goals', description: 'Cybersecurity goals, claims & controls (Clause 15.9)' },
  { id: 'residual-risk' as TaraTab, step: 9, label: 'Residual Risk', description: 'Post-treatment feasibility & residual risk assessment' },
  { id: 'final-tara' as TaraTab, step: 10, label: 'Final TARA', description: 'Consolidated TARA summary view' },
  { id: 'reports' as TaraTab, step: 11, label: 'Reports', description: 'Work products & compliance documentation' },
];

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function WorkspaceTabs({ activeTab, onTabChange }: WorkspaceTabsProps) {
  const [scenarios] = useState<ThreatScenario[]>(mockThreatScenarios);

  const mappedTab: TaraTab = (taraSteps.find(s => s.id === activeTab)?.id) ?? 'asset-id';
  const currentStepIndex = taraSteps.findIndex(s => s.id === mappedTab);

  return (
      <Tabs value={mappedTab} onValueChange={(v) => onTabChange(v)} className="flex flex-col h-full">
        {/* 3a stage nav: surface strip, mono step numbers, 3px primary underline on the active stage. */}
        <div className="border-b border-border bg-muted shrink-0">
          <TabsList className="h-auto bg-transparent rounded-none p-0 px-2 gap-0.5 w-full justify-start overflow-x-auto">
            {taraSteps.map((step, index) => {
              const isActive = mappedTab === step.id;
              const isCompleted = index < currentStepIndex;

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
                      <span className="font-mono">{String(step.step).padStart(2, '0')}</span>
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

        <div className="flex-1 overflow-hidden">
          <TabsContent value="asset-id" className="h-full m-0 p-0"><AssetDamageTab /></TabsContent>
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
        </div>
      </Tabs>
  );
}

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
