import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StreamColumnProps {
  stepNumber: number;
  title: string;
  subtitle?: ReactNode;
  emptyMessage: string;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
  isLast?: boolean;
}

export function StreamColumn({
  stepNumber,
  title,
  subtitle,
  emptyMessage,
  onAdd,
  addLabel = 'Add',
  children,
  isLast,
}: StreamColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full min-w-[250px] bg-[#0b0f17]/80 backdrop-blur-xl',
        !isLast && 'border-r border-white/10'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold shrink-0">
              {stepNumber}
            </span>
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-medium truncate">
              {title}
            </h3>
          </div>
          {subtitle && <div className="text-[10px] text-slate-600 mt-1 truncate pl-7">{subtitle}</div>}
        </div>
        {onAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-[10px] h-7 px-2 shrink-0"
          >
            <Plus className="w-3 h-3 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

interface StreamItemProps {
  id: string;
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function StreamItem({ id, isSelected, onClick, children }: StreamItemProps) {
  return (
    <button
      data-id={id}
      onClick={onClick}
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
      {children}
    </button>
  );
}

export function StreamEmpty({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs px-6 text-center h-full min-h-[120px]">
      {message}
    </div>
  );
}
