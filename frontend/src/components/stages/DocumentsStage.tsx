/**
 * 01 Documents: what is being assessed, the two document groups, Execute and live status (spec 24, D-51).
 * Uploads go straight to the server (spec 23), so the screen always shows what Stage 01 will read.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Loader2, Plus, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader, StatusDot } from '@/components/layout/StageShell';
import { useMotionPreset } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { stagesApi } from '@/lib/stagesApi';
import type { DocGroup, PipelineStatus, UploadedDocument } from '@/types/stages';
import { DOC_LABELS, fileKindTone, GROUP_TITLE, groupOfType, sizeWords, TONE_CHIP } from './words';

const ACCEPT = '.drawio,.md,.txt,.html,.htm,.docx,.xlsx,.pdf,.png,.jpg,.jpeg';
const OTHER = '__other__';

interface Row {
  key: string;
  label: string; // a dropdown label, or '' while not chosen
  other: boolean; // Other (specify): the analyst types the kind
  otherText: string;
  file?: string; // uploaded file name
  size?: number; // uploaded file size in bytes
  busy?: boolean;
  error?: string;
}

let rowCounter = 0;
const newRow = (): Row => ({ key: `row-${++rowCounter}`, label: '', other: false, otherText: '' });

function rowsFrom(docs: UploadedDocument[]): Record<DocGroup, Row[]> {
  const rows: Record<DocGroup, Row[]> = { components: [], behaviour: [] };
  for (const d of docs) {
    const group: DocGroup = d.category || groupOfType(d.doc_type) || 'components';
    const label = d.type_label && DOC_LABELS[group].includes(d.type_label) ? d.type_label : '';
    const other = !label && d.doc_type === 'other';
    rows[group].push({ ...newRow(), label, other, otherText: other ? d.type_label || '' : '', file: d.file, size: d.size_bytes });
  }
  for (const g of ['components', 'behaviour'] as DocGroup[]) if (!rows[g].length) rows[g].push(newRow());
  return rows;
}

const typeOf = (r: Row) => (r.other ? r.otherText.trim() : r.label);
const isActive = (p?: PipelineStatus) => !!p?.stages.some((s) => s.status === 'pending' || s.status === 'running');

export function DocumentsStage({ assessmentId, project, onOpenItemDefinition }: { assessmentId: string; project: string; onOpenItemDefinition: () => void }) {
  const queryClient = useQueryClient();
  const { riseList, riseItem, easeOut } = useMotionPreset();
  const docs = useQuery({ queryKey: ['documents', assessmentId], queryFn: () => stagesApi.documents(assessmentId) });
  const boundary = useQuery({ queryKey: ['boundary', assessmentId], queryFn: () => stagesApi.boundary(assessmentId) });
  const pipeline = useQuery({
    queryKey: ['pipeline', assessmentId],
    queryFn: () => stagesApi.pipeline(assessmentId),
    refetchInterval: (q) => (isActive(q.state.data) ? 3000 : false),
  });

  const [rows, setRows] = useState<Record<DocGroup, Row[]> | null>(null);
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [boundaryError, setBoundaryError] = useState('');
  const [runError, setRunError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (docs.data && rows === null) setRows(rowsFrom(docs.data));
  }, [docs.data, rows]);
  useEffect(() => {
    if (boundary.data) {
      setText(boundary.data.text || '');
      setSavedText(boundary.data.text || '');
    }
  }, [boundary.data]);

  // When a run finishes, the stage outputs and Assumptions change.
  const wasActive = useRef(false);
  useEffect(() => {
    const active = isActive(pipeline.data);
    if (wasActive.current && !active) queryClient.invalidateQueries({ predicate: (q) => q.queryKey[1] === assessmentId });
    wasActive.current = active;
  }, [pipeline.data, assessmentId, queryClient]);

  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: ['pipeline', assessmentId] });
  const locked = isActive(pipeline.data) || starting;
  const stage = (n: '01' | '02') => pipeline.data?.stages.find((s) => s.stage === n);
  const failed = pipeline.data?.stages.find((s) => s.status === 'failed');
  const done = stage('02')?.status === 'complete';

  const update = (group: DocGroup, key: string, change: Partial<Row>) =>
    setRows((prev) => prev && { ...prev, [group]: prev[group].map((r) => (r.key === key ? { ...r, ...change } : r)) });

  async function uploadFile(group: DocGroup, row: Row, file: File) {
    update(group, row.key, { busy: true, error: undefined });
    try {
      if (row.file && row.file !== file.name) await stagesApi.removeDocument(assessmentId, row.file);
      const saved = await stagesApi.upload(assessmentId, file, group, typeOf(row));
      update(group, row.key, { busy: false, file: saved.file, size: saved.size_bytes });
      refreshStatus();
    } catch (err) {
      update(group, row.key, { busy: false, error: (err as Error).message });
    }
  }

  async function removeRow(group: DocGroup, row: Row) {
    if (row.file) {
      update(group, row.key, { busy: true, error: undefined });
      try {
        await stagesApi.removeDocument(assessmentId, row.file);
      } catch (err) {
        update(group, row.key, { busy: false, error: (err as Error).message });
        return;
      }
      refreshStatus();
    }
    setRows((prev) => {
      if (!prev) return prev;
      const left = prev[group].filter((r) => r.key !== row.key);
      return { ...prev, [group]: left.length ? left : [newRow()] };
    });
  }

  async function saveBoundary() {
    const value = text.trim();
    if (value === savedText.trim()) return;
    if (value.split(/\s+/).filter(Boolean).length < 6) {
      setBoundaryError('Give the item name and one sentence on what it covers.');
      return;
    }
    try {
      await stagesApi.saveBoundary(assessmentId, value);
      setSavedText(value);
      setBoundaryError('');
      refreshStatus();
    } catch (err) {
      setBoundaryError((err as Error).message);
    }
  }

  async function execute() {
    setRunError('');
    setStarting(true);
    try {
      await saveBoundary();
      await stagesApi.run(assessmentId);
      await refreshStatus();
    } catch (err) {
      setRunError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const missing = useMemo(() => pipeline.data?.missing ?? [], [pipeline.data]);
  const unsavedBoundary = text.trim() !== savedText.trim();
  const canExecute = !locked && missing.length === 0 && !unsavedBoundary;

  if (docs.isLoading || boundary.isLoading || !rows) {
    return <p className="p-10 text-muted-foreground">Loading the documents...</p>;
  }
  if (docs.error) return <p className="p-10 text-state-red-foreground">{(docs.error as Error).message}</p>;

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const boundaryDone = !!savedText.trim() && !unsavedBoundary && !boundaryError;
  const added = (g: DocGroup) => rows[g].filter((r) => r.file).length;
  const groupsReady = (['components', 'behaviour'] as DocGroup[]).filter((g) => added(g) > 0).length;
  const docCount = added('components') + added('behaviour');
  const lastRun = stage('01')?.started_at;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,32px)] pb-20 pt-7">
      <PageHeader
        project={project}
        title="Documents"
        right={
          <>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone={groupsReady === 2 ? 'green' : 'yellow'} />
              {groupsReady} of 2 groups ready
            </span>
            <span><span className="aegis-mono text-foreground">{docCount}</span> documents</span>
            {lastRun && <span>Last run {new Date(lastRun).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <motion.div variants={riseList} initial="hidden" animate="show" className="flex min-w-0 flex-[999_1_640px] flex-col gap-6">
          <motion.section variants={riseItem} className="aegis-card">
            <div className={cn('aegis-card-head', !boundaryDone && 'aegis-open-edge')}>
              <span className="flex min-w-0 items-center gap-3">
                <StepChip n="1" />
                <span className="flex min-w-0 flex-col">
                  <span className="aegis-label">Step 1 · Boundary</span>
                  <label htmlFor="boundary" className="text-[15px] font-semibold leading-snug">
                    What is being assessed? <span className="text-state-yellow-foreground" aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                </span>
              </span>
              <span className="flex items-center gap-2.5">
                <span className="aegis-mono text-xs text-muted-foreground">{words} words</span>
                <Badge variant={boundaryDone ? 'green' : 'yellow'}>{boundaryDone ? 'Done' : 'Required'}</Badge>
              </span>
            </div>
            <div className="flex flex-col gap-2 px-6 pb-5 pt-4">
              <span id="boundary-help" className="text-[13.5px] text-muted-foreground">The system's name and one sentence on what it covers. Every later stage is built inside this boundary.</span>
              <textarea
                id="boundary"
                rows={3}
                aria-describedby="boundary-help"
                value={text}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
                onBlur={saveBoundary}
                placeholder="For example: This is a key management system and we need to assess everything deployed in its cloud account."
                className={cn('aegis-well min-h-[96px] w-full resize-y rounded-xl px-3.5 py-3 text-[15px] leading-relaxed disabled:bg-[hsl(var(--state-grey))] disabled:text-muted-foreground', boundaryError && 'border-state-red-foreground')}
              />
              {boundaryError ? (
                <p className="m-0 text-[13px] text-state-red-foreground" role="alert">{boundaryError}</p>
              ) : boundaryDone ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-state-green-foreground">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                  Saved
                </span>
              ) : null}
            </div>
          </motion.section>

          {(['components', 'behaviour'] as DocGroup[]).map((group, i) => (
            <motion.section key={group} variants={riseItem} className="aegis-card" aria-labelledby={`group-${group}`}>
              <div className={cn('aegis-card-head', !added(group) && 'aegis-open-edge')}>
                <span className="flex min-w-0 items-center gap-3">
                  <StepChip n={String(i + 2)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="aegis-label">Step {i + 2} · {group === 'components' ? 'Architecture' : 'Behaviour'}</span>
                    <h2 id={`group-${group}`} className="m-0 text-[15px] font-semibold leading-snug">
                      {GROUP_TITLE[group]} <span className="text-state-yellow-foreground" aria-hidden="true">*</span>
                      <span className="sr-only"> (required)</span>
                    </h2>
                  </span>
                </span>
                <Badge variant={added(group) ? 'green' : 'yellow'}>{added(group)} added</Badge>
              </div>
              <div className="drow aegis-label hidden border-b border-rule bg-[#F7F6F2] px-6 py-2 md:grid">
                <span>Type</span>
                <span>File</span>
                <span>Actions</span>
              </div>
              <AnimatePresence initial={false}>
                {rows[group].map((row) => (
                  <motion.div key={row.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={easeOut} className="overflow-hidden">
                    <DocumentRow
                      group={group}
                      row={row}
                      locked={locked}
                      onChange={(change) => update(group, row.key, change)}
                      onFile={(file) => uploadFile(group, row, file)}
                      onRemove={() => removeRow(group, row)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="bg-[hsl(var(--well))] px-6 py-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={() => setRows((prev) => prev && { ...prev, [group]: [...prev[group], newRow()] })}
                  className="border-dashed border-[hsl(47_8%_78%)]"
                >
                  <Plus aria-hidden="true" />
                  Add another document
                </Button>
              </div>
            </motion.section>
          ))}
        </motion.div>

        <aside className="sticky top-24 flex min-w-0 flex-[1_1_340px] flex-col gap-3.5" aria-labelledby="run-h">
          <RunCard
            pipeline={pipeline.data}
            starting={starting}
            locked={locked}
            done={done}
            checks={[
              { label: 'What is being assessed', ok: boundaryDone },
              { label: 'A document describing the components or architecture', ok: added('components') > 0 },
              { label: 'A document describing what the system does', ok: added('behaviour') > 0 },
            ]}
            footer={
              locked
                ? 'Documents are locked while the run is going. You can leave this page.'
                : missing.length
                  ? `Required: ${missing.map((m) => m.replace(/\.$/, '')).join('; ')}.`
                  : unsavedBoundary
                    ? 'Click outside the box to save what is being assessed.'
                    : done
                      ? 'Both stages finished. Execute again if you change a document.'
                      : 'Both stages run one after the other. You can leave this page.'
            }
            canExecute={canExecute}
            executeLabel={failed || done ? 'Execute again' : 'Execute'}
            onExecute={execute}
            onOpen={onOpenItemDefinition}
            runError={runError}
          />
        </aside>
      </div>
    </div>
  );
}

function StepChip({ n }: { n: string }) {
  return (
    <span className="aegis-mono flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[13px] font-medium text-foreground" aria-hidden="true">
      {n}
    </span>
  );
}

function DocumentRow({
  group,
  row,
  locked,
  onChange,
  onFile,
  onRemove,
}: {
  group: DocGroup;
  row: Row;
  locked: boolean;
  onChange: (change: Partial<Row>) => void;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const typeChosen = row.other ? row.otherText.trim().length >= 3 : !!row.label;
  // The type is sent with the file, so it is fixed once uploaded: remove the row to change it.
  const typeLocked = locked || !!row.file || row.busy;
  const selectId = `${row.key}-type`;

  const ext = row.file ? row.file.split('.').pop()?.toUpperCase() || '' : '';

  return (
    <div className="flex flex-col gap-2 border-b border-rule px-6 py-3 transition-colors hover:bg-[hsl(var(--well))]">
      <div className="drow grid">
        <div className="relative min-w-0">
          {row.other ? (
            <div className="aegis-well flex h-10 items-center gap-1.5 rounded-[10px] pl-3 focus-within:border-ring focus-within:bg-card">
              <span className="aegis-label shrink-0">Other:</span>
              <input
                aria-label="Name the document type"
                placeholder="e.g. Security policy"
                value={row.otherText}
                maxLength={60}
                disabled={typeLocked}
                onChange={(e) => onChange({ otherText: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:text-muted-foreground"
              />
              <button
                type="button"
                aria-label="Choose a listed type instead"
                disabled={typeLocked}
                onClick={() => onChange({ other: false, otherText: '' })}
                className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <label htmlFor={selectId} className="sr-only">Document type</label>
              <select
                id={selectId}
                value={row.label}
                disabled={typeLocked}
                title={row.file ? 'Remove this document and add it again to change its type.' : undefined}
                onChange={(e) =>
                  e.target.value === OTHER ? onChange({ other: true, label: '' }) : onChange({ label: e.target.value })
                }
                className={cn('aegis-well h-10 w-full cursor-pointer appearance-none rounded-[10px] pl-3 pr-9 text-sm disabled:cursor-default', row.label ? 'text-foreground' : 'text-muted-foreground')}
              >
                <option value="">Choose document type</option>
                {DOC_LABELS[group].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
                <option value={OTHER}>Other (specify)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
          {row.busy ? (
            <>
              <span className="h-10 w-10 shrink-0 animate-pulse rounded-[10px] bg-muted motion-reduce:animate-none" aria-hidden="true" />
              <span className="flex flex-1 flex-col gap-1.5" aria-live="polite">
                <span className="h-2.5 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Uploading</span>
              </span>
            </>
          ) : row.file ? (
            <>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] font-mono text-[8.5px] font-semibold tracking-[.04em]', TONE_CHIP[fileKindTone(row.file)])} aria-hidden="true">
                {ext.slice(0, 6)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[13px] text-foreground">{row.file}</span>
                <span className="text-xs text-muted-foreground">{[sizeWords(row.size), typeOf(row)].filter(Boolean).join(' · ')}</span>
              </span>
            </>
          ) : (
            <span className="text-[13.5px] text-muted-foreground">{typeChosen ? 'No file yet' : 'Choose the type, then upload'}</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            disabled={locked || row.busy || !typeChosen}
            title={!typeChosen ? 'Choose the document type first.' : undefined}
            onClick={() => input.current?.click()}
          >
            {row.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {row.file ? 'Replace' : 'Upload'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={row.file ? `Remove ${row.file}` : 'Remove this row'}
            disabled={locked || row.busy}
            onClick={onRemove}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      {row.error && (
        <p className="m-0 flex items-start gap-2 rounded-[10px] bg-state-red px-3 py-2 text-[13px] text-state-red-foreground" role="alert">
          {row.error}
        </p>
      )}
    </div>
  );
}

const TONE = {
  idle: { head: 'bg-state-blue text-state-blue-foreground', dot: 'bg-state-blue-foreground', title: 'Ready to execute' },
  running: { head: 'bg-state-yellow text-state-yellow-foreground', dot: 'bg-state-yellow-foreground', title: 'Running' },
  done: { head: 'bg-state-green text-state-green-foreground', dot: 'bg-state-green-foreground', title: 'Done' },
  failed: { head: 'bg-state-red text-state-red-foreground', dot: 'bg-state-red-foreground', title: '' },
} as const;

function RunCard({
  pipeline,
  starting,
  locked,
  done,
  checks,
  footer,
  canExecute,
  executeLabel,
  onExecute,
  onOpen,
  runError,
}: {
  pipeline?: PipelineStatus;
  starting: boolean;
  locked: boolean;
  done: boolean;
  checks: { label: string; ok: boolean }[];
  footer: string;
  canExecute: boolean;
  executeLabel: string;
  onExecute: () => void;
  onOpen: () => void;
  runError: string;
}) {
  const s01 = pipeline?.stages.find((s) => s.stage === '01');
  const s02 = pipeline?.stages.find((s) => s.stage === '02');
  const failed = [s01, s02].find((s) => s?.status === 'failed');
  const state = failed ? 'failed' : locked ? 'running' : done ? 'done' : 'idle';
  const tone = TONE[state];
  const title = failed ? `Stopped while ${failed.stage === '01' ? 'reading documents' : 'building the item definition'}` : tone.title;
  const steps = [
    { n: '1', label: 'Reading documents', s: s01 },
    { n: '2', label: 'Building the item definition', s: s02 },
  ];
  const words = (status?: string) =>
    ({ complete: 'Done.', running: 'In progress. This usually takes a few minutes.', pending: 'Waiting to start.', failed: 'Stopped.', not_started: 'Not started.' })[status || 'not_started'];
  const showSteps = locked || failed || done;

  return (
    <section className="aegis-card" aria-live="polite">
      <div className={cn('flex items-center justify-between gap-3 border-b border-border px-6 py-3.5 transition-colors duration-500', tone.head)}>
        <span className="flex items-center gap-2.5">
          <span className={cn('h-2 w-2 rounded-full', tone.dot, state === 'running' && 'animate-pulse motion-reduce:animate-none')} aria-hidden="true" />
          <h2 id="run-h" className="m-0 text-base font-semibold">{title}</h2>
        </span>
        <span className="aegis-mono text-xs">
          {starting && !s01?.started_at ? 'starting' : s01?.started_at && state !== 'idle' ? `started ${new Date(s01.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '2 steps'}
        </span>
      </div>
      <div className="flex flex-col gap-[18px] px-6 pb-6 pt-1.5">
        {showSteps ? (
          <ol className="m-0 flex list-none flex-col p-0">
            {steps.map(({ n, label, s: st }) => {
              const status = st?.status || 'not_started';
              const tag = STEP_TAG[status] ?? STEP_TAG.not_started;
              return (
                <li key={n} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-3 border-b border-rule py-3.5">
                  <StepMarker n={n} status={status} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[14.5px] font-medium">{label}</span>
                    <span className="text-[13px] text-muted-foreground">{words(status)}</span>
                    {status === 'running' && (
                      <span className="mt-1.5 block h-1 overflow-hidden rounded bg-state-yellow" aria-hidden="true">
                        <span className="aegis-bar block h-full rounded bg-state-yellow-foreground" />
                      </span>
                    )}
                  </span>
                  <Badge variant={tag[1]}>{tag[0]}</Badge>
                </li>
              );
            })}
          </ol>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 border-b border-rule py-3 text-sm">
                <span
                  className={cn('mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md', c.ok ? 'bg-state-green text-state-green-foreground' : 'bg-state-red text-state-red-foreground')}
                  aria-label={c.ok ? 'Done' : 'Missing'}
                >
                  {c.ok ? <Check className="h-[11px] w-[11px]" strokeWidth={3} /> : <X className="h-[11px] w-[11px]" strokeWidth={3} />}
                </span>
                <span className={c.ok ? 'text-foreground' : 'text-state-red-foreground'}>{c.label}</span>
              </li>
            ))}
          </ul>
        )}
        {failed && (
          <div role="alert" className="flex flex-col gap-1 rounded-xl border border-state-red-border bg-state-red px-4 py-3.5 text-[13.5px] text-state-red-foreground">
            {failed.error && <span className="whitespace-pre-line font-semibold">{failed.error}</span>}
            <span>
              {failed.stage === '01' && /could not be read|Missing input/.test(failed.error || '')
                ? 'Fix or replace the documents named above, then execute again.'
                : 'Execute again. If it stops the same way, send the last lines of logs/aegis.log.'}{' '}
              Your documents and the text you wrote are kept.
            </span>
          </div>
        )}
        <p className="m-0 text-[13.5px] text-muted-foreground">{footer}</p>
        {done && !locked && (
          <Button type="button" onClick={onOpen} className="h-12 justify-between rounded-xl px-[18px] text-[15px]">
            Open the item definition
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
        <Button type="button" variant={done ? 'outline' : 'default'} onClick={onExecute} disabled={!canExecute} className={cn('rounded-xl text-[15px]', done ? 'h-11' : 'h-12 justify-between px-[18px]')}>
          {locked ? 'Running' : executeLabel}
          {!done && (locked ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />)}
        </Button>
        {runError && <p className="m-0 text-sm text-state-red-foreground" role="alert">{runError}</p>}
      </div>
      <div className="border-t border-rule bg-[hsl(var(--well))] px-6 py-3 text-[12.5px] leading-normal text-muted-foreground">
        Accepted: draw.io, Markdown, text, HTML, Word, Excel, PDF, PNG and JPEG.
      </div>
    </section>
  );
}

const STEP_TAG: Record<string, [string, 'green' | 'yellow' | 'grey' | 'red']> = {
  complete: ['Done', 'green'],
  running: ['Running', 'yellow'],
  pending: ['Waiting', 'grey'],
  failed: ['Stopped', 'red'],
  not_started: ['Not started', 'grey'],
};

function StepMarker({ n, status }: { n: string; status: string }) {
  const base = 'flex h-[30px] w-[30px] items-center justify-center rounded-[9px]';
  if (status === 'complete') return <span className={cn(base, 'bg-state-green text-state-green-foreground')} aria-hidden="true"><Check className="h-[13px] w-[13px]" strokeWidth={2.75} /></span>;
  if (status === 'running') return <span className={cn(base, 'bg-state-yellow text-state-yellow-foreground')} aria-hidden="true"><Loader2 className="h-[15px] w-[15px] animate-spin motion-reduce:animate-none" strokeWidth={2.25} /></span>;
  if (status === 'failed') return <span className={cn(base, 'bg-state-red text-state-red-foreground font-mono text-sm font-semibold')} aria-hidden="true">!</span>;
  return <span className={cn(base, 'bg-state-grey text-state-grey-foreground font-mono text-[11px]')} aria-hidden="true">{n}</span>;
}
