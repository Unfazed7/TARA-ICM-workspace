import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/layout/PageTransition';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CardDeck } from '@/components/wizard/CardDeck';
import {
  ProjectScope,
  WorkflowMode,
  VehicleType,
  ProjectDomain,
  catalogVersionOptions,
  domainOptions,
} from '@/types/tara';
import {
  Shield,
  X,
  Plus,
  Trash2,
  FileText,
  Users,
  Clock,
  Settings2,
  Sparkles,
  Hammer,
  Car,
  Cpu,
  CircuitBoard,
  Microchip,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorkHistoryEntry {
  id: string;
  date: string;
  version: string;
  status: string;
  author: string;
  changeDescription: string;
}

const scopeOptions: { id: ProjectScope; label: string; icon: typeof Car; desc: string }[] = [
  { id: 'vehicle', label: 'Vehicle', icon: Car, desc: 'Full vehicle architecture' },
  { id: 'domain', label: 'Domain', icon: Cpu, desc: 'Domain-specific' },
  { id: 'component', label: 'Component', icon: CircuitBoard, desc: 'Individual component' },
  { id: 'ecu', label: 'ECU', icon: Microchip, desc: 'Single ECU deep-dive' },
];

const workflowOptions: { id: WorkflowMode; label: string; icon: typeof Sparkles; desc: string }[] = [
  { id: 'ai-assisted', label: 'AI-Assisted', icon: Sparkles, desc: 'Rapid baseline with AI' },
  { id: 'guided', label: 'Guided', icon: Users, desc: 'User-driven workflow with suggestions' },
  { id: 'manual', label: 'Manual', icon: Hammer, desc: 'Expert-driven analysis' },
];

const GLASS_INPUT = "font-medium bg-background border-input focus-visible:ring-2 focus-visible:ring-ring wizard-input";
const GLASS_INPUT_SM = `${GLASS_INPUT} h-9 text-sm`;
const GLASS_INPUT_XS = `${GLASS_INPUT} h-8 text-xs`;
const LABEL_CLS = "text-[10px] uppercase tracking-wider font-medium";
const LABEL_STYLE = { color: 'hsl(var(--foreground))' } as const;

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProject, setActiveProject } = useProjects();
  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');
  const [templateVersion, setTemplateVersion] = useState('1.0');
  const [version, setVersion] = useState('0.1');
  const [catalogVersion, setCatalogVersion] = useState('iso21434-2021');
  const [authors, setAuthors] = useState(user?.name || '');
  const [reviewers, setReviewers] = useState('');
  const [confirmationReviewer, setConfirmationReviewer] = useState('');
  const [approver, setApprover] = useState('');
  const [domains, setDomains] = useState<ProjectDomain[]>(['networks']);
  const [scope, setScope] = useState<ProjectScope>('vehicle');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('ai-assisted');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [objectives, setObjectives] = useState('');
  const [includeWebApp, setIncludeWebApp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      version: '0.1',
      status: 'Draft',
      author: user?.name || '',
      changeDescription: 'Initial creation',
    },
  ]);

  const addWorkHistoryRow = () => {
    setWorkHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      version: '',
      status: '',
      author: user?.name || '',
      changeDescription: '',
    }]);
  };

  const updateWorkHistory = (id: string, field: keyof WorkHistoryEntry, value: string) => {
    setWorkHistory(prev => prev.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeWorkHistoryRow = (id: string) => {
    setWorkHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const effectiveDomains = [...domains, ...(includeWebApp ? ['web-based' as ProjectDomain] : [])];
      const project = await createProject({
        name: name || moduleName || 'Untitled TARA',
        description,
        vehicleType,
        catalogVersion,
        domains: effectiveDomains,
        scope,
        workflowMode,
        objectives,
        documentId,
        templateVersion,
        version,
        authors,
        reviewers,
        confirmationReviewer,
        approver,
        workHistory,
      });
      setActiveProject(project.id);
      navigate(`/project/${project.id}`);
    } catch (err) {
      toast.error('Project creation failed', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsCreating(false);
    }
  };

  // Per-step validation
  const canAdvance = [
    name.trim().length > 0 || moduleName.trim().length > 0, // step 1
    true, // step 2 - document control always valid
    true, // step 3 - stakeholders optional
    true, // step 4 - work history optional
    domains.length > 0 || includeWebApp,
  ];

  const steps = [
    {
      id: 'detail',
      title: 'Project Detail',
      icon: FileText,
      content: (
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name" className={LABEL_CLS} style={LABEL_STYLE}>Project Name <span className="text-destructive">*</span></Label>
              <Input id="project-name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={GLASS_INPUT} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="module-name" className={LABEL_CLS} style={LABEL_STYLE}>Module</Label>
              <Input id="module-name" value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="BCM, TCU, Gateway" className={GLASS_INPUT} />
            </div>
          </div>
          <div className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Document ID</Label>
              <Input value={documentId} onChange={e => setDocumentId(e.target.value)} placeholder="TARA-2024-001" className={GLASS_INPUT} />
          </div>
          <div className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Scope and objectives of this assessment..." className={`min-h-[68px] resize-none ${GLASS_INPUT}`} />
          </div>
        </div>
      ),
    },
    {
      id: 'control',
      title: 'Document Control',
      icon: FileText,
      content: (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Template Ver.</Label>
              <Input value={templateVersion} onChange={e => setTemplateVersion(e.target.value)} className={GLASS_INPUT_SM} />
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Version</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} className={GLASS_INPUT_SM} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>ISO Catalog</Label>
              <Select value={catalogVersion} onValueChange={setCatalogVersion}>
                <SelectTrigger className={GLASS_INPUT_SM}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catalogVersionOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'stakeholders',
      title: 'Stakeholders',
      icon: Users,
      content: (
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Author(s)', value: authors, set: setAuthors },
            { label: 'Reviewer(s)', value: reviewers, set: setReviewers },
            { label: 'Confirmation Reviewer', value: confirmationReviewer, set: setConfirmationReviewer },
            { label: 'Approver', value: approver, set: setApprover },
          ].map(f => (
            <div key={f.label} className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>{f.label}</Label>
              <Input value={f.value} onChange={e => f.set(e.target.value)} placeholder={`Enter ${f.label.toLowerCase()}`} className={GLASS_INPUT_SM} />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'history',
      title: 'Work History',
      icon: Clock,
      content: (
        <div className="space-y-2 overflow-x-auto pb-2">
          {workHistory.map(entry => (
            <div key={entry.id} className="group flex min-w-[640px] gap-2 items-center">
              <Input type="date" value={entry.date} onChange={e => updateWorkHistory(entry.id, 'date', e.target.value)} className={`${GLASS_INPUT_XS} w-[110px] shrink-0`} />
              <Input value={entry.version} onChange={e => updateWorkHistory(entry.id, 'version', e.target.value)} placeholder="Ver" className={`${GLASS_INPUT_XS} w-14 shrink-0`} />
              <Input value={entry.status} onChange={e => updateWorkHistory(entry.id, 'status', e.target.value)} placeholder="Status" className={`${GLASS_INPUT_XS} w-20 shrink-0`} />
              <Input value={entry.author} onChange={e => updateWorkHistory(entry.id, 'author', e.target.value)} placeholder="Author" className={`${GLASS_INPUT_XS} flex-1 min-w-0`} />
              <Input value={entry.changeDescription} onChange={e => updateWorkHistory(entry.id, 'changeDescription', e.target.value)} placeholder="Description" className={`${GLASS_INPUT_XS} flex-1 min-w-0`} />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeWorkHistoryRow(entry.id)}>
                <span className="sr-only">Remove work history entry</span>
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addWorkHistoryRow} className="gap-1.5 text-xs h-7 mt-1">
            <Plus className="w-3 h-3" /> Add Entry
          </Button>
        </div>
      ),
    },
    {
      id: 'config',
      title: 'Configuration',
      icon: Settings2,
      content: (
        <div className="space-y-6">
          {/* Scope */}
          <div className="space-y-2.5">
            <Label className={LABEL_CLS} style={LABEL_STYLE}>Assessment Scope</Label>
            <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 overflow-x-auto pb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'hsl(210, 40%, 98%)' }}>OEM Level</span>
                <div className="space-y-2">
                  {scopeOptions.filter(o => o.id === 'vehicle' || o.id === 'domain').map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScope(opt.id)}
                      aria-pressed={scope === opt.id}
                      className={cn(
                        "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-all text-left",
                        scope === opt.id
                          ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                          : "border-border/50 hover:border-muted-foreground/20"
                      )}
                    >
                      <opt.icon className={cn("w-4 h-4 shrink-0", scope === opt.id ? "text-primary" : "text-muted-foreground")} />
                      <div>
                         <span className="text-sm font-medium block">{opt.label}</span>
                         <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'hsl(210, 40%, 98%)' }}>Supplier Level</span>
                <div className="space-y-2">
                  {scopeOptions.filter(o => o.id === 'component' || o.id === 'ecu').map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScope(opt.id)}
                      aria-pressed={scope === opt.id}
                      className={cn(
                        "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-all text-left",
                        scope === opt.id
                          ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                          : "border-border/50 hover:border-muted-foreground/20"
                      )}
                    >
                      <opt.icon className={cn("w-4 h-4 shrink-0", scope === opt.id ? "text-primary" : "text-muted-foreground")} />
                      <div>
                         <span className="text-sm font-medium block">{opt.label}</span>
                         <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className={LABEL_CLS} style={LABEL_STYLE}>Domains in scope</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {domainOptions.map((domain) => {
                const checked = domains.includes(domain.id);
                return <button key={domain.id} type="button" aria-pressed={checked} onClick={() => setDomains((current) => checked ? current.filter((id) => id !== domain.id) : [...current, domain.id])} className={cn('min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors', checked ? 'border-primary bg-primary/10' : 'border-border')}>{domain.label}</button>;
              })}
            </div>
          </div>

          {/* Web-Based Application Add-on */}
          <div className="space-y-2.5">
            <Label className={LABEL_CLS} style={LABEL_STYLE}>Additional Scope</Label>
            <button
              type="button"
              onClick={() => setIncludeWebApp(!includeWebApp)}
              aria-pressed={includeWebApp}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-lg border transition-all text-left",
                includeWebApp
                  ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                  : "border-border/50 hover:border-muted-foreground/20"
              )}
            >
              <Globe className={cn("w-4 h-4 shrink-0", includeWebApp ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1">
                <span className="text-sm font-medium block">Web-Based Application</span>
                <span className="text-xs text-muted-foreground">Combinable with any OEM or Supplier level scope</span>
              </div>
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                includeWebApp
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              )}>
                {includeWebApp && <span className="text-[10px] text-primary-foreground font-bold">✓</span>}
              </div>
            </button>
          </div>

          {/* Workflow */}
          <div className="space-y-2.5">
            <Label className={LABEL_CLS} style={LABEL_STYLE}>Workflow Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {workflowOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWorkflowMode(opt.id)}
                  aria-pressed={workflowMode === opt.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left",
                    workflowMode === opt.id
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                      : "border-border/50 hover:border-muted-foreground/20"
                  )}
                >
                  <opt.icon className={cn("w-5 h-5 shrink-0", workflowMode === opt.id ? "text-primary" : "text-muted-foreground")} />
                  <div>
                     <span className="text-sm font-medium block">{opt.label}</span>
                     <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <PageTransition variant="slide">
      <div className="min-h-[100dvh] bg-background flex flex-col">

        {/* Fixed HUD Navbar */}
        <nav className="sticky top-0 w-full min-h-16 z-50 flex items-center justify-between px-3 sm:px-6 bg-background/95 border-b backdrop-blur">
          {/* Left: Glowing shield + title */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"
            >
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-serif font-semibold text-sm">
              AUTO TARA
            </span>
          </div>

          {/* Right: theme and close controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <span className="sr-only">Close project creation</span>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress bar at bottom edge */}
          <div className="absolute bottom-0 left-0 h-[1px] bg-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/[0.03]" />
        </nav>

        {/* Content area - centered below navbar */}
        <div className="flex-1 flex flex-col items-center justify-start px-3 sm:px-6 pt-10 pb-8">
          <CardDeck
            steps={steps}
            canAdvance={canAdvance}
            onComplete={handleCreate}
            onStepChange={setCurrentStep}
            heading="Threat Analysis & Risk Assessment"
            isCompleting={isCreating}
          />
        </div>
      </div>
    </PageTransition>
  );
}
