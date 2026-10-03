import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, FileCheck2, LogOut, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import type { Checkpoint } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface ReviewRow extends Checkpoint {
  projectId: string;
  projectName: string;
}

const statusLabel: Record<Checkpoint['status'], string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Changes requested',
};

export default function ReviewQueue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const checkpointsQuery = useQuery({
    queryKey: ['review-checkpoints', projects.map((project) => project.id)],
    enabled: projects.length > 0,
    queryFn: async () => {
      const results = await Promise.all(projects.map(async (project) => {
        const checkpoints = await api.checkpoints.list(project.id);
        return checkpoints.map((checkpoint) => ({
          ...checkpoint,
          projectId: project.id,
          projectName: project.name,
        }));
      }));
      return results.flat() as ReviewRow[];
    },
  });

  const rows = useMemo(() => [...(checkpointsQuery.data ?? [])].sort((a, b) => {
    if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
    if (b.status === 'pending_review' && a.status !== 'pending_review') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [checkpointsQuery.data]);
  const selected = rows.find((row) => row.checkpoint_id === selectedId) ?? rows[0] ?? null;

  const reviewMutation = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') => {
      if (!selected) throw new Error('Select a checkpoint first');
      if (decision === 'rejected' && notes.trim().length < 5) {
        throw new Error('Add at least 5 characters explaining the requested changes');
      }
      return api.checkpoints.review(selected.checkpoint_id, decision, notes.trim());
    },
    onSuccess: async () => {
      setNotes('');
      await queryClient.invalidateQueries({ queryKey: ['review-checkpoints'] });
    },
  });

  const isLoading = projectsLoading || checkpointsQuery.isLoading;
  const error = projectsError ?? (checkpointsQuery.error instanceof Error ? checkpointsQuery.error : null);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
            <ArrowLeft className="size-4" />
          </Button>
          <FileCheck2 className="size-5" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Review checkpoints</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Evidence-based stage approval</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-4 p-3 sm:p-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-md border bg-card" aria-labelledby="queue-title">
          <div className="border-b p-4">
            <h2 id="queue-title" className="font-semibold">Queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">{rows.filter((row) => row.status === 'pending_review').length} awaiting a decision</p>
          </div>
          {isLoading && <div className="p-6 text-sm text-muted-foreground" role="status">Loading checkpoints…</div>}
          {error && (
            <div className="m-4 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div><p className="font-medium">Could not load the review queue</p><p className="text-muted-foreground">{error.message}</p></div>
            </div>
          )}
          {!isLoading && !error && rows.length === 0 && (
            <div className="p-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">No checkpoints yet</p><p className="mt-1 text-sm text-muted-foreground">Pipeline stages that require review will appear here.</p></div>
          )}
          <div className="divide-y">
            {rows.map((row) => (
              <button
                key={row.checkpoint_id}
                type="button"
                onClick={() => { setSelectedId(row.checkpoint_id); setNotes(''); reviewMutation.reset(); }}
                aria-pressed={selected?.checkpoint_id === row.checkpoint_id}
                className={cn('flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', selected?.checkpoint_id === row.checkpoint_id && 'bg-muted')}
              >
                {row.status === 'approved' ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : row.status === 'rejected' ? <XCircle className="mt-0.5 size-4 text-destructive" /> : <Clock className="mt-0.5 size-4 text-amber-600" />}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.stage_name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{row.projectName} · Stage {String(row.stage_num).padStart(2, '0')}</span></span>
                <Badge variant="outline" className="shrink-0">{statusLabel[row.status]}</Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border bg-card p-4 sm:p-6" aria-labelledby="review-title">
          {!selected ? <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">Select a checkpoint to inspect it.</div> : (
            <div className="space-y-6">
              <div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline">Stage {String(selected.stage_num).padStart(2, '0')}</Badge><Badge variant={selected.status === 'rejected' ? 'destructive' : 'secondary'}>{statusLabel[selected.status]}</Badge></div><h2 id="review-title" className="text-xl font-semibold">{selected.stage_name}</h2><button className="mt-1 text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => navigate(`/project/${selected.projectId}`)}>Open {selected.projectName}</button></div>
              <dl className="grid gap-3 rounded-md border bg-background p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Checkpoint</dt><dd className="mt-1 font-mono">{selected.checkpoint_id}</dd></div>
                <div><dt className="text-muted-foreground">Created</dt><dd className="mt-1">{new Date(selected.created_at).toLocaleString()}</dd></div>
                {selected.reviewer_id && <div><dt className="text-muted-foreground">Reviewed by</dt><dd className="mt-1">{selected.reviewer_id}</dd></div>}
                {selected.reviewed_at && <div><dt className="text-muted-foreground">Reviewed</dt><dd className="mt-1">{new Date(selected.reviewed_at).toLocaleString()}</dd></div>}
              </dl>
              {selected.status === 'pending_review' ? (
                <div className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="review-notes">Review notes</Label><Textarea id="review-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record evidence, rationale, or requested changes…" className="min-h-32" /><p className="text-xs text-muted-foreground">Notes are required when requesting changes.</p></div>
                  {reviewMutation.error && <p className="text-sm text-destructive" role="alert">{reviewMutation.error.message}</p>}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => reviewMutation.mutate('rejected')} disabled={reviewMutation.isPending}><XCircle className="mr-2 size-4" />Request changes</Button><Button onClick={() => reviewMutation.mutate('approved')} disabled={reviewMutation.isPending}><CheckCircle2 className="mr-2 size-4" />Approve checkpoint</Button></div>
                </div>
              ) : <div className="rounded-md border p-4"><p className="font-medium">Decision recorded</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes || 'No review notes were supplied.'}</p></div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
