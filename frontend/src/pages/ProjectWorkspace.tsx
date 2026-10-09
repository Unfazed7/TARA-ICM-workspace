import { useRef, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

import { ModuleSidebar, WorkflowStep } from '@/components/workspace/ModuleSidebar';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';

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

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_started: 'outline',
  pending: 'secondary',
  running: 'secondary',
  paused: 'secondary',
  cancelled: 'outline',
  complete: 'default',
  failed: 'destructive',
};

function displayStageError(message: string | null | undefined) {
  if (!message) return null;
  const unavailableModel = message.match(/No endpoints found for ([^."}]+)/i);
  if (unavailableModel) {
    return `Configured AI model "${unavailableModel[1]}" is unavailable. Update LLM_MODEL to an available tool-calling model and restart the backend.`;
  }
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function StageRunnerPanel({ assessmentId, stageNums, onStageStart }: { assessmentId: string; stageNums: number[]; onStageStart: (stageNum: number) => void }) {
  const { stageStatuses, runStage, pauseStage, resumeStage, cancelStage } = useTara();
  const queryClient = useQueryClient();
  const assetFileRef = useRef<HTMLInputElement>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const { data: stages = [], isLoading, error } = useQuery({
    queryKey: ['stage-catalog', assessmentId],
    queryFn: () => api.pipeline.catalog(assessmentId),
    enabled: !!assessmentId,
  });
  const assetRegisterStatusQuery = useQuery({
    queryKey: ['asset-register-upload', assessmentId],
    queryFn: () => api.uploads.assetRegisterStatus(assessmentId),
    enabled: !!assessmentId && stageNums.includes(3),
  });
  const stageRunQueries = useQueries({
    queries: stageNums.map((stageNum) => ({
      queryKey: ['stage-status', assessmentId, stageNum],
      queryFn: () => api.pipeline.status(assessmentId, stageNum),
      enabled: !!assessmentId && stageStatuses[String(stageNum).padStart(2, '0')] === 'failed',
      retry: false,
    })),
  });

  const handleAssetRegisterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onStageStart(3);
    setAssetUploadError(null);
    setUploadingAssets(true);
    try {
      const result = await api.uploads.assetRegister(assessmentId, file);
      queryClient.setQueryData(['asset-register-upload', assessmentId], {
        uploaded: true,
        filename: result.filename,
        asset_count: result.asset_count,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] }),
        queryClient.invalidateQueries({ queryKey: ['stage-output', assessmentId, 3] }),
      ]);
      toast.success(`${result.asset_count} Assets imported; Stage 03 marked complete`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Asset import failed';
      setAssetUploadError(message);
      toast.error(message);
    } finally {
      setUploadingAssets(false);
      event.target.value = '';
    }
  };

  const persistedAssetUpload = assetRegisterStatusQuery.data;
  const assetStatusError = assetUploadError
    ?? (assetRegisterStatusQuery.error instanceof Error ? assetRegisterStatusQuery.error.message : null);
  const hasAssetUpload = persistedAssetUpload?.uploaded === true;

  const handleRun = async (stageNum: number) => {
    onStageStart(stageNum);
    try {
      await runStage(stageNum);
      toast.success(`Stage ${stageNum} queued`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start stage');
    }
  };

  const handleControl = async (stageNum: number, action: 'pause' | 'resume' | 'cancel') => {
    try {
      if (action === 'pause') await pauseStage(stageNum);
      if (action === 'resume') await resumeStage(stageNum);
      if (action === 'cancel') await cancelStage(stageNum);
      toast.success(action === 'pause' ? `Stage ${stageNum} paused` : action === 'resume' ? `Stage ${stageNum} resumed` : `Stage ${stageNum} cancelled`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} stage`);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Pipeline Stages</span>
      </div>

      {stageNums.includes(3) && <div
        className={assetStatusError
          ? 'space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-3'
          : hasAssetUpload
            ? 'space-y-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3'
            : 'space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3'}
        role={assetStatusError ? 'alert' : 'status'}
      >
        <div className="flex items-start gap-2.5">
          {assetStatusError
            ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            : hasAssetUpload
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              : <Upload className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
          <div className="min-w-0">
            <p className={assetStatusError
              ? 'text-xs font-semibold text-destructive'
              : hasAssetUpload
                ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-400'
                : 'text-xs font-semibold text-amber-800 dark:text-amber-300'}>
              {assetStatusError ? 'Asset list upload failed' : hasAssetUpload ? 'Asset list ready' : 'Asset list required'}
            </p>
            {assetStatusError ? (
              <p className="mt-1 text-xs text-destructive">{assetStatusError}</p>
            ) : hasAssetUpload ? (
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate font-medium" title={persistedAssetUpload.filename ?? undefined}>{persistedAssetUpload.filename}</span>
                <span className="shrink-0 text-muted-foreground">· {persistedAssetUpload.asset_count} assets</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a CSV or XLSX asset list before running Stages 04–09.
              </p>
            )}
            {assetStatusError && hasAssetUpload && (
              <p className="mt-1 text-xs text-muted-foreground">The existing file remains active: {persistedAssetUpload.filename}</p>
            )}
          </div>
        </div>
        <input
          ref={assetFileRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={handleAssetRegisterUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={uploadingAssets || assetRegisterStatusQuery.isLoading}
          onClick={() => assetFileRef.current?.click()}
        >
          {hasAssetUpload ? <RefreshCw className="size-3.5" /> : <Upload className="size-3.5" />}
          {uploadingAssets
            ? 'Validating...'
            : assetRegisterStatusQuery.isLoading
              ? 'Checking upload...'
              : assetStatusError
                ? hasAssetUpload ? 'Try replacement again' : 'Try another file'
                : hasAssetUpload ? 'Replace asset file' : 'Upload asset list'}
        </Button>
      </div>}

      {isLoading && <p className="text-xs text-muted-foreground">Loading stage catalogue…</p>}
      {error && <p className="text-xs text-destructive">Unable to load stage catalogue.</p>}

      {stages.filter((stage) => stageNums.includes(stage.stage_num)).map((stage) => {
        const key = String(stage.stage_num).padStart(2, '0');
        const status = stageStatuses[key] ?? 'not_started';
        const stageRun = stageRunQueries[stageNums.indexOf(stage.stage_num)]?.data;
        const stageError = status === 'failed' ? displayStageError(stageRun?.error_message) : null;
        const blockingDependency = stage.dependencies.find((dependency) => {
          const dependencyKey = String(dependency).padStart(2, '0');
          return stageStatuses[dependencyKey] !== 'complete';
        });
        const canRun = stage.available
          && blockingDependency === undefined
          && (status === 'not_started' || status === 'failed' || status === 'cancelled');
        return (
          <div key={stage.stage_num} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="min-w-0 flex-1 text-xs text-muted-foreground sm:w-52 sm:flex-none">
                {key} — {stage.name}
              </span>
              <Badge variant={stage.available || status === 'complete' ? STATUS_VARIANT[status] : 'outline'}>
                {(status === 'running' || status === 'pending') && <LoaderCircle className="mr-1 size-3 animate-spin" aria-hidden="true" />}
                {stage.available || status === 'complete'
                  ? status === 'running' || status === 'pending' ? 'Running...' : status.replace('_', ' ')
                  : 'unavailable'}
              </Badge>
              {canRun && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => handleRun(stage.stage_num)}
                >
                  Run
                </Button>
              )}
              {status === 'running' && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => handleControl(stage.stage_num, 'pause')}>
                  <Pause className="size-3.5" aria-hidden="true" /> Pause
                </Button>
              )}
              {status === 'paused' && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => handleControl(stage.stage_num, 'resume')}>
                  <Play className="size-3.5" aria-hidden="true" /> Resume
                </Button>
              )}
              {(status === 'pending' || status === 'running' || status === 'paused') && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleControl(stage.stage_num, 'cancel')}>
                  <Square className="size-3.5" aria-hidden="true" /> Cancel
                </Button>
              )}
              {stage.available && blockingDependency !== undefined && status === 'not_started' && (
                <span className="text-[10px] text-muted-foreground">
                  Waiting on {String(blockingDependency).padStart(2, '0')}
                </span>
              )}
            </div>
            {stageError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive" role="alert">
                {stageError}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
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
      <header className="h-11 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
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
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="h-7 w-7" />
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
          <div className="w-px h-5 bg-border mx-1" />
          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20"
                aria-label="Open account menu"
              >
                <span className="text-xs font-bold text-primary">
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
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-400">
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Layout */}
      <div className="border-b p-2 md:hidden">
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
        <DialogContent className="sm:max-w-md z-[100] glass-card-premium border-border/30">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="gradient-text flex items-center justify-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
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
              className="gap-2 px-6 shadow-[0_0_20px_hsl(217_91%_60%/0.3)]"
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
