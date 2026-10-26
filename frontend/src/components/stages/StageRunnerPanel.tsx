/**
 * Runs, pauses, resumes and cancels the pipeline stages 03 to 10 of one assessment, and lets the analyst
 * replace the generated asset list with their own CSV or XLSX file (D-54). Moved here from ProjectWorkspace.
 */

import { useRef, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useTara } from '@/contexts/TaraContext';
import {
  Play,
  AlertTriangle,
  CheckCircle2,
  Upload,
  LoaderCircle,
  Pause,
  Square,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'grey' | 'blue' | 'green' | 'red'> = {
  not_started: 'grey',
  pending: 'blue',
  running: 'blue',
  paused: 'blue',
  cancelled: 'grey',
  complete: 'green',
  failed: 'red',
};

export function displayStageError(message: string | null | undefined) {
  if (!message) return null;
  const unavailableModel = message.match(/No endpoints found for ([^."}]+)/i);
  if (unavailableModel) {
    return `Configured AI model "${unavailableModel[1]}" is unavailable. Update LLM_MODEL to an available tool-calling model and restart the backend.`;
  }
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

export function StageRunnerPanel({ assessmentId, stageNums, onStageStart, statusOverrides }: {
  assessmentId: string;
  stageNums: number[];
  onStageStart: (stageNum: number) => void;
  /** Statuses kept outside the pipeline runs, e.g. Stage 02, which lives in the stage store. */
  statusOverrides?: Record<string, string>;
}) {
  const { stageStatuses: pipelineStatuses, runStage, pauseStage, resumeStage, cancelStage } = useTara();
  const stageStatuses: Record<string, string> = { ...pipelineStatuses, ...statusOverrides };
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
    <div className="space-y-3">

      {stageNums.includes(3) && <div
        className={assetStatusError
          ? 'space-y-3 rounded-xl border border-state-red-border bg-state-red p-3'
          : hasAssetUpload
            ? 'space-y-3 rounded-xl border border-state-green-border bg-state-green p-3'
            : 'space-y-3 rounded-xl border border-border bg-[hsl(var(--well))] p-3'}
        role={assetStatusError ? 'alert' : 'status'}
      >
        <div className="flex items-start gap-2.5">
          {assetStatusError
            ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-state-red-foreground" aria-hidden="true" />
            : hasAssetUpload
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-state-green-foreground" aria-hidden="true" />
              : <Upload className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <div className="min-w-0">
            <p className={assetStatusError
              ? 'text-xs font-semibold text-state-red-foreground'
              : hasAssetUpload
                ? 'text-xs font-semibold text-state-green-foreground'
                : 'text-xs font-semibold text-foreground'}>
              {assetStatusError ? 'Asset list upload failed' : hasAssetUpload ? 'Your asset list is in use' : 'Or use your own asset list'}
            </p>
            {assetStatusError ? (
              <p className="mt-1 text-xs text-state-red-foreground">{assetStatusError}</p>
            ) : hasAssetUpload ? (
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate font-medium" title={persistedAssetUpload.filename ?? undefined}>{persistedAssetUpload.filename}</span>
                <span className="shrink-0 text-muted-foreground">· {persistedAssetUpload.asset_count} assets</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a CSV or XLSX asset list to replace the one generated from the item definition. Stage 03 can no longer be replaced once a later stage has started.
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
      {error && <p className="text-xs text-state-red-foreground">Unable to load stage catalogue.</p>}

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
          && (status === 'not_started' || status === 'failed' || status === 'cancelled' || status === 'complete');
        return (
          <div key={stage.stage_num} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="min-w-0 flex-1 text-xs text-muted-foreground sm:w-52 sm:flex-none">
                {key} — {stage.name}
              </span>
              <Badge variant={stage.available || status === 'complete' ? STATUS_VARIANT[status] : 'grey'}>
                {(status === 'running' || status === 'pending') && <LoaderCircle className="mr-1 size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
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
                  {status === 'complete' ? 'Rerun' : 'Run'}
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
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-state-red-foreground hover:text-state-red-foreground" onClick={() => handleControl(stage.stage_num, 'cancel')}>
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
              <p className="rounded-xl border border-state-red-border bg-state-red px-2.5 py-2 text-xs text-state-red-foreground" role="alert">
                {stageError}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

