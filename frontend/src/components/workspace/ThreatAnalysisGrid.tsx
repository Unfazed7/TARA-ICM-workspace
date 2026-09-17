import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  ArrowUpDown,
  ChevronDown,
  AlertTriangle,
  Shield,
  Zap,
  FileWarning,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DamageScenarioPanel } from './DamageScenarioPanel';

interface ThreatRow {
  id: string;
  threatId: string;
  name: string;
  targetAsset: string;
  attackVector: string;
  impact: 'safety' | 'financial' | 'operational' | 'privacy';
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: number;
  status: 'identified' | 'analyzed' | 'mitigated';
}

const mockThreats: ThreatRow[] = [
  {
    id: '1',
    threatId: 'T-001',
    name: 'CAN Bus Message Injection',
    targetAsset: 'Engine ECU',
    attackVector: 'Physical Access',
    impact: 'safety',
    likelihood: 'medium',
    riskLevel: 8,
    status: 'analyzed',
  },
  {
    id: '2',
    threatId: 'T-002',
    name: 'Firmware Tampering',
    targetAsset: 'Gateway',
    attackVector: 'Remote Exploitation',
    impact: 'safety',
    likelihood: 'low',
    riskLevel: 7,
    status: 'identified',
  },
  {
    id: '3',
    threatId: 'T-003',
    name: 'Diagnostic Protocol Abuse',
    targetAsset: 'ABS Module',
    attackVector: 'Local Network',
    impact: 'safety',
    likelihood: 'high',
    riskLevel: 9,
    status: 'identified',
  },
  {
    id: '4',
    threatId: 'T-004',
    name: 'Replay Attack on Keyless Entry',
    targetAsset: 'Body Controller',
    attackVector: 'Wireless',
    impact: 'financial',
    likelihood: 'high',
    riskLevel: 6,
    status: 'mitigated',
  },
  {
    id: '5',
    threatId: 'T-005',
    name: 'Telematics Data Interception',
    targetAsset: 'Head Unit',
    attackVector: 'Remote Exploitation',
    impact: 'privacy',
    likelihood: 'medium',
    riskLevel: 5,
    status: 'analyzed',
  },
  {
    id: '6',
    threatId: 'T-006',
    name: 'DoS on CAN Network',
    targetAsset: 'CAN-HS Bus',
    attackVector: 'Physical Access',
    impact: 'operational',
    likelihood: 'medium',
    riskLevel: 7,
    status: 'identified',
  },
];

export function ThreatAnalysisGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'damage' | 'threats'>('damage');

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'critical': return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'high': return 'bg-amber/15 text-amber border-amber/30';
      case 'medium': return 'bg-chart-3/15 text-chart-3 border-chart-3/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'safety': return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
      case 'financial': return <Zap className="w-3.5 h-3.5 text-amber" />;
      default: return <Shield className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mitigated': return 'bg-primary/15 text-primary border-primary/30';
      case 'analyzed': return 'bg-amber/15 text-amber border-amber/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 8) return 'text-destructive';
    if (risk >= 6) return 'text-amber';
    if (risk >= 4) return 'text-chart-3';
    return 'text-muted-foreground';
  };

  const filteredThreats = mockThreats.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.threatId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.targetAsset.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLinkToThreat = (threatId: string) => {
    setActiveSubTab('threats');
    const threat = mockThreats.find(t => t.threatId === threatId);
    if (threat) {
      setSelectedRow(threat.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Sub-tabs for Damage Scenarios and Threat Scenarios */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'damage' | 'threats')} className="flex flex-col h-full">
        <div className="border-b border-border bg-muted/30 shrink-0">
          <TabsList className="h-10 bg-transparent rounded-none px-4 gap-2">
            <TabsTrigger 
              value="damage" 
              className="h-8 px-4 gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <FileWarning className="w-4 h-4" />
              Damage Scenarios
              <Badge variant="secondary" className="ml-1 text-xs h-5">
                6
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="threats" 
              className="h-8 px-4 gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Target className="w-4 h-4" />
              Threat Scenarios
              <Badge variant="secondary" className="ml-1 text-xs h-5">
                {mockThreats.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="damage" className="flex-1 m-0 p-0">
          <DamageScenarioPanel onLinkToThreat={handleLinkToThreat} />
        </TabsContent>

        <TabsContent value="threats" className="flex-1 m-0 p-0 flex flex-col">
          {/* Toolbar */}
          <div className="h-12 px-4 flex items-center gap-3 border-b border-border bg-card/50 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search threats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 bg-background"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>By Likelihood</DropdownMenuItem>
                <DropdownMenuItem>By Impact</DropdownMenuItem>
                <DropdownMenuItem>By Status</DropdownMenuItem>
                <DropdownMenuItem>By Risk Level</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />

            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" className="h-8 gap-2">
              <Plus className="w-4 h-4" />
              Add Threat
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 -ml-3 font-semibold">
                      ID
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 -ml-3 font-semibold">
                      Threat Name
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Target Asset</TableHead>
                  <TableHead>Attack Vector</TableHead>
                  <TableHead className="text-center">Impact</TableHead>
                  <TableHead className="text-center">Likelihood</TableHead>
                  <TableHead className="text-center w-[80px]">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 font-semibold">
                      Risk
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThreats.map((threat) => (
                  <TableRow
                    key={threat.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedRow === threat.id && "bg-muted/50"
                    )}
                    onClick={() => setSelectedRow(threat.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {threat.threatId}
                    </TableCell>
                    <TableCell className="font-medium">{threat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{threat.targetAsset}</TableCell>
                    <TableCell className="text-muted-foreground">{threat.attackVector}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getImpactIcon(threat.impact)}
                        <span className="text-xs capitalize">{threat.impact}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-xs capitalize", getLikelihoodColor(threat.likelihood))}>
                        {threat.likelihood}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-mono font-bold", getRiskColor(threat.riskLevel))}>
                        {threat.riskLevel}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-xs capitalize", getStatusColor(threat.status))}>
                        {threat.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="h-8 px-4 flex items-center justify-between border-t border-border bg-card/50 text-xs text-muted-foreground shrink-0">
            <span>{filteredThreats.length} threats</span>
            <span>ISO 21434 WP-15-03: Threat Scenario Identification</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
