import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FeatureFunction } from '@/data/feature-types';

interface Props {
  functions: FeatureFunction[];
  selectedFunctionId: string | null;
  onSelectFunction: (id: string) => void;
}

export function FunctionColumn({ functions, selectedFunctionId, onSelectFunction }: Props) {
  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
            Item Functions
          </h3>
          <span className="text-[10px] text-muted-foreground/70">Clause 9.3</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-[10px] h-7 px-2"
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
                'w-full text-left px-4 py-3 border-b border-border transition-all relative',
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]'
              )}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
              )}
              <div className="text-xs font-medium">{fn.name}</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{fn.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
