/**
 * Stage screens for stages 01 and 02 (D-46, D-51, spec 24): 01 Documents, 02 Item Definition,
 * the Assumptions of the current stage from the top bar, and Settings with "What I read".
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { ApiError, stagesApi } from '@/lib/stagesApi';
import type { RationaleItem, ScopeStatus, StageKey } from '@/types/stages';
import { DocumentsStage } from '@/components/stages/DocumentsStage';
import { Diagram, Legend } from '@/components/stages/Diagram';
import { DetailsDrawer } from '@/components/stages/DetailsDrawer';
import { AssumptionsList } from '@/components/stages/AssumptionsPanel';
import { PageHeader, StageTopBar, StatusDot } from '@/components/layout/StageShell';
import { SideSheet } from '@/components/layout/SideSheet';
import { WhatIRead } from '@/components/stages/WhatIRead';
import { affectedIds, buildCards, type Card, needsYou } from '@/components/stages/assumptions';

const TABS: { key: StageKey | string; label: string; ready: boolean; note?: string }[] = [
  { key: '01', label: 'Documents', ready: true },
  { key: '02', label: 'Item Definition', ready: true },
  { key: '03', label: 'Assets', ready: false, note: 'Comes later' },
  { key: '04', label: 'Damage', ready: false, note: 'Comes later' },
  { key: '05', label: 'Threats', ready: false, note: 'Comes later' },
  { key: '06', label: 'Risk', ready: false, note: 'Comes later' },
];

/** A stage that has not run yet answers 404; that is "nothing yet", not an error. */
const orNothing = <T,>(p: Promise<T>) => p.catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));

export default function Assessment() {
  const { assessmentId = '' } = useParams();
  const [tab, setTab] = useState<StageKey>('01');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const assessment = useQuery({ queryKey: ['assessment', assessmentId], queryFn: () => stagesApi.assessment(assessmentId) });
  const stage01 = useQuery({ queryKey: ['stage01', assessmentId], queryFn: () => orNothing(stagesApi.stage01(assessmentId)) });
  const stage02 = useQuery({ queryKey: ['stage02', assessmentId], queryFn: () => orNothing(stagesApi.stage02(assessmentId)) });
  const rat01 = useQuery({ queryKey: ['rationale', assessmentId, '01'], queryFn: () => orNothing(stagesApi.rationale(assessmentId, '01')) });
  const rat02 = useQuery({ queryKey: ['rationale', assessmentId, '02'], queryFn: () => orNothing(stagesApi.rationale(assessmentId, '02')) });
  const boundary = useQuery({ queryKey: ['boundary', assessmentId], queryFn: () => stagesApi.boundary(assessmentId) });

  const items01: RationaleItem[] = rat01.data?.items ?? [];
  const items02: RationaleItem[] = rat02.data?.items ?? [];
  const def = stage02.data?.item_definition;
  const elements = def?.elements ?? [];
  const links = def?.links ?? [];

  const facts = useMemo(() => new Map((stage01.data?.facts ?? []).map((f) => [f.fact_id, f])), [stage01.data]);
  const docs = useMemo(() => new Map((stage01.data?.document_register ?? []).map((d) => [d.doc_id, d])), [stage01.data]);
  const questions = useMemo(() => new Map((stage02.data?.questions ?? []).map((q) => [q.question_id, q])), [stage02.data]);
  const decisions = useMemo(() => new Map((def?.scope_decisions ?? []).map((d) => [d.element_id, d])), [def]);
  const scope = useMemo(() => new Map<string, ScopeStatus>([...decisions].map(([k, d]) => [k, d.status])), [decisions]);

  // Each stage shows only its own Assumptions (D-51).
  const stageCards = useMemo(() => buildCards(items01, items02, tab), [items01, items02, tab]);
  const cards02 = useMemo(() => buildCards(items01, items02, '02'), [items01, items02]);
  const needCount = stageCards.filter(needsYou).length;
  const viewCards = useMemo(
    () => (filterId ? stageCards.filter((c) => affectedIds(c, elements, links).has(filterId)) : stageCards),
    [stageCards, filterId, elements, links],
  );

  // The open card's targets are highlighted on the diagram and everything else dimmed.
  const highlight = useMemo(() => (panelOpen && openCard ? affectedIds(openCard, elements, links) : null), [panelOpen, openCard, elements, links]);
  const cardsAbout = (id: string) => cards02.filter((c) => affectedIds(c, elements, links).has(id));

  const openAssumptions = (about: string | null = null) => {
    setFilterId(about);
    setOpenCard(null);
    setPanelOpen(true);
  };
  const filterName = filterId ? elements.find((e) => e.element_id === filterId)?.name || 'this connection' : null;
  const project = assessment.data?.name ?? '...';
  const goTo = (key: string) => {
    setTab(key as StageKey);
    setSelectedId(null);
    setOpenCard(null);
    setFilterId(null);
  };

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <div className="aegis-canvas-grid pointer-events-none fixed inset-0" aria-hidden="true" />
      <StageTopBar
        stages={TABS}
        current={tab}
        onStage={goTo}
        needCount={needCount}
        assumptionsOpen={panelOpen}
        onAssumptions={() => (panelOpen ? setPanelOpen(false) : openAssumptions())}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="relative flex min-h-0">
        <main className="min-w-0 flex-1">
          {tab === '01' ? (
            <DocumentsStage assessmentId={assessmentId} project={project} onOpenItemDefinition={() => goTo('02')} />
          ) : stage02.isLoading ? (
            <p className="p-10 text-muted-foreground">Loading the item definition...</p>
          ) : stage02.error ? (
            <p className="p-10 text-state-red-foreground">{(stage02.error as Error).message}</p>
          ) : !def ? (
            <div className="mx-auto max-w-[1600px] px-[clamp(16px,2.5vw,32px)] pt-7">
              <PageHeader project={project} title="Item definition" />
              <div className="aegis-card px-6 py-5">
                <p className="m-0">There is no item definition yet.</p>
                <button type="button" onClick={() => goTo('01')} className="mt-3 font-medium underline underline-offset-4">Add the documents and execute on 01 Documents</button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-[clamp(16px,2.5vw,32px)] pb-12 pt-7">
              <PageHeader
                project={project}
                title="Item definition"
                right={
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot tone="green" />
                    Built {new Date(stage02.data!.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{' '}
                    <span className="aegis-mono text-[11.5px]">run {stage02.data!.run_number}</span>
                  </span>
                }
              />
              <p className="m-0 max-w-[900px] text-muted-foreground">
                {def.boundary_statement.text}
                {def.boundary_statement.proposed ? ' (proposed)' : ''}
              </p>
              <Legend />
              {highlight && (
                <p className="m-0 text-[14px]">
                  Showing what <b>{openCard?.item.title}</b> affects.{' '}
                  <button type="button" onClick={() => setOpenCard(null)} className="underline underline-offset-4">Show everything</button>
                </p>
              )}
              <Diagram def={def} scope={scope} selectedId={selectedId} highlight={highlight} onSelect={(id) => setSelectedId(id)} />
            </div>
          )}
        </main>

        {tab === '02' && panelOpen ? (
          <aside aria-label="Assumptions" className="aegis-card sticky top-24 m-4 ml-0 max-h-[calc(100dvh-112px)] w-[420px] shrink-0 overflow-y-auto">
            <div className="aegis-card-head">
              <span className="text-base font-semibold">Assumptions</span>
              <button type="button" aria-label="Close assumptions" onClick={() => { setPanelOpen(false); setOpenCard(null); }} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card hover:bg-accent">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <AssumptionsList
              assessmentId={assessmentId}
              cards={viewCards}
              questions={questions}
              docs={docs}
              openId={openCard?.id ?? null}
              onOpen={setOpenCard}
              filterName={filterName}
              onClearFilter={() => setFilterId(null)}
            />
          </aside>
        ) : (
          tab === '02' &&
          def &&
          selectedId && (
            <DetailsDrawer
              def={def}
              selectedId={selectedId}
              decisions={decisions}
              facts={facts}
              docs={docs}
              assumptionCount={cardsAbout(selectedId).length}
              exposureAssumed={cardsAbout(selectedId).some((c) => c.item.topic === 'exposure')}
              onShowAssumptions={() => openAssumptions(selectedId)}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          )
        )}
      </div>

      <SideSheet
        open={tab === '01' && panelOpen}
        onOpenChange={(o) => { setPanelOpen(o); if (!o) setOpenCard(null); }}
        eyebrow={`Stage 01 · ${stageCards.length} items`}
        title="Assumptions"
        description="What Stage 01 assumed while reading the documents."
        width={520}
        badge={needCount > 0 ? <span className="aegis-signal-pill px-2.5 py-0.5 text-xs">{needCount} need you</span> : undefined}
      >
        <AssumptionsList assessmentId={assessmentId} cards={stageCards} questions={questions} docs={docs} openId={openCard?.id ?? null} onOpen={setOpenCard} />
      </SideSheet>

      <WhatIRead open={settingsOpen} onOpenChange={setSettingsOpen} stage01={stage01.data ?? undefined} boundary={boundary.data?.text} />
    </div>
  );
}
