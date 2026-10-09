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
        'flex flex-col h-full min-w-[250px] bg-card/80 backdrop-blur-xl',
        !isLast && 'border-r border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0">
              {stepNumber}
            </span>
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium truncate">
              {title}
            </h3>
          </div>
          {subtitle && <div className="text-[10px] text-muted-foreground/70 mt-1 truncate pl-7">{subtitle}</div>}
        </div>
        {onAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-[10px] h-7 px-2 shrink-0"
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
        'w-full text-left px-4 py-3 border-b border-border transition-all relative',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]'
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
      )}
      {children}
    </button>
  );
}

export function StreamEmpty({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground/70 text-xs px-6 text-center h-full min-h-[120px]">
      {message}
    </div>
  );
}
