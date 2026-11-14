import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { openDemo, useAppConfigState } from '@/lib/preview';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] grid place-items-center bg-background" role="status" aria-live="polite">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground" aria-hidden="true" />
                    Restoring your session…
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <DemoOnly>{children}</DemoOnly>;
}

/** A login limited to the demo (D-70) can open assessment pages only; any other page sends it to its demo copy. */
function DemoOnly({ children }: { children: ReactNode }) {
    const { config, ready } = useAppConfigState();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const away = ready && config.preview_only && !pathname.startsWith('/assessment/');

    useEffect(() => {
        if (!away) return;
        let live = true;
        openDemo().then((id) => { if (live) navigate(`/assessment/${id}`, { replace: true }); }).catch(() => undefined);
        return () => { live = false; };
    }, [away, navigate]);

    if (!ready || away) {
        return (
            <div className="min-h-[100dvh] grid place-items-center bg-background" role="status" aria-live="polite">
                <span className="text-sm text-muted-foreground">Opening the demo…</span>
            </div>
        );
    }
    return <>{children}</>;
}

interface AdminRouteProps {
    children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] grid place-items-center bg-background" role="status" aria-live="polite">
                <span className="text-sm text-muted-foreground">Checking access…</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
