import { useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle,
  X,
  Send,
  History,
} from 'lucide-react';
import { ThreatScenario, ReviewStatus } from '@/types/risk-assessment';

interface AnalystAuditPanelProps {
  scenario: ThreatScenario | null;
  onUpdateStatus: (scenarioId: string, status: ReviewStatus, comment?: string) => void;
  className?: string;
}

export const AnalystAuditPanel = memo(function AnalystAuditPanel({
  scenario,
  onUpdateStatus,
  className,
}: AnalystAuditPanelProps) {
  const [comment, setComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleApprove = useCallback(() => {
    if (!scenario) return;
    onUpdateStatus(scenario.id, 'approved', comment || undefined);
    setComment('');
  }, [scenario, comment, onUpdateStatus]);

  const handleRequestRevision = useCallback(() => {
    if (!scenario || !comment.trim()) return;
    onUpdateStatus(scenario.id, 'revision-requested', comment);
    setComment('');
  }, [scenario, comment, onUpdateStatus]);

  if (!scenario) {
    return (
      <div className={cn("flex flex-col h-full bg-card/50 border-l border-border", className)}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Audit Checklist</h3>
          <p className="text-xs text-muted-foreground mt-1">ISO/SAE 21434 Review</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a threat scenario from the grid to begin review
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = {
    pending: 'bg-dusty-amber/10 text-dusty-amber border-dusty-amber/30',
    approved: 'bg-sage/10 text-sage border-sage/30',
    'revision-requested': 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div className={cn("flex flex-col h-full bg-card/50 border-l border-border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Audit Checklist</h3>
          <Badge variant="outline" className={cn("text-xs", statusColor[scenario.reviewStatus])}>
            {scenario.reviewStatus.replace('-', ' ')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Reviewing: <span className="font-mono text-primary">{scenario.threatId}</span>
        </p>
      </div>

      {/* Scenario Summary */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Threat Scenario
            </h4>
            <p className="text-sm font-medium">{scenario.name}</p>
            <p className="text-xs text-muted-foreground">{scenario.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Risk Value</div>
              <div className="text-lg font-bold mt-1">{scenario.riskValue}/5</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Feasibility</div>
              <div className="text-lg font-bold mt-1">{scenario.feasibilityScore}/5</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Impact Assessment
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 bg-muted/20 rounded">
                <span>Safety</span>
                <span className="capitalize font-medium">{scenario.impactSafety}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/20 rounded">
                <span>Financial</span>
                <span className="capitalize font-medium">{scenario.impactFinancial}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/20 rounded">
                <span>Operational</span>
                <span className="capitalize font-medium">{scenario.impactOperational}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/20 rounded">
                <span>Privacy</span>
                <span className="capitalize font-medium">{scenario.impactPrivacy}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cybersecurity Goal
            </h4>
            <p className="text-xs bg-muted/20 p-3 rounded-lg">
              {scenario.cybersecurityGoal}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Treatment Decision
            </h4>
            <Badge variant="outline" className="capitalize">
              {scenario.treatmentDecision}
            </Badge>
          </div>

          {/* Review Comment */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review Comment
            </h4>
            <Textarea
              placeholder="Add your review comments here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          {/* Previous Comments */}
          {scenario.reviewComment && (
            <div className="space-y-2">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="w-3 h-3" />
                Previous Comments
              </button>
              {showHistory && (
                <div className="p-3 bg-muted/20 rounded-lg text-xs">
                  {scenario.reviewComment}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between p-3 bg-sage/5 rounded-lg border border-sage/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sage" />
            <span className="text-sm font-medium">Approve Assessment</span>
          </div>
          <Switch
            checked={scenario.reviewStatus === 'approved'}
            onCheckedChange={(checked) => {
              if (checked) handleApprove();
              else onUpdateStatus(scenario.id, 'pending');
            }}
          />
        </div>

        <Button 
          variant="outline" 
          className="w-full gap-2 text-destructive hover:text-destructive"
          disabled={!comment.trim()}
          onClick={handleRequestRevision}
        >
          <MessageSquare className="w-4 h-4" />
          Request Revision
        </Button>
      </div>
    </div>
  );
});
