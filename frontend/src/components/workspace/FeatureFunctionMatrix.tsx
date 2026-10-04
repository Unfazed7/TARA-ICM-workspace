import { cn } from '@/lib/utils';
import type { VehicleComponent, FeatureFunction, FunctionComponentMapping } from '@/data/feature-types';

interface Props {
  components: VehicleComponent[];
  functions: FeatureFunction[];
  mappings: FunctionComponentMapping[];
  selectedFunctionId: string | null;
  onToggleMapping: (functionId: string, componentId: string) => void;
  onSelectFunction: (functionId: string) => void;
}

export function FeatureFunctionMatrix({
  components,
  functions,
  mappings,
  selectedFunctionId,
  onToggleMapping,
  onSelectFunction,
}: Props) {
  const isMapped = (fId: string, cId: string) =>
    mappings.some((m) => m.functionId === fId && m.componentId === cId);

  const rotateHeaders = components.length > 5;

  return (
    <div className="h-full overflow-auto bg-card backdrop-blur-xl">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {/* Corner cell */}
            <th className="sticky top-0 left-0 z-30 w-64 min-w-[16rem] bg-card border-b border-r border-border p-3">
              <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                Function / Component
              </span>
            </th>
            {components.map((comp) => (
              <th
                key={comp.id}
                className="sticky top-0 z-20 bg-card border-b border-border p-2 min-w-[4rem]"
              >
                <div className={cn('flex items-center justify-center', rotateHeaders ? 'h-24' : 'h-10')}>
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium whitespace-nowrap',
                      rotateHeaders && '-rotate-45 origin-center'
                    )}
                  >
                    {comp.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {functions.map((fn) => {
            const isSelected = fn.id === selectedFunctionId;
            return (
              <tr
                key={fn.id}
                className={cn(
                  'transition-colors',
                  isSelected && 'bg-primary/5'
                )}
              >
                <td
                  className={cn(
                    'sticky left-0 z-10 w-64 min-w-[16rem] border-r border-b border-border p-3 cursor-pointer transition-colors',
                    isSelected ? 'bg-card text-primary' : 'bg-card text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onSelectFunction(fn.id)}
                >
                  <span className="text-[11px] uppercase tracking-[0.12em] font-medium">
                    {fn.name}
                  </span>
                </td>
                {components.map((comp) => {
                  const mapped = isMapped(fn.id, comp.id);
                  return (
                    <td
                      key={comp.id}
                      className="border-b border-border p-0"
                    >
                      <button
                        onClick={() => {
                          onToggleMapping(fn.id, comp.id);
                          onSelectFunction(fn.id);
                        }}
                        className={cn(
                          'w-full h-12 flex items-center justify-center transition-all',
                          'bg-foreground/5 border border-border hover:bg-primary/20'
                        )}
                      >
                        {mapped && (
                          <div className="w-3 h-3 rounded-full bg-primary" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
