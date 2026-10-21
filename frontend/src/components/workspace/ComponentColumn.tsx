import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { VehicleComponent, FunctionComponentMapping } from '@/data/feature-types';

interface Props {
  functionName: string | null;
  components: VehicleComponent[];
  mappings: FunctionComponentMapping[];
  selectedFunctionId: string | null;
  selectedComponentId: string | null;
  onToggleMapping: (functionId: string, componentId: string) => void;
  onSelectComponent: (componentId: string) => void;
}

export function ComponentColumn({
  functionName,
  components,
  mappings,
  selectedFunctionId,
  selectedComponentId,
  onToggleMapping,
  onSelectComponent,
}: Props) {
  const isMapped = (compId: string) =>
    selectedFunctionId
      ? mappings.some((m) => m.functionId === selectedFunctionId && m.componentId === compId)
      : false;

  if (!selectedFunctionId) {
    return (
      <div className="flex flex-col h-full bg-card border-r border-border">
        <div className="flex items-center px-4 py-3 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
            Allocated Components
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground/70 text-xs px-6 text-center">
          Select a function to view component allocation
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
          Allocated Components
        </h3>
        <div className="text-[10px] text-muted-foreground/70 mt-1">
          Realized by: <span className="text-primary/80">{functionName}</span>
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-auto">
        {components.map((comp) => {
          const mapped = isMapped(comp.id);
          const isSelected = comp.id === selectedComponentId;
          return (
            <button
              key={comp.id}
              data-id={comp.id}
              data-mapped={mapped ? 'true' : 'false'}
              onClick={() => {
                if (!mapped) {
                  onToggleMapping(selectedFunctionId, comp.id);
                }
                onSelectComponent(comp.id);
              }}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-border transition-all flex items-center gap-3 relative',
                isSelected && mapped
                  ? 'bg-primary/10 text-primary'
                  : mapped
                  ? 'text-foreground hover:bg-foreground/[0.03]'
                  : 'text-muted-foreground hover:bg-foreground/[0.03]'
              )}
            >
              {isSelected && mapped && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
              )}
              <Checkbox
                checked={mapped}
                onCheckedChange={() => onToggleMapping(selectedFunctionId, comp.id)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary',
                )}
              />
              <span className="text-xs font-medium">{comp.name}</span>
              {mapped && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
