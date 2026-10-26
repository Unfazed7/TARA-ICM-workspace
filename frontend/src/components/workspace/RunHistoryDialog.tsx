import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, History, LoaderCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import type { PipelineRunAttempt } from '@/types/api';

const STATUS_VARIANT: Record<string, 'grey' | 'blue' | 'green' | 'red'> = {
  pending: 'blue',
  running: 'blue',
  paused: 'blue',
  cancelled: 'grey',
  complete: 'green',
  failed: 'red',
};

function formatDate(value: string | null) {
  if (!value) return 'Not started';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return '—';
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = Math.round(milliseconds / 100) / 10;
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function RunRow({ attempt, onView }: { attempt: PipelineRunAttempt; onView: () => void }) {
  const active = ['pending', 'running', 'paused'].includes(attempt.status);
  return (
    <div className="grid gap-3 border-b border-border px-3 py-3 text-sm last:border-0 md:grid-cols-[minmax(10rem,1.3fr)_minmax(11rem,1fr)_minmax(9rem,1fr)_6rem_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{String(attempt.stage_num).padStart(2, '0')} — {attempt.stage_name.replace(/-/g, ' ')}</p>
        <p className="truncate text-xs text-muted-foreground" title={attempt.attempt_id}>{attempt.attempt_id}</p>
      </div>
      <div>
        <p>{formatDate(attempt.started_at)}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(attempt.duration_ms)}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate" title={attempt.model ?? undefined}>{attempt.model || 'Provider default'}</p>
        <p className="text-xs text-muted-foreground">{attempt.provider || 'Unknown provider'}</p>
      </div>
      <Badge variant={STATUS_VARIANT[attempt.status]} className="w-fit capitalize">
        {active && <LoaderCircle className="mr-1 size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {attempt.status}
      </Badge>
      <Button size="sm" variant="outline" className="w-fit gap-1.5" disabled={!attempt.log_available} onClick={onView}>
        <FileText className="size-3.5" aria-hidden="true" />
        {attempt.log_available ? 'View log' : active ? 'Starting…' : 'Unavailable'}
      </Button>
    </div>
  );
}

export function RunHistoryDialog({ assessmentId }: { assessmentId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PipelineRunAttempt | null>(null);
  const [downloading, setDownloading] = useState(false);
  const historyQuery = useQuery({
    queryKey: ['run-history', assessmentId],
    queryFn: () => api.pipeline.runHistory(assessmentId),
    enabled: open,
    refetchInterval: (query) => query.state.data?.some(item => ['pending', 'running', 'paused'].includes(item.status)) ? 2000 : false,
  });
  const logQuery = useQuery({
    queryKey: ['run-log', assessmentId, selected?.attempt_id],
    queryFn: () => api.pipeline.runLog(assessmentId, selected!.attempt_id),
    enabled: open && !!selected?.log_available,
    refetchInterval: selected && ['pending', 'running', 'paused'].includes(selected.status) ? 2000 : false,
  });

  const handleDownload = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const { blob, filename } = await api.pipeline.downloadRunLog(assessmentId, selected.attempt_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the log');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSelected(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-[34px] gap-2 rounded-[10px] bg-card text-foreground hover:bg-accent">
          <History className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Run history</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(82vh,52rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-4 pr-7">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {selected && <Button variant="ghost" size="icon" className="-ml-2 size-7" onClick={() => setSelected(null)} aria-label="Back to run history"><ArrowLeft className="size-4" /></Button>}
                {selected ? `Stage ${String(selected.stage_num).padStart(2, '0')} log` : 'Run history'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {selected ? `${selected.attempt_id} · ${formatDate(selected.started_at)}` : 'Redacted execution logs retained for troubleshooting and audit.'}
              </DialogDescription>
            </div>
            {selected ? (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={downloading} onClick={handleDownload}>
                {downloading ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Download className="size-3.5" />}
                Download
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="size-8" disabled={historyQuery.isFetching} onClick={() => historyQuery.refetch()} aria-label="Refresh run history">
                <RefreshCw className={`size-4 ${historyQuery.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              </Button>
            )}
          </div>
        </DialogHeader>

        {selected ? (
          <ScrollArea className="min-h-0 flex-1 bg-muted/30">
            {logQuery.isLoading && <div className="grid min-h-48 place-items-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 inline size-4 animate-spin motion-reduce:animate-none" /> Loading log…</div>}
            {logQuery.error && <p className="m-4 rounded-xl border border-state-red-border bg-state-red p-3 text-sm text-state-red-foreground" role="alert">{logQuery.error.message}</p>}
            {logQuery.data && <pre className="min-w-full whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-foreground">{logQuery.data}</pre>}
          </ScrollArea>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            {historyQuery.isLoading && <div className="grid min-h-48 place-items-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 inline size-4 animate-spin motion-reduce:animate-none" /> Loading run history…</div>}
            {historyQuery.error && <p className="m-4 rounded-xl border border-state-red-border bg-state-red p-3 text-sm text-state-red-foreground" role="alert">{historyQuery.error.message}</p>}
            {historyQuery.data?.length === 0 && <div className="grid min-h-48 place-items-center px-4 text-center"><div><History className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="font-medium">No stage runs yet</p><p className="mt-1 text-sm text-muted-foreground">Logs will appear here when a pipeline stage is started.</p></div></div>}
            {historyQuery.data?.map(attempt => <RunRow key={attempt.attempt_id} attempt={attempt} onView={() => setSelected(attempt)} />)}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
