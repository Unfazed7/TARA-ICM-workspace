/**
 * 01 Documents: what is being assessed, the two document groups, Execute and live status (spec 24).
 * Uploads go straight to the server (spec 23), so the screen always shows what Stage 01 will read.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Plus, Upload, X } from 'lucide-react';
import { stagesApi } from '@/lib/stagesApi';
import type { DocGroup, PipelineStatus, UploadedDocument } from '@/types/stages';
import { DOC_LABELS, GROUP_TITLE, groupOfType } from './words';

const ACCEPT = '.drawio,.md,.txt,.html,.htm,.docx,.xlsx,.pdf,.png,.jpg,.jpeg';
const OTHER = '__other__';

interface Row {
  key: string;
  label: string; // a dropdown label, or '' while not chosen
  other: boolean; // Other (specify): the analyst types the kind
  otherText: string;
  file?: string; // uploaded file name
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
    rows[group].push({ ...newRow(), label, other, otherText: other ? d.type_label || '' : '', file: d.file });
  }
  for (const g of ['components', 'behaviour'] as DocGroup[]) if (!rows[g].length) rows[g].push(newRow());
  return rows;
}

const typeOf = (r: Row) => (r.other ? r.otherText.trim() : r.label);
const isActive = (p?: PipelineStatus) => !!p?.stages.some((s) => s.status === 'pending' || s.status === 'running');

export function DocumentsStage({ assessmentId, onOpenItemDefinition }: { assessmentId: string; onOpenItemDefinition: () => void }) {
  const queryClient = useQueryClient();
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
      update(group, row.key, { busy: false, file: saved.file });
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
  if (docs.error) return <p className="p-10 text-signal-ink">{(docs.error as Error).message}</p>;

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 py-10 flex flex-col gap-9">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] leading-9 font-semibold">Start the assessment</h1>
        <p className="text-muted-foreground">Say what is being assessed, add the client's documents in the two groups below, then execute.</p>
      </div>

      {(locked || stage('01')?.status === 'complete' || failed) && (
        <RunStatus pipeline={pipeline.data} starting={starting} done={done} onOpen={onOpenItemDefinition} />
      )}

      <section className="flex flex-col gap-2.5">
        <label htmlFor="boundary" className="text-lg font-semibold">
          What is being assessed? <span className="text-signal-ink" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <textarea
          id="boundary"
          rows={3}
          value={text}
          disabled={locked}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveBoundary}
          placeholder="The system's name and one sentence on what it covers, for example: This is a key management system and we need to assess everything deployed in its cloud account."
          className="w-full min-h-[72px] rounded-md border border-input bg-card px-3.5 py-3 text-[15px] leading-[22px] focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
        {boundaryError && <p className="text-sm text-signal-ink">{boundaryError}</p>}
      </section>

      {(['components', 'behaviour'] as DocGroup[]).map((group) => (
        <section key={group} className="flex flex-col gap-3" aria-labelledby={`group-${group}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`group-${group}`} className="text-lg font-semibold">
              {GROUP_TITLE[group]} <span className="text-signal-ink" aria-hidden="true">*</span>
            </h2>
            <span className="aegis-label">{rows[group].filter((r) => r.file).length} added</span>
          </div>
          {rows[group].map((row) => (
            <DocumentRow
              key={row.key}
              group={group}
              row={row}
              locked={locked}
              onChange={(change) => update(group, row.key, change)}
              onFile={(file) => uploadFile(group, row, file)}
              onRemove={() => removeRow(group, row)}
            />
          ))}
          <button
            type="button"
            disabled={locked}
            onClick={() => setRows((prev) => prev && { ...prev, [group]: [...prev[group], newRow()] })}
            className="self-start inline-flex min-h-[44px] items-center gap-2 rounded-md border border-dashed border-foreground/60 bg-card px-3.5 text-[15px] hover:bg-accent disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another document
          </button>
        </section>
      ))}

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground pt-6">
        <p className="m-0 text-muted-foreground max-w-[640px]">
          {locked
            ? 'Documents are locked while the run is going.'
            : missing.length
              ? `Required: ${missing.map((m) => m.replace(/\.$/, '')).join('; ')}.`
              : unsavedBoundary
                ? 'Click outside the box to save what is being assessed.'
                : 'Ready. Both stages run one after the other; you can leave this page.'}
        </p>
        <button
          type="button"
          onClick={execute}
          disabled={!canExecute}
          className="min-h-[48px] rounded-md bg-primary px-7 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {locked ? 'Running' : failed ? 'Execute again' : done ? 'Execute again' : 'Execute'}
        </button>
      </section>
      {runError && <p className="text-signal-ink" role="alert">{runError}</p>}
    </div>
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

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-[1_1_260px]">
          {row.other ? (
            <div className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-foreground bg-card pl-3.5">
              <span className="aegis-label shrink-0">Other:</span>
              <input
                aria-label="Name the document type"
                placeholder="e.g. Security policy"
                value={row.otherText}
                maxLength={60}
                disabled={typeLocked}
                onChange={(e) => onChange({ otherText: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none disabled:text-muted-foreground"
              />
              <button
                type="button"
                aria-label="Choose a listed type instead"
                disabled={typeLocked}
                onClick={() => onChange({ other: false, otherText: '' })}
                className="flex h-[42px] w-11 items-center justify-center disabled:opacity-40"
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
                className="h-11 w-full appearance-none rounded-md border border-foreground bg-card px-3.5 pr-10 text-[15px] disabled:border-border disabled:text-foreground disabled:opacity-100"
              >
                <option value="">Choose document type</option>
                {DOC_LABELS[group].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
                <option value={OTHER}>Other (specify)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-[2_1_320px] items-center gap-3">
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
          <button
            type="button"
            disabled={locked || row.busy || !typeChosen}
            title={!typeChosen ? 'Choose the document type first.' : undefined}
            onClick={() => input.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-foreground bg-card px-4 text-[15px] hover:bg-accent disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
          >
            {row.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {row.file ? 'Replace' : 'Upload'}
          </button>
          {row.file ? (
            <span className="aegis-mono truncate text-foreground">{row.file}</span>
          ) : (
            <span className="text-muted-foreground">{typeChosen ? 'No file yet' : 'Choose the type, then upload'}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={row.file ? `Remove ${row.file}` : 'Remove this row'}
          disabled={locked || row.busy}
          onClick={onRemove}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {row.error && <p className="text-sm text-signal-ink" role="alert">{row.error}</p>}
    </div>
  );
}

function RunStatus({ pipeline, starting, done, onOpen }: { pipeline?: PipelineStatus; starting: boolean; done: boolean; onOpen: () => void }) {
  const s01 = pipeline?.stages.find((s) => s.stage === '01');
  const s02 = pipeline?.stages.find((s) => s.stage === '02');
  const failed = [s01, s02].find((s) => s?.status === 'failed');
  const steps = [
    { n: '1', label: 'Reading documents', s: s01 },
    { n: '2', label: 'Building the item definition', s: s02 },
  ];
  const words = (status?: string) =>
    ({ complete: 'Done.', running: 'In progress. This usually takes a few minutes.', pending: 'Waiting to start.', failed: 'Stopped.', not_started: 'Not started.' })[
      status || 'not_started'
    ];

  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-3.5 rounded-lg border-2 p-5 ${failed ? 'aegis-blocking' : 'border-foreground bg-card'}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {failed ? `Stopped while ${failed.stage === '01' ? 'reading documents' : 'building the item definition'}` : done ? 'Done' : 'Running'}
        </h2>
        {(starting || s01?.started_at) && <span className="aegis-label">{s01?.started_at ? `Started ${new Date(s01.started_at).toLocaleTimeString()}` : 'Starting'}</span>}
      </div>
      {failed?.error && <p className="m-0 whitespace-pre-line text-foreground">{failed.error}</p>}
      {failed && <p className="m-0 text-muted-foreground">Fix or replace the documents named above, then execute again. Your documents and the text above are kept.</p>}
      {steps.map(({ n, label, s }) => (
        <div key={n} className="flex items-start gap-3">
          <span
            className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
              s?.status === 'complete' ? 'border-primary bg-primary text-primary-foreground' : s?.status === 'running' ? 'border-dashed border-primary' : s?.status === 'failed' ? 'border-signal bg-signal text-signal-foreground' : 'border-border text-muted-foreground'
            }`}
            aria-hidden="true"
          >
            {s?.status === 'complete' ? <Check className="h-3 w-3" /> : n}
          </span>
          <div>
            <div className="font-semibold">{label}</div>
            <div className="text-muted-foreground">{words(s?.status)}</div>
          </div>
        </div>
      ))}
      {done && (
        <button type="button" onClick={onOpen} className="self-start rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
          Open the item definition
        </button>
      )}
    </section>
  );
}
