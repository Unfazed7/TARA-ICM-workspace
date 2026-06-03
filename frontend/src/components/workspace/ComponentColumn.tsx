import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { VehicleComponent, FunctionComponentMapping } from '@/data/mock-feature-analysis';

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
      <div className="flex flex-col h-full bg-[#0b0f17] border-r border-white/5">
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium">
            Allocated Components
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xs px-6 text-center">
          Select a function to view component allocation
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] border-r border-white/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium">
          Allocated Components
        </h3>
        <div className="text-[10px] text-slate-600 mt-1">
          Realized by: <span className="text-cyan-400/80">{functionName}</span>
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
                'w-full text-left px-4 py-3 border-b border-white/5 transition-all flex items-center gap-3 relative',
                isSelected && mapped
                  ? 'bg-cyan-500/10 text-cyan-300'
                  : mapped
                  ? 'text-slate-200 hover:bg-white/[0.03]'
                  : 'text-slate-500 hover:bg-white/[0.03]'
              )}
            >
              {isSelected && mapped && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500 shadow-[0_0_10px_cyan]" />
              )}
              <Checkbox
                checked={mapped}
                onCheckedChange={() => onToggleMapping(selectedFunctionId, comp.id)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500',
                )}
              />
              <span className="text-xs font-medium">{comp.name}</span>
              {mapped && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_cyan]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
