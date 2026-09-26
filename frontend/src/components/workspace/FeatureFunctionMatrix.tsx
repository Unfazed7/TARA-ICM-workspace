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
    <div className="h-full overflow-auto bg-[#0b0f17] backdrop-blur-xl">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {/* Corner cell */}
            <th className="sticky top-0 left-0 z-30 w-64 min-w-[16rem] bg-[#0b0f17] border-b border-r border-white/5 p-3">
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-medium">
                Function / Component
              </span>
            </th>
            {components.map((comp) => (
              <th
                key={comp.id}
                className="sticky top-0 z-20 bg-[#0b0f17] border-b border-white/5 p-2 min-w-[4rem]"
              >
                <div className={cn('flex items-center justify-center', rotateHeaders ? 'h-24' : 'h-10')}>
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium whitespace-nowrap',
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
                  isSelected && 'bg-cyan-500/5'
                )}
              >
                <td
                  className={cn(
                    'sticky left-0 z-10 w-64 min-w-[16rem] border-r border-b border-white/5 p-3 cursor-pointer transition-colors',
                    isSelected ? 'bg-[#0b0f17] text-cyan-300' : 'bg-[#0b0f17] text-slate-400 hover:text-white'
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
                      className="border-b border-white/5 p-0"
                    >
                      <button
                        onClick={() => {
                          onToggleMapping(fn.id, comp.id);
                          onSelectFunction(fn.id);
                        }}
                        className={cn(
                          'w-full h-12 flex items-center justify-center transition-all',
                          'bg-white/5 border border-white/5 hover:bg-blue-500/20'
                        )}
                      >
                        {mapped && (
                          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_cyan]" />
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
