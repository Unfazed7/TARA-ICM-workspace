import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute, AdminRoute } from "@/components/layout/ProtectedRoute";
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewProject = lazy(() => import("./pages/NewProject"));
const Assessment = lazy(() => import("./pages/Assessment"));
const ReviewQueue = lazy(() => import("./pages/ReviewQueue"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const RouteFallback = () => (
  <div className="min-h-[100dvh] grid place-items-center bg-background" role="status" aria-live="polite">
    <span className="text-sm text-muted-foreground">Loading workspace…</span>
  </div>
);

/** Old /project/:id links keep working: the assessment and project id are the same value. */
const ProjectRedirect = () => {
  const { projectId = "" } = useParams();
  return <Navigate replace to={`/assessment/${projectId}`} />;
};

const App = () => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
              <Route path="/project/:projectId" element={<ProtectedRoute><ProjectRedirect /></ProtectedRoute>} />
              <Route path="/assessment/:assessmentId" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
              <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
);

export default App;
