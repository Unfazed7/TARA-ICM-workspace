/**
 * Settings: "What I read", the Stage 01 document register and summary (D-46, D-51, DR-4).
 * Settings shows only what was read; the Stage 01 Assumptions have their own panel.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SideSheet } from '@/components/layout/SideSheet';
import { Badge } from '@/components/ui/badge';
import { useMotionPreset } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { RegisterEntry, Stage01Output } from '@/types/stages';
import { fileKindTone, TONE_CHIP, typeWords } from './words';

const ENVIRONMENT_WORDS: Record<string, string> = { prod: 'production', production: 'production', dev: 'dev', test: 'test', staging: 'staging', unknown: 'environment not stated' };

function readTag(d: RegisterEntry): { text: string; tone: 'green' | 'blue' | 'yellow' | 'red' } {
  if (d.read_status === 'failed') return { text: 'Could not be read', tone: 'red' };
  if (d.read_status === 'partial') return { text: 'Partly read', tone: 'yellow' };
  return !d.reading_method || d.reading_method === 'parsed' ? { text: 'Read by code', tone: 'green' } : { text: 'Read by the model', tone: 'blue' };
}

const dateWords = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export function WhatIRead({ open, onOpenChange, stage01, boundary }: { open: boolean; onOpenChange: (open: boolean) => void; stage01?: Stage01Output; boundary?: string | null }) {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const { easeOut } = useMotionPreset();
  const facts = stage01?.facts.filter((f) => f.status !== 'rejected') ?? [];
  // A fact is agreed when two or more documents say it; otherwise it rests on a single source.
  const agreed = facts.filter((f) => new Set(f.source_refs.map((r) => r.doc_id)).size > 1).length;
  const register = stage01?.document_register ?? [];
  const current = openDoc ?? register[0]?.doc_id ?? null;

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Settings · Stage 01 output"
      title="What I read"
      description="The documents Stage 01 read, what each was used for, and what was left out."
    >
      {!stage01 ? (
        <p className="m-0 px-6 py-6 text-muted-foreground">Nothing has been read yet. Add the documents and execute on 01 Documents.</p>
      ) : (
        <div className="flex flex-col gap-[22px] px-6 pb-8 pt-[22px]">
          {boundary && <p className="m-0 text-[15px] leading-[1.65] text-[#3A3936]">{boundary}</p>}
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2.5">
            <Stat label="Facts" value={facts.length} cls="bg-state-grey border-[#E6E5E0]" text="text-state-grey-foreground" />
            <Stat label="Agreed" value={agreed} cls="bg-state-green border-state-green-border" text="text-state-green-foreground" />
            <Stat label="Single source" value={facts.length - agreed} cls="bg-state-blue border-state-blue-border" text="text-state-blue-foreground" />
          </dl>
          <section className="overflow-hidden rounded-[14px] border border-border">
            <div className="aegis-card-head px-4 py-2.5">
              <span className="text-sm font-semibold">Document register</span>
              <Badge variant="grey">{register.length} documents</Badge>
            </div>
            {register.map((d) => {
              const isOpen = current === d.doc_id;
              const read = readTag(d);
              const ext = d.client_doc_ref.split('.').pop()?.toUpperCase() || '';
              const meta = [
                typeWords(d.doc_type, d.doc_type_label),
                d.precedence_rank ? `rank ${d.precedence_rank}` : '',
                ENVIRONMENT_WORDS[d.environment] ?? d.environment,
                d.date_received ? `received ${dateWords(d.date_received)}` : '',
              ].filter(Boolean);
              return (
                <article key={d.doc_id} className="border-b border-rule last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenDoc(isOpen ? '' : d.doc_id)}
                    className="grid w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-[10px] font-mono text-[8.5px] font-semibold tracking-[.04em]', TONE_CHIP[fileKindTone(d.client_doc_ref)])} aria-hidden="true">
                      {ext.slice(0, 6)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-[13px] font-medium">{d.client_doc_ref}</span>
                      <span className="text-[12.5px] text-muted-foreground">{meta.join(' · ')}</span>
                    </span>
                    <span className="aegis-mono text-center text-lg text-muted-foreground" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.dl
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={easeOut}
                        className="m-0 grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-1.5 overflow-hidden pb-4 pl-[70px] pr-4 text-[13.5px]"
                      >
                        <dt className="text-muted-foreground">Used for</dt>
                        <dd className="m-0">{d.used_for || 'Nothing.'}</dd>
                        <dt className="text-muted-foreground">Ignored</dt>
                        <dd className="m-0 text-[#4A4946]">{d.ignored_and_why || 'Nothing.'}</dd>
                        <dt className="text-muted-foreground">Read</dt>
                        <dd className="m-0">
                          <Badge variant={read.tone}>{read.text}</Badge>
                        </dd>
                      </motion.dl>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </section>
          <p className="m-0 text-[13px] text-muted-foreground">
            Run {stage01.run_number}, read on {new Date(stage01.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>
      )}
    </SideSheet>
  );
}

function Stat({ label, value, cls, text }: { label: string; value: number; cls: string; text: string }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3.5', cls)}>
      <dt className={cn('text-[12.5px]', text)}>{label}</dt>
      <dd className={cn('m-0 mt-1 font-mono text-2xl font-medium tabular-nums', text)}>{value}</dd>
    </div>
  );
}
