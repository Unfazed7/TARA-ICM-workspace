/** 07 Reports: the export center, on a page of its own beside the residual risk sheet. */

import type { ReactNode } from 'react';
import { DemoNote } from '@/components/layout/DemoNote';
import { PageHeader } from '@/components/layout/StageShell';
import { ReportExportCenter } from '@/components/workspace/ReportExportCenter';

export function ReportsPage({ project, headerExtra }: { project: string; headerExtra: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-[clamp(16px,2.5vw,32px)] pb-12 pt-7">
      <PageHeader project={project} title="Reports" right={headerExtra} />
      <section className="aegis-card overflow-hidden" aria-label="Reports">
        <ReportExportCenter scenarios={[]} />
      </section>
      <DemoNote floating />
    </div>
  );
}
