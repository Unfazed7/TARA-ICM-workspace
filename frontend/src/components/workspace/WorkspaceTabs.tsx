import { Target, Gauge, Route, Activity, FileCheck, ShieldAlert, GitBranch, Package, ClipboardList, Shield, ShieldCheck } from 'lucide-react';
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
import { mockThreatScenarios } from '@/data/mock-threat-scenarios';
import { useState } from 'react';
import { ThreatScenario } from '@/types/risk-assessment';

type TaraTab = 'asset-id' | 'threat-analysis' | 'attack-trees' | 'impact-rating' | 'attack-path' | 'feasibility' | 'risk-treatment' | 'cybersecurity-goals' | 'residual-risk' | 'final-tara' | 'reports';

const taraSteps = [
  { id: 'asset-id' as TaraTab, step: 1, label: 'Asset Analysis', description: 'Asset identification & cataloging (Clause 15.3)', icon: Package },
  { id: 'impact-rating' as TaraTab, step: 2, label: 'Impact Analysis', description: 'Impact rating per damage scenario (Clause 15.5)', icon: Gauge },
  { id: 'threat-analysis' as TaraTab, step: 3, label: 'Threat Analysis', description: 'Threat scenario identification (Clause 15.4)', icon: Target },
  { id: 'attack-trees' as TaraTab, step: 4, label: 'Attack Trees', description: 'Visual attack tree diagrams for threat paths', icon: GitBranch },
  { id: 'attack-path' as TaraTab, step: 5, label: 'Attack Path', description: 'Attack path & vector analysis (Clause 15.6)', icon: Route },
  { id: 'feasibility' as TaraTab, step: 6, label: 'Feasibility', description: 'Attack feasibility rating (Clause 15.7)', icon: Activity },
  { id: 'risk-treatment' as TaraTab, step: 7, label: 'Risk Determination & Decision', description: 'Risk determination & treatment decision (Clause 15.8 & 15.9)', icon: ShieldAlert },
  { id: 'cybersecurity-goals' as TaraTab, step: 8, label: 'Cybersecurity Goals', description: 'Cybersecurity goals, claims & controls (Clause 15.9)', icon: Shield },
  { id: 'residual-risk' as TaraTab, step: 9, label: 'Residual Risk', description: 'Post-treatment feasibility & residual risk assessment', icon: ShieldCheck },
  { id: 'final-tara' as TaraTab, step: 10, label: 'Final TARA', description: 'Consolidated TARA summary view', icon: ClipboardList },
  { id: 'reports' as TaraTab, step: 11, label: 'Reports', description: 'Work products & compliance documentation', icon: FileCheck },
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
        <div className="border-b border-border bg-card/50 shrink-0">
          <div className="h-1 bg-muted/50 relative">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentStepIndex + 1) / taraSteps.length) * 100}%` }}
            />
          </div>
          
          <TabsList className="h-14 bg-transparent rounded-none px-2 gap-0.5 w-full justify-start overflow-x-auto">
            {taraSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = mappedTab === step.id;
              const isCompleted = index < currentStepIndex;
              
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
                        {step.step}
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
