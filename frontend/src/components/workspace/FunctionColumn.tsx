import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FeatureFunction } from '@/data/mock-feature-analysis';

interface Props {
  functions: FeatureFunction[];
  selectedFunctionId: string | null;
  onSelectFunction: (id: string) => void;
}

export function FunctionColumn({ functions, selectedFunctionId, onSelectFunction }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0b0f17] border-r border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium">
            Item Functions
          </h3>
          <span className="text-[10px] text-slate-600">Clause 9.3</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-[10px] h-7 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Function List */}
      <div className="flex-1 overflow-auto">
        {functions.map((fn) => {
          const isSelected = fn.id === selectedFunctionId;
          return (
            <button
              key={fn.id}
              data-id={fn.id}
              onClick={() => onSelectFunction(fn.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-white/5 transition-all relative',
                isSelected
                  ? 'bg-cyan-500/10 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
              )}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500 shadow-[0_0_10px_cyan]" />
              )}
              <div className="text-xs font-medium">{fn.name}</div>
              <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{fn.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
