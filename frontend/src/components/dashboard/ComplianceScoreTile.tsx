import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Project } from '@/types/tara';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface ComplianceScoreTileProps {
  score: number;
  projects?: Project[];
}

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-primary';
  if (score >= 40) return 'text-signal-ink';
  return 'text-destructive';
};

const getStatusIcon = (pct: number) => {
  if (pct >= 80) return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
  if (pct >= 40) return <Clock className="w-3.5 h-3.5 text-signal-ink" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
};

export function ComplianceScoreTile({ score, projects = [] }: ComplianceScoreTileProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="bento-tile group relative overflow-hidden flex flex-col justify-between p-5 bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Compliance Score
        </p>

        <div className="mt-auto space-y-3">
          <p className={cn('text-5xl font-bold font-mono gradient-number', getScoreColor(score))}>
            {score}%
          </p>
          <div className="gradient-slider-track">
            <Slider
              value={[score]}
              max={100}
              step={1}
              disabled
              className="pointer-events-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Risk Tolerance Threshold
          </p>
        </div>
      </div>

      {/* Compliance Breakdown Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg glass-card-premium border-border/30">
          <DialogHeader>
            <DialogTitle className="gradient-text">Compliance Score Breakdown</DialogTitle>
            <DialogDescription>
              Overall score: <span className={cn('font-bold', getScoreColor(score))}>{score}%</span> — based on project completion data
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No projects yet. Create a project to see compliance data.
              </p>
            ) : (
              projects.map((p) => {
                const pct = p.completionPercentage ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm"
                  >
                    {getStatusIcon(pct)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{p.status}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold font-mono', getScoreColor(pct))}>{pct}%</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
