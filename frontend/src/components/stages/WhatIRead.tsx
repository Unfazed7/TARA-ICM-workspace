/** Settings: "What I read", the Stage 01 document register and summary (D-46, DR-4). */

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Stage01Output } from '@/types/stages';
import { typeWords } from './words';

const READ_WORDS = { parsed: 'Read', partial: 'Partly read', failed: 'Could not be read' } as const;

export function WhatIRead({ open, onOpenChange, stage01, boundary }: { open: boolean; onOpenChange: (open: boolean) => void; stage01?: Stage01Output; boundary?: string | null }) {
  const facts = stage01?.facts.filter((f) => f.status !== 'rejected') ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[760px]">
        <SheetHeader>
          <SheetTitle>What I read</SheetTitle>
          <SheetDescription>The documents Stage 01 read, what each was used for, and what was left out.</SheetDescription>
        </SheetHeader>
        {!stage01 ? (
          <p className="mt-6 text-muted-foreground">Nothing has been read yet. Add the documents and execute on 01 Documents.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <section>
              <h3 className="aegis-label mb-1.5">Summary</h3>
              <p className="m-0">
                {stage01.document_register.length} documents, {facts.length} facts kept. Read on {new Date(stage01.created_at).toLocaleString()} (run {stage01.run_number}).
              </p>
              {boundary && <p className="m-0 mt-2 text-muted-foreground">Assessed: {boundary}</p>}
            </section>
            <section className="overflow-x-auto">
              <h3 className="aegis-label mb-1.5">Documents</h3>
              <table className="w-full border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-foreground">
                    <th className="py-2 pr-3 font-semibold">Document</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Received</th>
                    <th className="py-2 pr-3 font-semibold">Read</th>
                    <th className="py-2 font-semibold">Used for / left out</th>
                  </tr>
                </thead>
                <tbody>
                  {stage01.document_register.map((d) => (
                    <tr key={d.doc_id} className="border-b border-border align-top">
                      <td className="py-2 pr-3">
                        <div>{d.title}</div>
                        <div className="aegis-id">{d.client_doc_ref}</div>
                      </td>
                      <td className="py-2 pr-3">{typeWords(d.doc_type, d.doc_type_label)}</td>
                      <td className="py-2 pr-3 aegis-mono">{d.date_received}</td>
                      <td className={`py-2 pr-3 ${d.read_status === 'failed' ? 'text-signal-ink' : ''}`}>{READ_WORDS[d.read_status]}</td>
                      <td className="py-2">
                        <div>{d.used_for}</div>
                        {d.ignored_and_why && <div className="mt-1 text-muted-foreground">Left out: {d.ignored_and_why}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
