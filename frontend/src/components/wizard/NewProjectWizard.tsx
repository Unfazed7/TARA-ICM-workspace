import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectScope, WorkflowMode } from '@/types/tara';
import { 
  Car,
  Cpu,
  CircuitBoard,
  Microchip,
  Sparkles,
  Hammer,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (config: { name: string; scope: ProjectScope; workflowMode: WorkflowMode }) => void;
}

const scopeOptions: { id: ProjectScope; label: string; icon: typeof Car; description: string }[] = [
  { 
    id: 'vehicle', 
    label: 'Vehicle Level', 
    icon: Car, 
    description: 'Full vehicle architecture assessment' 
  },
  { 
    id: 'domain', 
    label: 'Domain Level', 
    icon: Cpu, 
    description: 'Templates for Powertrain, ADAS, and Infotainment will be loaded.' 
  },
  { 
    id: 'component', 
    label: 'Component Level', 
    icon: CircuitBoard, 
    description: 'Individual sensor or module analysis' 
  },
  { 
    id: 'ecu', 
    label: 'ECU Level', 
    icon: Microchip, 
    description: 'Deep-dive into specific ECU' 
  },
];

const workflowOptions: { id: WorkflowMode; label: string; icon: typeof Sparkles; description: string }[] = [
  { 
    id: 'ai-assisted', 
    label: 'AI-Assisted', 
    icon: Sparkles, 
    description: 'Recommended for rapid baseline assessments using document parsing.' 
  },
  { 
    id: 'manual', 
    label: 'Manual', 
    icon: Hammer, 
    description: 'Recommended for proprietary architectures and deep-dive expert analysis.' 
  },
];

type WizardStep = 'scope' | 'workflow' | 'upload' | 'name';

export function NewProjectWizard({ open, onOpenChange, onComplete }: NewProjectWizardProps) {
  const [step, setStep] = useState<WizardStep>('scope');
  const [scope, setScope] = useState<ProjectScope | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode | null>(null);
  const [projectName, setProjectName] = useState('');
  const [hoveredScope, setHoveredScope] = useState<ProjectScope | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const breadcrumbs = [
    { id: 'scope', label: 'Scope' },
    { id: 'workflow', label: 'Workflow' },
    ...(workflowMode === 'ai-assisted' ? [{ id: 'upload', label: 'Upload' }] : []),
    { id: 'name', label: 'Name' },
  ];

  const currentStepIndex = breadcrumbs.findIndex(b => b.id === step);

  const handleNext = () => {
    if (step === 'scope' && scope) {
      setStep('workflow');
    } else if (step === 'workflow' && workflowMode) {
      setStep(workflowMode === 'ai-assisted' ? 'upload' : 'name');
    } else if (step === 'upload') {
      setStep('name');
    }
  };

  const handleBack = () => {
    if (step === 'workflow') {
      setStep('scope');
    } else if (step === 'upload') {
      setStep('workflow');
    } else if (step === 'name') {
      setStep(workflowMode === 'ai-assisted' ? 'upload' : 'workflow');
    }
  };

  const handleComplete = () => {
    if (scope && workflowMode && projectName) {
      onComplete({ name: projectName, scope, workflowMode });
      // Reset wizard
      setStep('scope');
      setScope(null);
      setWorkflowMode(null);
      setProjectName('');
      onOpenChange(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Mock file handling
    handleNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Breadcrumbs */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Project</span>
            {breadcrumbs.slice(0, currentStepIndex + 1).map((crumb, i) => (
              <div key={crumb.id} className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className={cn(
                  i === currentStepIndex ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {crumb.id === 'scope' && scope ? scopeOptions.find(s => s.id === scope)?.label : 
                   crumb.id === 'workflow' && workflowMode ? workflowOptions.find(w => w.id === workflowMode)?.label :
                   crumb.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogHeader className="px-6 pt-4">
          <DialogTitle>
            {step === 'scope' && 'Select Assessment Scope'}
            {step === 'workflow' && 'Choose Workflow Mode'}
            {step === 'upload' && 'Upload Architecture Documents'}
            {step === 'name' && 'Name Your Project'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 min-h-[300px]">
          {/* Step A: Scope Selection */}
          {step === 'scope' && (
            <div className="grid grid-cols-4 gap-3">
              {scopeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setScope(option.id)}
                  onMouseEnter={() => setHoveredScope(option.id)}
                  onMouseLeave={() => setHoveredScope(null)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-lg border transition-all duration-200",
                    "hover:border-primary/50 hover:bg-primary/5",
                    scope === option.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card/50"
                  )}
                >
                  <option.icon className={cn(
                    "w-8 h-8 mb-3 transition-colors",
                    scope === option.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium text-center transition-colors",
                    scope === option.id ? "text-primary" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Scope description preview */}
          {step === 'scope' && (hoveredScope || scope) && (
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">
                {scopeOptions.find(s => s.id === (hoveredScope || scope))?.description}
              </p>
            </div>
          )}

          {/* Step B: Workflow Mode */}
          {step === 'workflow' && (
            <div className="grid grid-cols-2 gap-4">
              {workflowOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setWorkflowMode(option.id)}
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl border transition-all duration-200",
                    "hover:border-primary/50 hover:bg-primary/5",
                    workflowMode === option.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card/50"
                  )}
                >
                  <option.icon className={cn(
                    "w-10 h-10 mb-4 transition-colors",
                    workflowMode === option.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-lg font-medium mb-2 transition-colors",
                    workflowMode === option.id ? "text-primary" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                  <p className="text-sm text-muted-foreground text-center">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Upload Zone for AI-Assisted */}
          {step === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/20 hover:border-primary/50"
              )}
            >
              <Upload className={cn(
                "w-12 h-12 mb-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium mb-1">
                Drag and drop architecture files
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                PDF, DXL, ARXML, or image files supported
              </p>
              <Button variant="outline" size="sm" onClick={handleNext}>
                Skip for now
              </Button>
            </div>
          )}

          {/* Project Name */}
          {step === 'name' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Vehicle Platform Alpha"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This name will be used to identify your project across the platform.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            disabled={step === 'scope'}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {step === 'name' ? (
            <Button onClick={handleComplete} disabled={!projectName}>
              <Check className="w-4 h-4 mr-1" />
              Create Project
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={
                (step === 'scope' && !scope) || 
                (step === 'workflow' && !workflowMode)
              }
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
