import { useRef, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

import { ModuleSidebar, WorkflowStep } from '@/components/workspace/ModuleSidebar';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';
import { RunHistoryDialog } from '@/components/workspace/RunHistoryDialog';
import { StageRunnerPanel } from '@/components/stages/StageRunnerPanel';

import { ItemDefinition } from '@/components/workspace/ItemDefinition';
import { AssumptionScope } from '@/components/workspace/AssumptionScope';
import { PageTransition } from '@/components/layout/PageTransition';
import { TaraProvider, useTara } from '@/contexts/TaraContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Save,
  Play,
  MoreHorizontal,
  LogOut,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  UserCircle,
  Upload,
  LoaderCircle,
  Pause,
  Square,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

// Inner component that can use useTara
function WorkspaceContent({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getProject, updateProject, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { saveProgress, isSaving, hasUnsavedChanges, lastSavedAt, stageStatuses } = useTara();

  const [activeModule, setActiveModule] = useState<WorkflowStep>('scope');
  const [activeTab, setActiveTab] = useState<string>('asset-damage');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const selectWorkflow = (next: WorkflowStep) => {
    setActiveModule(next);
    const defaults: Partial<Record<WorkflowStep, string>> = {
      'assets-damage': 'asset-id',
      'threat-analysis': 'threat-analysis',
      'risk-treatment': 'impact-rating',
      'review-publish': 'final-tara',
    };
    if (defaults[next]) setActiveTab(defaults[next]!);
  };

  const showStageResult = (stageNum: number) => {
    const destination: Record<number, { module: WorkflowStep; tab?: string }> = {
      1: { module: 'scope' },
      2: { module: 'item-definition' },
      3: { module: 'assets-damage', tab: 'asset-id' },
      4: { module: 'assets-damage', tab: 'damage-analysis' },
      5: { module: 'threat-analysis', tab: 'threat-analysis' },
      6: { module: 'threat-analysis', tab: 'attack-path' },
      7: { module: 'risk-treatment', tab: 'impact-rating' },
      8: { module: 'risk-treatment', tab: 'feasibility' },
      9: { module: 'risk-treatment', tab: 'risk-treatment' },
      10: { module: 'risk-treatment', tab: 'residual-risk' },
    };
    const target = destination[stageNum];
    if (!target) return;
    setActiveModule(target.module);
    if (target.tab) setActiveTab(target.tab);
  };

  const project = getProject(projectId);

  if (projectsLoading) {
    return <div className="grid h-[100dvh] place-items-center bg-background text-sm text-muted-foreground" role="status">Loading assessment…</div>;
  }

  if (projectsError) {
    return <div className="grid h-[100dvh] place-items-center bg-background p-6" role="alert"><div className="max-w-md rounded-md border border-destructive/30 bg-destructive/5 p-5"><p className="font-medium">Could not load this assessment</p><p className="mt-1 text-sm text-muted-foreground">{projectsError.message}</p><Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>Return to dashboard</Button></div></div>;
  }

  if (!project) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    try {
      await saveProgress();
      // Update project's updatedAt timestamp
      await updateProject(projectId, { updatedAt: new Date().toISOString() });
      setShowSaveDialog(false);
      toast.success('Progress saved successfully', {
        description: `${project.name} — browser draft saved`,
        icon: <CheckCircle2 className="w-4 h-4 text-bar-foreground" />,
      });
    } catch {
      toast.error('Failed to save progress', {
        description: 'Please try again',
      });
    }
  };

  const isResultPhase = (['assets-damage', 'threat-analysis', 'risk-treatment', 'review-publish'] as WorkflowStep[]).includes(activeModule);
  const resultPhase = activeModule as 'assets-damage' | 'threat-analysis' | 'risk-treatment' | 'review-publish';
  const stageNums = activeModule === 'assets-damage' ? [3, 4] : activeModule === 'threat-analysis' ? [5, 6] : [7, 8, 9];

  const mainPanel = (
    <main className="result-surface flex min-w-0 flex-1 flex-col overflow-hidden">
      {activeModule === 'scope' && (
        <ResizablePanelGroup direction="vertical" autoSaveId="autotara-scope-layout-v2" className="relative">
          <ResizablePanel defaultSize={75} minSize={25} maxSize={85} className="relative z-10 overflow-auto p-3">
            <StageRunnerPanel assessmentId={projectId} stageNums={[1]} onStageStart={showStageResult} />
          </ResizablePanel>
          <ResizableHandle withHandle className="z-30 data-[panel-group-direction=vertical]:h-2 hover:bg-primary/30" />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={75} className="relative z-20 overflow-hidden bg-background"><AssumptionScope /></ResizablePanel>
        </ResizablePanelGroup>
      )}
      {activeModule === 'item-definition' && (
        <ResizablePanelGroup direction="vertical" autoSaveId="autotara-item-layout-v2" className="relative">
          <ResizablePanel defaultSize={75} minSize={25} maxSize={85} className="relative z-10 overflow-auto p-3">
            <StageRunnerPanel assessmentId={projectId} stageNums={[2]} onStageStart={showStageResult} />
          </ResizablePanel>
          <ResizableHandle withHandle className="z-30 data-[panel-group-direction=vertical]:h-2 hover:bg-primary/30" />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={75} className="relative z-20 overflow-hidden bg-background"><ItemDefinition assessmentId={projectId} /></ResizablePanel>
        </ResizablePanelGroup>
      )}
      {isResultPhase && activeModule !== 'review-publish' && (
        <ResizablePanelGroup direction="vertical" autoSaveId={`autotara-${activeModule}-layout-v2`} className="relative">
          <ResizablePanel defaultSize={75} minSize={25} maxSize={85} className="relative z-10 overflow-auto p-3">
            <StageRunnerPanel assessmentId={projectId} stageNums={stageNums} onStageStart={showStageResult} />
          </ResizablePanel>
          <ResizableHandle withHandle className="z-30 data-[panel-group-direction=vertical]:h-2 hover:bg-primary/30" />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={75} className="relative z-20 overflow-hidden bg-background">
            <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} phase={resultPhase} stageStatuses={stageStatuses} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
      {activeModule === 'review-publish' && (
        <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} phase="review-publish" stageStatuses={stageStatuses} />
      )}
    </main>
  );

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="h-11 flex items-center justify-between px-4 bg-bar border-border bg-card shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm">AutoTARA</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm text-muted-foreground">{project.name}</span>
          <Badge variant="outline" className="hidden text-xs font-mono sm:inline-flex">
            {project.catalogVersion}
          </Badge>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-state-yellow animate-pulse" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <RunHistoryDialog assessmentId={projectId} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2"
            onClick={handleSaveClick}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-2" disabled title="Validation summary is not available yet">
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Validate</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled aria-label="More actions unavailable">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-bar-foreground/25 mx-1" />
          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full bg-bar-foreground/10 border border-bar-foreground/30 hover:bg-bar-foreground/20"
                aria-label="Open account menu"
              >
                <span className="text-xs font-bold text-bar-foreground">
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <UserCircle className="w-4 h-4" />}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[10000]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize font-mono">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled title="Password changes are not available yet">
                <KeyRound className="mr-2 w-4 h-4" />
                Password change unavailable
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Layout */}
      <div className="bg-bar p-2 md:hidden">
        <label htmlFor="mobile-workflow-step" className="sr-only">Workflow step</label>
        <select id="mobile-workflow-step" value={activeModule} onChange={(event) => {
          selectWorkflow(event.target.value as WorkflowStep);
        }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          <option value="scope">1. Define scope</option><option value="item-definition">2. Item definition</option><option value="assets-damage">3. Assets &amp; damage</option><option value="threat-analysis">4. Threat analysis</option><option value="risk-treatment">5. Risk &amp; treatment</option><option value="review-publish">6. Review &amp; publish</option>
        </select>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar activeModule={activeModule} onModuleChange={selectWorkflow} />
        {mainPanel}
      </div>

      {/* Status Bar */}
      <footer className="h-6 flex items-center justify-between px-3 border-t border-border bg-card text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Connected
          </span>
          <span>
            {project.domains.length} Domains • {project.threatCount || 0} Threats
            {lastSavedAt && <span className="hidden sm:inline">• Draft saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="capitalize">{user?.role}</span>
          <span>v0.1.0-alpha</span>
        </div>
      </footer>

      {/* ═════ Save Confirmation Dialog ═════ */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md z-[100] aegis-card border-border">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-signal-ink" />
              Save Progress
            </DialogTitle>
            <DialogDescription className="text-center">
              Do you really want to save the current progress?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 rounded-xl border border-border/20 bg-card/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Catalog</span>
                <span className="font-mono text-xs">{project.catalogVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="capitalize">{project.status}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Editable analysis fields are stored as a browser draft. Pipeline outputs remain on the server.
            </p>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="gap-2 px-6 "
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Yes, Save Progress
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Outer component that wraps with TaraProvider
export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isAuthenticated, user } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect analysts to review queue
  if (user?.role === 'analyst') {
    return <Navigate to="/review" replace />;
  }

  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageTransition>
      <TooltipProvider delayDuration={200}>
        <TaraProvider projectId={projectId}>
          <WorkspaceContent projectId={projectId} />
        </TaraProvider>
      </TooltipProvider>
    </PageTransition>
  );
}
