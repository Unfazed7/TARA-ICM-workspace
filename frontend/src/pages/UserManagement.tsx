import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/tara';
import { PageTransition } from '@/components/layout/PageTransition';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    LogOut,
    ArrowLeft,
    UserPlus,
    Trash2,
    Shield,
    Wrench,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; colorClass: string }> = {
    admin: { label: 'Admin', icon: ShieldCheck, colorClass: 'text-emerald-400' },
    engineer: { label: 'Engineer', icon: Wrench, colorClass: 'text-blue-400' },
    analyst: { label: 'Analyst', icon: Search, colorClass: 'text-amber-400' },
};

export default function UserManagement() {
    const navigate = useNavigate();
    const { user, users, logout, createUser, deleteUser } = useAuth();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

    // Create user form
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('engineer');
    const [createError, setCreateError] = useState('');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCreateUser = () => {
        setCreateError('');

        if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) {
            setCreateError('All fields are required');
            return;
        }

        if (newPassword.length < 6) {
            setCreateError('Password must be at least 6 characters');
            return;
        }

        const result = createUser(newEmail.trim(), newName.trim(), newPassword, newRole);
        if (result.success) {
            toast.success('User created successfully', {
                description: `${newName} (${newRole}) has been added.`,
            });
            setShowCreateDialog(false);
            resetForm();
        } else {
            setCreateError(result.error || 'Failed to create user');
        }
    };

    const handleDeleteUser = (userId: string) => {
        const result = deleteUser(userId);
        if (result.success) {
            toast.success('User deleted');
            setShowDeleteDialog(null);
        } else {
            toast.error(result.error || 'Failed to delete user');
            setShowDeleteDialog(null);
        }
    };

    const resetForm = () => {
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewRole('engineer');
        setCreateError('');
    };

    const userToDelete = users.find((u) => u.id === showDeleteDialog);

    return (
        <PageTransition>
            <div className="min-h-[100dvh] bg-background">
                <header className="sticky top-0 z-50 min-h-16 border-b bg-background/95 backdrop-blur">
                    <div className="flex min-h-16 items-center justify-between px-3 sm:px-6">
                        <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded border bg-card font-serif font-semibold" aria-hidden="true">A</span>
                            <span className="font-semibold hidden sm:inline">AutoTARA</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/dashboard')}>
                                <ArrowLeft className="w-4 h-4" />
                                Dashboard
                            </Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleLogout}>
                                <span className="sr-only">Sign out</span>
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="w-full">
                    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Page header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold gradient-text font-mono uppercase tracking-widest flex items-center gap-3">
                                    <Users className="w-6 h-6" />
                                    User Management
                                </h1>
                                <p className="text-muted-foreground font-mono text-xs tracking-wider uppercase mt-1">
                                    Create and manage user credentials
                                </p>
                            </div>
                            <Button
                                className="gap-2 btn-lift btn-shine shadow-[0_0_20px_hsl(217_91%_60%/0.2)]"
                                disabled
                                title="User provisioning API is not available"
                            >
                                <UserPlus className="w-4 h-4" />
                                Create User
                            </Button>
                        </div>

                        <div className="mb-5 rounded-md border border-amber/40 bg-amber/10 p-4 text-sm" role="status">
                            <p className="font-medium">User provisioning is read-only</p>
                            <p className="mt-1 text-muted-foreground">Account creation, deletion, and role changes are disabled until the administration API is available.</p>
                        </div>

                        {/* Users Table */}
                        <div className="rounded-md border bg-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/20">
                                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u, idx) => {
                                            const config = roleConfig[u.role];
                                            const Icon = config.icon;
                                            const isCurrentUser = u.id === user?.id;

                                            return (
                                                <tr
                                                    key={u.id}
                                                    className={cn(
                                                        'border-b border-border/10 transition-colors hover:bg-primary/5',
                                                        idx % 2 === 0 && 'bg-card/20'
                                                    )}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-primary">
                                                                    {u.name
                                                                        .split(' ')
                                                                        .map((n) => n[0])
                                                                        .join('')
                                                                        .toUpperCase()
                                                                        .slice(0, 2)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">
                                                                    {u.name}
                                                                    {isCurrentUser && (
                                                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                                                                u.role === 'admin' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                                                                u.role === 'engineer' && 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                                                                u.role === 'analyst' && 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                            )}
                                                        >
                                                            <Icon className="w-3 h-3" />
                                                            {config.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {!isCurrentUser && <span className="text-xs text-muted-foreground">Managed externally</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary footer */}
                            <div className="px-6 py-3 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{users.length} user{users.length !== 1 ? 's' : ''} registered</span>
                                <span>
                                    {users.filter((u) => u.role === 'admin').length} admin
                                    {' · '}
                                    {users.filter((u) => u.role === 'engineer').length} engineer
                                    {' · '}
                                    {users.filter((u) => u.role === 'analyst').length} analyst
                                </span>
                            </div>
                        </div>
                    </div>
                </main>

                {/* ═══════════ CREATE USER DIALOG ═══════════ */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent className="sm:max-w-md glass-card-premium border-border/30">
                        <DialogHeader>
                            <DialogTitle className="gradient-text">Create New User</DialogTitle>
                            <DialogDescription>Add a new user with login credentials</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="create-name" className="text-xs">
                                    Full Name
                                </Label>
                                <Input
                                    id="create-name"
                                    placeholder="John Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-card/40 border-border/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-email" className="text-xs">
                                    Email Address
                                </Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="bg-card/40 border-border/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-password" className="text-xs">
                                    Password
                                </Label>
                                <Input
                                    id="create-password"
                                    type="password"
                                    placeholder="Min. 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-card/40 border-border/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Role</Label>
                                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                                    <SelectTrigger className="bg-card/40 border-border/40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="engineer">
                                            <span className="flex items-center gap-2">
                                                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                                                Engineer
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="analyst">
                                            <span className="flex items-center gap-2">
                                                <Search className="w-3.5 h-3.5 text-amber-400" />
                                                Analyst
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            <span className="flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                Admin
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {createError && (
                                <div className="flex items-center gap-2 text-destructive text-xs p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                    {createError}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateUser} className="gap-2 btn-lift">
                                <UserPlus className="w-4 h-4" />
                                Create User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ═══════════ DELETE CONFIRMATION DIALOG ═══════════ */}
                <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                    <DialogContent className="sm:max-w-sm glass-card-premium border-border/30">
                        <DialogHeader>
                            <DialogTitle className="text-destructive">Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete{' '}
                                <span className="font-medium text-foreground">{userToDelete?.name}</span>? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowDeleteDialog(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => showDeleteDialog && handleDeleteUser(showDeleteDialog)}
                                className="gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PageTransition>
    );
}
