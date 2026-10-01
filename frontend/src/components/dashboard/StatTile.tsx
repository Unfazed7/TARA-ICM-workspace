import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Project } from '@/types/tara';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  accentClass?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  projects?: Project[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archived: 'bg-muted text-muted-foreground',
};

export function StatTile({ label, value, icon: Icon, subtitle, accentClass, dialogTitle, dialogDescription, projects = [] }: StatTileProps) {
  const [open, setOpen] = useState(false);
  const hasPopup = projects.length > 0 || dialogTitle;

  return (
    <>
      <div
        className={cn(
          'bento-tile group relative overflow-hidden flex flex-col justify-between p-5 bg-[hsl(0_0%_100%/0.03)] hover:bg-[hsl(0_0%_100%/0.07)] transition-colors',
          hasPopup && 'cursor-pointer'
        )}
        onClick={() => hasPopup && setOpen(true)}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <Icon className={cn('w-4 h-4 text-muted-foreground', accentClass)} />
        </div>
        <div className="mt-auto">
          <p className="text-5xl font-bold font-mono gradient-number">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      {hasPopup && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg glass-card-premium border-border/30">
            <DialogHeader>
              <DialogTitle className="gradient-text">{dialogTitle || label}</DialogTitle>
              {dialogDescription && (
                <DialogDescription>{dialogDescription}</DialogDescription>
              )}
            </DialogHeader>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items to display.
                </p>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                        {' · '}
                        {p.domains.slice(0, 2).join(', ')}
                        {p.domains.length > 2 ? ` +${p.domains.length - 2}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={cn('text-[10px] capitalize border', statusColors[p.status])}>
                        {p.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {p.completionPercentage ?? 0}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
