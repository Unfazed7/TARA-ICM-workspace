import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Link2, 
  AlertTriangle, 
  Shield, 
  Lock,
  Eye,
  Database,
  Zap,
  Settings,
  ChevronRight,
  ExternalLink,
  FileWarning
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  DamageScenario, 
  Asset, 
  impactCategoryDescriptions,
  cybersecurityPropertyDescriptions 
} from '@/types/damage-scenario';
import type { DamageScenario as _DS, Asset as _A } from '@/types/damage-scenario';
const mockDamageScenarios: _DS[] = [];
const mockAssets: _A[] = [];

interface DamageScenarioPanelProps {
  onLinkToThreat?: (damageScenarioId: string) => void;
}

const getImpactIcon = (category: string) => {
  switch (category) {
    case 'safety': return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'financial': return <Zap className="w-3.5 h-3.5" />;
    case 'operational': return <Settings className="w-3.5 h-3.5" />;
    case 'privacy': return <Eye className="w-3.5 h-3.5" />;
    default: return <Shield className="w-3.5 h-3.5" />;
  }
};

const getCybersecurityIcon = (property: string) => {
  switch (property) {
    case 'confidentiality': return <Lock className="w-3 h-3" />;
    case 'integrity': return <Shield className="w-3 h-3" />;
    case 'availability': return <Zap className="w-3 h-3" />;
    default: return <Database className="w-3 h-3" />;
  }
};

const getImpactColor = (rating: string) => {
  switch (rating) {
    case 'severe': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'major': return 'bg-amber/15 text-amber border-amber/30';
    case 'moderate': return 'bg-chart-3/15 text-chart-3 border-chart-3/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getPropertyColor = (property: string) => {
  switch (property) {
    case 'confidentiality': return 'bg-primary/15 text-primary border-primary/30';
    case 'integrity': return 'bg-chart-2/15 text-chart-2 border-chart-2/30';
    case 'availability': return 'bg-chart-4/15 text-chart-4 border-chart-4/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export function DamageScenarioPanel({ onLinkToThreat }: DamageScenarioPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return mockAssets;
    const query = searchQuery.toLowerCase();
    return mockAssets.filter(
      a => a.name.toLowerCase().includes(query) || 
           a.assetId.toLowerCase().includes(query) ||
           a.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const scenariosForAsset = useMemo(() => {
    if (!selectedAsset) return mockDamageScenarios;
    return mockDamageScenarios.filter(ds => ds.assetId === selectedAsset);
  }, [selectedAsset]);

  const toggleScenario = (id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedAssetData = selectedAsset 
    ? mockAssets.find(a => a.id === selectedAsset) 
    : null;

  return (
    <div className="h-full flex bg-background">
      {/* Asset List Panel */}
      <div className="w-72 border-r border-border flex flex-col bg-card/30">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Assets</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {mockAssets.length}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm bg-background"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <button
              onClick={() => setSelectedAsset(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                !selectedAsset 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted/50 text-muted-foreground"
              )}
            >
              All Assets ({mockAssets.length})
            </button>
            <Separator className="my-2" />
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md transition-colors group",
                  selectedAsset === asset.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {asset.assetId}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{asset.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {asset.cybersecurityProperties.map((prop) => (
                        <Tooltip key={prop}>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center",
                              getPropertyColor(prop)
                            )}>
                              {getCybersecurityIcon(prop)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-medium capitalize">{prop}</p>
                            <p className="text-xs text-muted-foreground">
                              {cybersecurityPropertyDescriptions[prop]}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                        {asset.damageScenarioIds.length} DS
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Damage Scenarios Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border bg-card/50 shrink-0">
          <FileWarning className="w-4 h-4 text-primary" />
          <span className="font-medium">Damage Scenarios</span>
          <span className="text-xs text-muted-foreground">
            (ISO 21434 Clause 15.3.2)
          </span>
          {selectedAssetData && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline">{selectedAssetData.name}</Badge>
            </>
          )}
          <div className="flex-1" />
          <Button size="sm" className="h-8 gap-2">
            <Plus className="w-4 h-4" />
            Add Scenario
          </Button>
        </div>

        {/* Scenarios List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {scenariosForAsset.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileWarning className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No damage scenarios defined</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create damage scenarios to link assets to potential harm
                  </p>
                </CardContent>
              </Card>
            ) : (
              scenariosForAsset.map((scenario) => (
                <Collapsible
                  key={scenario.id}
                  open={expandedScenarios.has(scenario.id)}
                  onOpenChange={() => toggleScenario(scenario.id)}
                >
                  <Card className={cn(
                    "transition-all",
                    expandedScenarios.has(scenario.id) && "ring-1 ring-primary/20"
                  )}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {scenario.scenarioId}
                            </span>
                            <div className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center",
                              getImpactColor(scenario.impactRating)
                            )}>
                              {getImpactIcon(scenario.impactCategory)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium">
                              {scenario.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {scenario.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={cn("text-xs gap-1", getPropertyColor(scenario.cybersecurityProperty))}>
                                    {getCybersecurityIcon(scenario.cybersecurityProperty)}
                                    <span className="capitalize">{scenario.cybersecurityProperty}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Compromised Cybersecurity Property</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={cn("text-xs gap-1", getImpactColor(scenario.impactRating))}>
                                    {getImpactIcon(scenario.impactCategory)}
                                    <span className="capitalize">{scenario.impactCategory}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium capitalize">{scenario.impactCategory} Impact</p>
                                  <p className="text-xs text-muted-foreground">
                                    {impactCategoryDescriptions[scenario.impactCategory]}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Badge variant="outline" className={cn("text-xs capitalize", getImpactColor(scenario.impactRating))}>
                                {scenario.impactRating}
                              </Badge>
                              <div className="flex items-center gap-1 ml-auto">
                                <Link2 className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {scenario.linkedThreatScenarios.length} threats
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            expandedScenarios.has(scenario.id) && "rotate-90"
                          )} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <Separator className="mb-4" />
                        <div className="space-y-4">
                          {/* Impact Justification */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Impact Justification
                            </h4>
                            <p className="text-sm bg-muted/30 rounded-md p-3">
                              {scenario.impactJustification}
                            </p>
                          </div>

                          {/* Stakeholders */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Affected Stakeholders
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {scenario.stakeholders.map((stakeholder, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {stakeholder}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Linked Threat Scenarios */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Linked Threat Scenarios
                            </h4>
                            <div className="space-y-1.5">
                              {scenario.linkedThreatScenarios.map((threatId) => (
                                <button
                                  key={threatId}
                                  onClick={() => onLinkToThreat?.(threatId)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group text-left"
                                >
                                  <Shield className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-sm font-mono">{threatId}</span>
                                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-2 gap-2 text-xs"
                            >
                              <Link2 className="w-3 h-3" />
                              Link Additional Threat
                            </Button>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                            <span>Asset: {scenario.assetName}</span>
                            <span>Updated: {new Date(scenario.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="h-8 px-4 flex items-center justify-between border-t border-border bg-card/50 text-xs text-muted-foreground shrink-0">
          <span>{scenariosForAsset.length} damage scenarios</span>
          <span>ISO 21434 WP-15-02: Damage Scenario Analysis</span>
        </div>
      </div>
    </div>
  );
}
