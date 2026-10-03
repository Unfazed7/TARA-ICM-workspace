import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageTransition } from '@/components/layout/PageTransition';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BentoGrid } from '@/components/dashboard/BentoGrid';
import { ActiveAssessmentTile } from '@/components/dashboard/ActiveAssessmentTile';
import { ThreatFeedTile } from '@/components/dashboard/ThreatFeedTile';
import { StatTile } from '@/components/dashboard/StatTile';
import { ComplianceScoreTile } from '@/components/dashboard/ComplianceScoreTile';
import { QuickActionTile } from '@/components/dashboard/QuickActionTile';
import { toast } from 'sonner';
import type { Project } from '@/types/tara';
import {
  LogOut,
  Search,
  FolderOpen,
  ClipboardCheck,
  Plus,
  Users,
  KeyRound,
  UserCircle,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const { projects, deleteProject, isLoading, error: projectsError } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const confirmProjectDelete = async () => {
    const project = projectToDelete;
    if (!project) return;
    setIsDeletingProject(true);
    try {
      await deleteProject(project.id);
      toast.success(`${project.name} deleted completely`);
      setProjectToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete project');
    } finally {
      setIsDeletingProject(false);
    }
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

  // ─── Computed stats ───────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === 'active');
  const nonArchivedProjects = projects.filter(p => p.status !== 'archived');
  const sortedProjects = [...nonArchivedProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const mostRecent = sortedProjects[0] || null;
  const recentProjects = sortedProjects.slice(1, 4);
  const filteredProjects = searchQuery.trim()
    ? sortedProjects.filter((project) => `${project.name} ${project.description ?? ''} ${project.domains.join(' ')}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : sortedProjects;

  // Total projects = exact count of non-archived projects
  const totalProjectsCount = nonArchivedProjects.length;

  // Pending reviews = projects that are active but not yet completed (completion < 100)
  const pendingReviewProjects = activeProjects.filter(p => (p.completionPercentage ?? 0) < 100);
  const pendingReviewsCount = pendingReviewProjects.length;

  // Compliance score = average completion across all active projects
  const avgCompletion = activeProjects.length > 0
    ? Math.round(activeProjects.reduce((sum, p) => sum + (p.completionPercentage ?? 0), 0) / activeProjects.length)
    : 0;

  const roleGreetings: Record<string, string> = {
    engineer: 'Ready to assess some threats?',
    analyst: 'Review queue awaits your expertise.',
    admin: 'Full system access enabled.',
  };

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-background">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <header className="sticky top-0 z-50 min-h-16 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded border bg-card font-serif font-semibold" aria-hidden="true">A</span>
              <span className="hidden font-semibold sm:inline">AutoTARA</span>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center relative max-w-xs w-full mx-4">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search projects..."
                aria-label="Search projects"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 bg-card pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* New project */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => navigate('/projects/new')}
                aria-label="Create project"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Admin-only user management */}
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate('/admin/users')}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Users</span>
                </Button>
              )}

              {/* Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20"
                    aria-label="Open account menu"
                  >
                    <span className="text-xs font-bold text-primary">
                      {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <UserCircle className="w-4 h-4" />}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="w-full">
          <div className="mx-auto flex max-w-[1600px] flex-col px-3 py-6 sm:px-6 lg:px-8">
            {/* OPERATOR greeting */}
            <div className="mb-6 mt-4 animate-stagger">
              <h1 className="mb-1 font-serif text-2xl font-semibold">
                Welcome, {user?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {roleGreetings[user?.role || 'engineer']}
              </p>
            </div>

            {isLoading && <div className="rounded-md border bg-card p-8 text-sm text-muted-foreground" role="status">Loading assessments…</div>}
            {projectsError && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5" role="alert"><p className="font-medium">Could not load assessments</p><p className="mt-1 text-sm text-muted-foreground">{projectsError.message}</p></div>}
            {!isLoading && !projectsError && searchQuery && filteredProjects.length === 0 && <div className="mb-4 rounded-md border bg-card p-5 text-sm">No projects match “{searchQuery}”.</div>}
            {!isLoading && !projectsError && <BentoGrid>
              <ActiveAssessmentTile
                project={filteredProjects[0] ?? null}
                recentProjects={filteredProjects.slice(1, 4)}
                allProjects={filteredProjects}
                onDelete={setProjectToDelete}
              />
              <ThreatFeedTile />
              <StatTile
                label="Total Projects"
                value={totalProjectsCount}
                icon={FolderOpen}
                subtitle={`${activeProjects.length} active`}
                accentClass="text-primary"
                dialogTitle="All Projects"
                dialogDescription={`${totalProjectsCount} project${totalProjectsCount !== 1 ? 's' : ''} total`}
                projects={nonArchivedProjects}
                onDelete={setProjectToDelete}
              />
              <StatTile
                label="Pending Reviews"
                value={pendingReviewsCount}
                icon={ClipboardCheck}
                subtitle="Awaiting approval"
                accentClass="text-amber"
                dialogTitle="Pending Reviews"
                dialogDescription={`${pendingReviewsCount} project${pendingReviewsCount !== 1 ? 's' : ''} awaiting review`}
                projects={pendingReviewProjects}
                onDelete={setProjectToDelete}
              />
              <ComplianceScoreTile score={avgCompletion} projects={activeProjects} />
              <QuickActionTile projects={projects} />
            </BentoGrid>}
          </div>
        </main>

        {/* ═════ Change Password Dialog ═════ */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md glass-card-premium border-border/30">
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

        <AlertDialog open={!!projectToDelete} onOpenChange={(open) => { if (!open && !isDeletingProject) setProjectToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {projectToDelete?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the project, pipeline runs, checkpoints, review history, uploaded inputs, generated artifacts, and browser drafts. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingProject}>Keep project</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingProject}
                onClick={confirmProjectDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingProject ? 'Deleting...' : 'Delete permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
