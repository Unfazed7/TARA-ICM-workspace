import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/layout/PageTransition';
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
  catalogVersionOptions
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

const GLASS_INPUT = "font-medium bg-[rgba(0,0,0,0.4)] border-0 ring-1 ring-white/[0.06] backdrop-blur-sm focus-visible:ring-0 focus-visible:outline-none wizard-input";
const GLASS_INPUT_SM = `${GLASS_INPUT} h-9 text-sm`;
const GLASS_INPUT_XS = `${GLASS_INPUT} h-8 text-xs`;
const LABEL_CLS = "text-[10px] uppercase tracking-wider font-medium";
const LABEL_STYLE = { color: 'hsl(210, 40%, 98%)' } as const;

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
  const [domains, setDomains] = useState<ProjectDomain[]>([]);
  const [scope, setScope] = useState<ProjectScope>('vehicle');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('ai-assisted');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [objectives, setObjectives] = useState('');
  const [includeWebApp, setIncludeWebApp] = useState(false);
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
    try {
      const effectiveDomains = domains.length > 0 ? domains : ['web-based'];
      const project = await createProject({
        name: name || moduleName || 'Untitled TARA',
        description,
        vehicleType,
        catalogVersion,
        domains: effectiveDomains,
        scope,
        workflowMode,
        objectives,
      });
      setActiveProject(project.id);
      navigate(`/project/${project.id}`);
    } catch (err) {
      alert(`Failed to create project: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Per-step validation
  const canAdvance = [
    name.trim().length > 0 || moduleName.trim().length > 0, // step 1
    true, // step 2 - document control always valid
    true, // step 3 - stakeholders optional
    true, // step 4 - work history optional
    true, // step 5 - configuration has defaults
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
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Project Name <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={GLASS_INPUT} />
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL_CLS} style={LABEL_STYLE}>Module</Label>
              <Input value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="BCM, TCU, Gateway" className={GLASS_INPUT} />
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
        <div className="space-y-2">
          {workHistory.map(entry => (
            <div key={entry.id} className="group flex gap-2 items-center">
              <Input type="date" value={entry.date} onChange={e => updateWorkHistory(entry.id, 'date', e.target.value)} className={`${GLASS_INPUT_XS} w-[110px] shrink-0`} />
              <Input value={entry.version} onChange={e => updateWorkHistory(entry.id, 'version', e.target.value)} placeholder="Ver" className={`${GLASS_INPUT_XS} w-14 shrink-0`} />
              <Input value={entry.status} onChange={e => updateWorkHistory(entry.id, 'status', e.target.value)} placeholder="Status" className={`${GLASS_INPUT_XS} w-20 shrink-0`} />
              <Input value={entry.author} onChange={e => updateWorkHistory(entry.id, 'author', e.target.value)} placeholder="Author" className={`${GLASS_INPUT_XS} flex-1 min-w-0`} />
              <Input value={entry.changeDescription} onChange={e => updateWorkHistory(entry.id, 'changeDescription', e.target.value)} placeholder="Description" className={`${GLASS_INPUT_XS} flex-1 min-w-0`} />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeWorkHistoryRow(entry.id)}>
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
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'hsl(210, 40%, 98%)' }}>OEM Level</span>
                <div className="space-y-2">
                  {scopeOptions.filter(o => o.id === 'vehicle' || o.id === 'domain').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setScope(opt.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-all text-left",
                        scope === opt.id
                          ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                          : "border-border/50 hover:border-muted-foreground/20"
                      )}
                    >
                      <opt.icon className={cn("w-4 h-4 shrink-0", scope === opt.id ? "text-primary" : "text-muted-foreground")} />
                      <div>
                         <span className={cn("text-xs font-medium block")} style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.label}</span>
                         <span className="text-[10px]" style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.desc}</span>
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
                      onClick={() => setScope(opt.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-all text-left",
                        scope === opt.id
                          ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                          : "border-border/50 hover:border-muted-foreground/20"
                      )}
                    >
                      <opt.icon className={cn("w-4 h-4 shrink-0", scope === opt.id ? "text-primary" : "text-muted-foreground")} />
                      <div>
                         <span className={cn("text-xs font-medium block")} style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.label}</span>
                         <span className="text-[10px]" style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Web-Based Application Add-on */}
          <div className="space-y-2.5">
            <Label className={LABEL_CLS} style={LABEL_STYLE}>Additional Scope</Label>
            <button
              onClick={() => setIncludeWebApp(!includeWebApp)}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-lg border transition-all text-left",
                includeWebApp
                  ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                  : "border-border/50 hover:border-muted-foreground/20"
              )}
            >
              <Globe className={cn("w-4 h-4 shrink-0", includeWebApp ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1">
                <span className={cn("text-xs font-medium block")} style={{ color: 'hsl(210, 40%, 98%)' }}>Web-Based Application</span>
                <span className="text-[10px]" style={{ color: 'hsl(210, 40%, 98%)' }}>Combinable with any OEM or Supplier level scope</span>
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
                  onClick={() => setWorkflowMode(opt.id)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left",
                    workflowMode === opt.id
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]"
                      : "border-border/50 hover:border-muted-foreground/20"
                  )}
                >
                  <opt.icon className={cn("w-5 h-5 shrink-0", workflowMode === opt.id ? "text-primary" : "text-muted-foreground")} />
                  <div>
                     <span className={cn("text-sm font-medium block")} style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.label}</span>
                     <span className="text-[11px]" style={{ color: 'hsl(210, 40%, 98%)' }}>{opt.desc}</span>
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
      <div className="h-screen bg-[#0a0e1a] flex flex-col relative overflow-hidden" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        <style>{`
          .wizard-input:focus {
            box-shadow: 0 0 0 1px rgba(59,130,246,0.5), 0 0 12px -2px rgba(59,130,246,0.3) !important;
          }
          @keyframes shield-glow {
            0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.1); }
            50% { box-shadow: 0 0 14px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.15); }
          }
        `}</style>

        {/* Navy radial glow */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(59,130,246,0.07)_0%,transparent_70%)]" />

        {/* Smudge orb effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full bg-indigo-500/[0.03] blur-[90px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Fixed HUD Navbar */}
        <nav className="fixed top-0 w-full h-20 z-50 flex items-center justify-between px-8 backdrop-blur-md bg-black/20 border-b border-white/5">
          {/* Left: Glowing shield + title */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"
              style={{ animation: 'shield-glow 3s ease-in-out infinite' }}
            >
              <Shield className="w-4 h-4 text-primary drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            </div>
            <span className="font-mono tracking-[0.3em] uppercase text-sm" style={{ color: 'hsl(210, 40%, 98%)' }}>
              AUTO TARA
            </span>
          </div>

          {/* Right: Close button */}
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>

          {/* Progress bar at bottom edge */}
          <div className="absolute bottom-0 left-0 h-[1px] bg-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/[0.03]" />
        </nav>

        {/* Content area - centered below navbar */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 pt-36 pb-8">
          <CardDeck
            steps={steps}
            canAdvance={canAdvance}
            onComplete={handleCreate}
            onStepChange={setCurrentStep}
            heading="Threat Analysis & Risk Assessment"
          />
        </div>
      </div>
    </PageTransition>
  );
}
