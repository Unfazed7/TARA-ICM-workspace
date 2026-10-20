/**
 * Settings: "What I read", the Stage 01 document register and summary (D-46, D-51, DR-4).
 * Settings shows only what was read; the Stage 01 Assumptions have their own panel.
 */

import { SideSheet } from '@/components/layout/SideSheet';
import type { Stage01Output } from '@/types/stages';
import { typeWords } from './words';

const READ_WORDS = { parsed: 'Read', partial: 'Partly read', failed: 'Could not be read' } as const;
const READ_CLS = { parsed: 'bg-state-green text-state-green-foreground', partial: 'bg-state-yellow text-state-yellow-foreground', failed: 'bg-state-red text-state-red-foreground' } as const;

export function WhatIRead({ open, onOpenChange, stage01, boundary }: { open: boolean; onOpenChange: (open: boolean) => void; stage01?: Stage01Output; boundary?: string | null }) {
  const facts = stage01?.facts.filter((f) => f.status !== 'rejected') ?? [];
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
        <div className="flex flex-col gap-5 px-6 py-5">
          {boundary && <p className="m-0 text-[15px] leading-relaxed text-foreground/85">{boundary}</p>}
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
            <Stat label="Documents" value={stage01.document_register.length} />
            <Stat label="Facts kept" value={facts.length} />
            <Stat label="Run" value={stage01.run_number} />
          </dl>
          <p className="m-0 text-[13px] text-muted-foreground">Read on {new Date(stage01.created_at).toLocaleString()}.</p>
          <section className="overflow-hidden rounded-[14px] border border-border">
            <div className="aegis-card-head px-4 py-2.5">
              <span className="text-sm font-semibold">Document register</span>
              <span className="rounded-full bg-state-grey px-2.5 py-0.5 text-xs font-medium text-state-grey-foreground">{stage01.document_register.length} documents</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[14px]">
                <thead>
                  <tr className="aegis-label bg-[hsl(var(--well))]">
                    <th className="px-4 py-2 font-medium">Document</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Received</th>
                    <th className="px-3 py-2 font-medium">Read</th>
                    <th className="px-4 py-2 font-medium">Used for / left out</th>
                  </tr>
                </thead>
                <tbody>
                  {stage01.document_register.map((d) => (
                    <tr key={d.doc_id} className="border-t border-rule align-top">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{d.title}</div>
                        <div className="aegis-id">{d.client_doc_ref}</div>
                      </td>
                      <td className="px-3 py-2.5">{typeWords(d.doc_type, d.doc_type_label)}</td>
                      <td className="aegis-mono px-3 py-2.5">{d.date_received}</td>
                      <td className="px-3 py-2.5">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${READ_CLS[d.read_status]}`}>{READ_WORDS[d.read_status]}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div>{d.used_for}</div>
                        {d.ignored_and_why && <div className="mt-1 text-muted-foreground">Left out: {d.ignored_and_why}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </SideSheet>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-3">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="m-0 mt-1 font-mono text-2xl font-medium tabular-nums">{value}</dd>
    </div>
  );
}
