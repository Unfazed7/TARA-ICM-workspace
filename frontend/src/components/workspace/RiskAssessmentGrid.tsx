import { useState, useMemo, useCallback, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Plus, 
  ArrowUpDown,
  Shield,
  AlertTriangle,
  DollarSign,
  Settings,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  ThreatScenario, 
  ImpactLevel, 
  TreatmentDecision,
  calculateMaxImpact,
  calculateFeasibility,
  calculateRiskValue,
  getRiskColor,
  getRiskLabel,
} from '@/types/risk-assessment';
import { RiskMatrix } from './RiskMatrix';

interface RiskAssessmentGridProps {
  scenarios: ThreatScenario[];
  onScenariosChange: (scenarios: ThreatScenario[]) => void;
  onRowSelect?: (scenarioId: string | null) => void;
  selectedRowId?: string | null;
  isAnalystMode?: boolean;
  className?: string;
}

const impactOptions: { value: ImpactLevel; label: string }[] = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

const treatmentOptions: { value: TreatmentDecision; label: string }[] = [
  { value: 'avoid', label: 'Avoid' },
  { value: 'reduce', label: 'Reduce' },
  { value: 'share', label: 'Share' },
  { value: 'accept', label: 'Accept' },
];

const ImpactIcon = ({ type }: { type: 'S' | 'F' | 'O' | 'P' }) => {
  const icons = {
    S: Shield,
    F: DollarSign,
    O: Settings,
    P: User,
  };
  const Icon = icons[type];
  return <Icon className="w-3 h-3" />;
};

const ImpactCell = memo(function ImpactCell({ 
  value, 
  onChange,
  disabled 
}: { 
  value: ImpactLevel; 
  onChange: (value: ImpactLevel) => void;
  disabled?: boolean;
}) {
  const colorMap: Record<ImpactLevel, string> = {
    negligible: 'bg-sage/20 text-sage border-sage/30',
    moderate: 'bg-dusty-amber/20 text-dusty-amber border-dusty-amber/30',
    major: 'bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/30',
    severe: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-24 text-xs border", colorMap[value])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {impactOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

const RiskBadge = memo(function RiskBadge({ value }: { value: number }) {
  const bgColors: Record<number, string> = {
    1: 'bg-sage/20 text-sage border-sage/30',
    2: 'bg-[hsl(142,71%,45%)]/20 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/30',
    3: 'bg-dusty-amber/20 text-dusty-amber border-dusty-amber/30',
    4: 'bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/30',
    5: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <Badge variant="outline" className={cn("font-mono text-xs", bgColors[value])}>
      {value} - {getRiskLabel(value)}
    </Badge>
  );
});

export function RiskAssessmentGrid({
  scenarios,
  onScenariosChange,
  onRowSelect,
  selectedRowId,
  isAnalystMode = false,
  className,
}: RiskAssessmentGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const updateScenario = useCallback((id: string, updates: Partial<ThreatScenario>) => {
    onScenariosChange(scenarios.map(s => {
      if (s.id !== id) return s;
      
      const updated = { ...s, ...updates, lastModified: new Date().toISOString() };
      
      // Recalculate if impact or feasibility changed
      if (updates.impactSafety || updates.impactFinancial || updates.impactOperational || 
          updates.impactPrivacy || updates.feasibilityFactors) {
        const maxImpact = calculateMaxImpact(updated);
        const feasibility = updates.feasibilityFactors 
          ? calculateFeasibility(updates.feasibilityFactors)
          : s.feasibilityScore;
        updated.feasibilityScore = feasibility;
        updated.riskValue = calculateRiskValue(maxImpact, feasibility);
      }
      
      return updated;
    }));
  }, [scenarios, onScenariosChange]);

  const columns = useMemo<ColumnDef<ThreatScenario>[]>(() => [
    {
      accessorKey: 'threatId',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 -ml-2 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Threat ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs text-primary">
          {row.original.threatId}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: 'name',
      header: 'Threat Scenario',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate">{row.original.name}</div>
          <div className="text-xs text-muted-foreground truncate">{row.original.targetAsset}</div>
        </div>
      ),
      size: 220,
    },
    {
      id: 'impactS',
      header: () => (
        <div className="flex items-center gap-1">
          <ImpactIcon type="S" />
          <span>S</span>
        </div>
      ),
      cell: ({ row }) => (
        <ImpactCell
          value={row.original.impactSafety}
          onChange={(v) => updateScenario(row.original.id, { impactSafety: v })}
          disabled={isAnalystMode}
        />
      ),
      size: 110,
    },
    {
      id: 'impactF',
      header: () => (
        <div className="flex items-center gap-1">
          <ImpactIcon type="F" />
          <span>F</span>
        </div>
      ),
      cell: ({ row }) => (
        <ImpactCell
          value={row.original.impactFinancial}
          onChange={(v) => updateScenario(row.original.id, { impactFinancial: v })}
          disabled={isAnalystMode}
        />
      ),
      size: 110,
    },
    {
      id: 'impactO',
      header: () => (
        <div className="flex items-center gap-1">
          <ImpactIcon type="O" />
          <span>O</span>
        </div>
      ),
      cell: ({ row }) => (
        <ImpactCell
          value={row.original.impactOperational}
          onChange={(v) => updateScenario(row.original.id, { impactOperational: v })}
          disabled={isAnalystMode}
        />
      ),
      size: 110,
    },
    {
      id: 'impactP',
      header: () => (
        <div className="flex items-center gap-1">
          <ImpactIcon type="P" />
          <span>P</span>
        </div>
      ),
      cell: ({ row }) => (
        <ImpactCell
          value={row.original.impactPrivacy}
          onChange={(v) => updateScenario(row.original.id, { impactPrivacy: v })}
          disabled={isAnalystMode}
        />
      ),
      size: 110,
    },
    {
      accessorKey: 'feasibilityScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 -ml-2 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Feasibility
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{row.original.feasibilityScore}/5</span>
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${(row.original.feasibilityScore / 5) * 100}%` }}
            />
          </div>
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'riskValue',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 -ml-2 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Risk Value
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <RiskBadge value={row.original.riskValue} />,
      size: 140,
    },
    {
      accessorKey: 'treatmentDecision',
      header: 'Treatment',
      cell: ({ row }) => (
        <Select
          value={row.original.treatmentDecision}
          onValueChange={(v: TreatmentDecision) => updateScenario(row.original.id, { treatmentDecision: v })}
          disabled={isAnalystMode}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {treatmentOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs capitalize">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      size: 110,
    },
    {
      accessorKey: 'cybersecurityGoal',
      header: 'Cybersecurity Goal',
      cell: ({ row }) => (
        <div className="max-w-[250px] text-xs text-muted-foreground truncate">
          {row.original.cybersecurityGoal}
        </div>
      ),
      size: 260,
    },
  ], [updateScenario, isAnalystMode]);

  const table = useReactTable({
    data: scenarios,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleRowClick = useCallback((scenarioId: string) => {
    onRowSelect?.(selectedRowId === scenarioId ? null : scenarioId);
  }, [selectedRowId, onRowSelect]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search threat scenarios..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          {!isAnalystMode && (
            <Button size="sm" className="h-9 gap-2">
              <Plus className="w-4 h-4" />
              Add Threat
            </Button>
          )}
        </div>
      </div>

      {/* Main content area with grid and matrix */}
      <div className="flex-1 flex overflow-hidden">
        {/* Data Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="min-w-max">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
                {table.getHeaderGroups().map(headerGroup => (
                  <div key={headerGroup.id} className="flex">
                    {headerGroup.headers.map(header => (
                      <div
                        key={header.id}
                        className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        style={{ width: header.column.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Body */}
              <div>
                {table.getRowModel().rows.map(row => {
                  const isApproved = row.original.reviewStatus === 'approved';
                  const isSelected = row.original.id === selectedRowId;
                  
                  return (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row.original.id)}
                      className={cn(
                        "flex border-b border-border/50 cursor-pointer transition-all hover:bg-muted/30",
                        isSelected && "bg-primary/10 ring-1 ring-primary/30",
                        isApproved && "bg-sage/5"
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <div
                          key={cell.id}
                          className="px-4 py-3 flex items-center"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/50 text-xs text-muted-foreground">
            <span>
              {table.getFilteredRowModel().rows.length} of {scenarios.length} threat scenarios
            </span>
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Risk Matrix HUD */}
        <div className="w-56 border-l border-border p-4 bg-card/30 shrink-0">
          <RiskMatrix 
            scenarios={scenarios} 
            highlightedId={selectedRowId}
          />
        </div>
      </div>
    </div>
  );
}
