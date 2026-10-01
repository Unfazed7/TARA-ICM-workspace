import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
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
import { NetworkParticles } from '@/components/effects/NetworkParticles';
import { MeshGradient } from '@/components/effects/MeshGradient';
import { VignetteOverlay } from '@/components/effects/VignetteOverlay';
import { LightRays } from '@/components/effects/LightRays';
import { NoiseTexture } from '@/components/effects/NoiseTexture';
import { AnimatedShield } from '@/components/effects/AnimatedShield';
import { BentoGrid } from '@/components/dashboard/BentoGrid';
import { ActiveAssessmentTile } from '@/components/dashboard/ActiveAssessmentTile';
import { ThreatFeedTile } from '@/components/dashboard/ThreatFeedTile';
import { StatTile } from '@/components/dashboard/StatTile';
import { ComplianceScoreTile } from '@/components/dashboard/ComplianceScoreTile';
import { QuickActionTile } from '@/components/dashboard/QuickActionTile';
import { toast } from 'sonner';
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
  const { projects } = useProjects();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  // ─── Computed stats ───────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === 'active');
  const nonArchivedProjects = projects.filter(p => p.status !== 'archived');
  const sortedProjects = [...nonArchivedProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const mostRecent = sortedProjects[0] || null;
  const recentProjects = sortedProjects.slice(1, 4);

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
      <div className="h-screen w-screen overflow-hidden relative">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Background layers */}
        <div className="fixed inset-0 animated-grid gradient-shift pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)' }} />
        <MeshGradient enableParallax={false} />
        <LightRays />
        <NetworkParticles count={10} enableParallax={false} />
        <VignetteOverlay />
        <NoiseTexture />

        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        </div>
        <div className="fixed top-0 left-0 right-0 h-px glow-line pointer-events-none" />

        {/* Floating Glass Header */}
        <header className="fixed top-0 left-0 w-full z-50 h-20 border-b border-border/5 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-8">
            <div className="flex items-center gap-3">
              <AnimatedShield size="sm" />
              <span className="font-semibold gradient-text hidden sm:inline">AutoTARA</span>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center relative max-w-xs w-full mx-4">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search projects..."
                className="pl-9 h-9 rounded-full border-border/50 bg-card/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="flex items-center gap-3">

              {/* New project */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => navigate('/projects/new')}
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
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="relative z-10 h-[calc(100vh-5rem)] w-full overflow-hidden pt-20">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            {/* OPERATOR greeting */}
            <div className="mb-6 mt-4 animate-stagger">
              <h1 className="text-2xl font-bold mb-1 gradient-text font-mono uppercase tracking-widest">
                OPERATOR // {user?.name}
              </h1>
              <p className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                {roleGreetings[user?.role || 'engineer']}
              </p>
            </div>

            {/* Bento Grid */}
            <BentoGrid>
              <ActiveAssessmentTile
                project={mostRecent}
                recentProjects={recentProjects}
                allProjects={nonArchivedProjects}
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
              />
              <ComplianceScoreTile score={avgCompletion} projects={activeProjects} />
              <QuickActionTile projects={projects} />
            </BentoGrid>
          </div>
        </main>

        {/* Corner accents */}
        <div className="fixed bottom-8 left-8 w-16 h-16 border-l border-b border-primary/10 rounded-bl-xl pointer-events-none" />
        <div className="fixed bottom-8 right-8 w-16 h-16 border-r border-b border-accent/10 rounded-br-xl pointer-events-none" />

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
      </div>
    </PageTransition>
  );
}
