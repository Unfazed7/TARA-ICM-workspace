import { useState, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

import { ModuleSidebar } from '@/components/workspace/ModuleSidebar';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';

import { ItemDefinition } from '@/components/workspace/ItemDefinition';
import { AssumptionScope } from '@/components/workspace/AssumptionScope';
import { FeatureAnalysis } from '@/components/workspace/FeatureAnalysis';
import { CALDetermination } from '@/components/workspace/CALDetermination';
import { PageTransition } from '@/components/layout/PageTransition';
import { TaraProvider, useTara } from '@/contexts/TaraContext';
import { ModuleType } from '@/types/tara';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_started: 'outline',
  pending: 'secondary',
  running: 'secondary',
  complete: 'default',
  failed: 'destructive',
};

const STAGE_LABELS = [
  { num: 1, label: '01 — Input Normalization' },
  { num: 2, label: '02 — Damage Analysis' },
  { num: 3, label: '03 — Threat Identification' },
  { num: 4, label: '04 — Attack Path Modelling' },
  { num: 5, label: '05 — Impact Analysis' },
  { num: 6, label: '06 — Risk Scoring' },
  { num: 7, label: '07 — Risk Treatment' },
];

function StageRunnerPanel({ assessmentId }: { assessmentId: string }) {
  const { stageStatuses, runStage } = useTara();
  const [uploading, setUploading] = useState(false);
  const [csvReady, setCsvReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploads.csv(assessmentId, file);
      setCsvReady(true);
      toast.success('CSV uploaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRun = async (stageNum: number) => {
    try {
      await runStage(stageNum);
      toast.success(`Stage ${stageNum} queued`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start stage');
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Pipeline Stages</span>
      </div>

      {/* CSV Upload */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsvUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : csvReady ? 'Replace CSV' : 'Upload Assets CSV'}
        </Button>
        {csvReady && <span className="text-xs text-emerald-400">✓ CSV ready</span>}
      </div>

      {/* Stage rows */}
      {STAGE_LABELS.map(({ num, label }) => {
        const key = String(num).padStart(2, '0');
        const status = stageStatuses[key] ?? 'not_started';
        const canRun = status === 'not_started' || status === 'failed';
        return (
          <div key={num} className="flex items-center gap-3">
            <span className="text-xs w-44 text-muted-foreground">{label}</span>
            <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>
            {canRun && (
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleRun(num)}>
                Run
              </Button>
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
  const { user, logout, changePassword } = useAuth();
  const { getProject, updateProject } = useProjects();
  const { saveProgress, isSaving, hasUnsavedChanges } = useTara();

  const [activeModule, setActiveModule] = useState<ModuleType>('tara');
  const [activeTab, setActiveTab] = useState<string>('asset-damage');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Change Password State
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const project = getProject(projectId);

  if (!project) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    const result = changePassword(currentPassword, newPassword);
    if (result.success) {
      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'Failed to change password');
    }
  };

  const openPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    try {
      await saveProgress();
      // Update project's updatedAt timestamp
      updateProject(projectId, {
        updatedAt: new Date().toISOString(),
      });
      setShowSaveDialog(false);
      toast.success('Progress saved successfully', {
        description: `${project.name} — saved to database`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      });
    } catch {
      toast.error('Failed to save progress', {
        description: 'Please try again',
      });
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate('/dashboard')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm">AutoTARA</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{project.name}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {project.catalogVersion}
          </Badge>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2"
            onClick={handleSaveClick}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-2">
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Validate</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
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
              <DropdownMenuItem onClick={openPasswordDialog} className="cursor-pointer">
                <KeyRound className="mr-2 w-4 h-4" />
                Change Password
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
      <div className="flex-1 flex overflow-hidden">
        <ModuleSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeModule === 'cal-determination' && <CALDetermination />}
          {activeModule === 'feature-analysis' && <FeatureAnalysis />}
          {activeModule === 'assumption-scope' && <AssumptionScope />}
          {activeModule === 'item-definition' && <ItemDefinition assessmentId={projectId} />}
          {activeModule === 'tara' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border shrink-0">
                <StageRunnerPanel assessmentId={projectId} />
              </div>
              <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}
        </main>
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
              All TARA analysis data will be saved to the local database.
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
      {/* ═════ Change Password Dialog ═════ */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md z-[100] glass-card-premium border-border/30">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="gradient-text flex items-center justify-center gap-2 text-xl">
              <KeyRound className="w-5 h-5" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-center">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Current Password</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-card/40 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-card/40 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-card/40 border-border/40"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-400 text-center">{passwordError}</p>
            )}
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              className="gap-2 px-6"
            >
              <KeyRound className="w-4 h-4" />
              Update Password
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
