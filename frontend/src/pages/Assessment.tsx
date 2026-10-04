/**
 * Stage screens for stages 01 and 02 (D-46, spec 24): 01 Documents, 02 Item Definition, the
 * Assumptions panel from the top bar, and Settings with "What I read". Light only, 3a theme.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Settings } from 'lucide-react';
import { ApiError, stagesApi } from '@/lib/stagesApi';
import type { RationaleItem, ScopeStatus, StageKey } from '@/types/stages';
import { DocumentsStage } from '@/components/stages/DocumentsStage';
import { Diagram, Legend } from '@/components/stages/Diagram';
import { DetailsDrawer } from '@/components/stages/DetailsDrawer';
import { AssumptionsPanel } from '@/components/stages/AssumptionsPanel';
import { WhatIRead } from '@/components/stages/WhatIRead';
import { affectedIds, buildCards, type Card, needsYou } from '@/components/stages/assumptions';

const TABS: { key: StageKey | string; label: string; ready: boolean }[] = [
  { key: '01', label: 'Documents', ready: true },
  { key: '02', label: 'Item Definition', ready: true },
  { key: '03', label: 'Assets', ready: false },
  { key: '04', label: 'Damage', ready: false },
  { key: '05', label: 'Threats', ready: false },
  { key: '06', label: 'Risk', ready: false },
];

/** A stage that has not run yet answers 404; that is "nothing yet", not an error. */
const orNothing = <T,>(p: Promise<T>) => p.catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));

export default function Assessment() {
  const { assessmentId = '' } = useParams();
  const [tab, setTab] = useState<StageKey>('01');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<StageKey | 'all'>('all');
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

  const allCards = useMemo(() => buildCards(items01, items02, 'all'), [items01, items02]);
  const needCount = allCards.filter(needsYou).length;
  const viewCards = useMemo(() => {
    const cards = buildCards(items01, items02, view);
    if (!filterId) return cards;
    return cards.filter((c) => affectedIds(c, elements, links).has(filterId));
  }, [items01, items02, view, filterId, elements, links]);

  // The open card's targets are highlighted on the diagram and everything else dimmed.
  const highlight = useMemo(() => (panelOpen && openCard ? affectedIds(openCard, elements, links) : null), [panelOpen, openCard, elements, links]);
  const cardsAbout = (id: string) => allCards.filter((c) => affectedIds(c, elements, links).has(id));

  const openAssumptions = (about: string | null = null) => {
    setFilterId(about);
    setView(about ? 'all' : tab);
    setOpenCard(null);
    setPanelOpen(true);
  };
  const filterName = filterId ? elements.find((e) => e.element_id === filterId)?.name || 'this connection' : null;
  const stageName = TABS.find((t) => t.key === tab)?.label;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-bar px-6 py-3 text-bar-foreground">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1 text-bar-foreground/80 hover:text-bar-foreground" aria-label="Back to the dashboard">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="aegis-wordmark">TARA Aegis</span>
          <span className="opacity-60">/</span>
          <span>{assessment.data?.name ?? '...'}</span>
          <span className="opacity-60">/</span>
          <span className="font-semibold">{stageName}</span>
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={panelOpen}
            onClick={() => (panelOpen ? setPanelOpen(false) : openAssumptions())}
            className={`flex min-h-[44px] items-center gap-2.5 rounded-md border border-bar-foreground px-3.5 font-semibold ${panelOpen ? 'bg-bar-foreground text-bar' : ''}`}
          >
            Assumptions
            {needCount > 0 && <span className="aegis-signal-pill px-2 py-0.5 text-[13px]">{needCount} need you</span>}
          </button>
          <button type="button" aria-label="Settings: what I read" onClick={() => setSettingsOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-md border border-bar-foreground">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav aria-label="Stages" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={!t.ready}
            aria-current={tab === t.key ? 'page' : undefined}
            title={t.ready ? undefined : 'Comes later'}
            onClick={() => {
              setTab(t.key as StageKey);
              setSelectedId(null);
              setOpenCard(null);
              if (view !== 'all') setView(t.key as StageKey);
            }}
            className={`whitespace-nowrap px-3.5 py-3 ${tab === t.key ? 'aegis-tab-active' : t.ready ? 'text-muted-foreground hover:text-foreground' : 'cursor-not-allowed text-muted-foreground/60'}`}
          >
            <span className="aegis-mono mr-1.5">{t.key}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto">
          {tab === '01' ? (
            <DocumentsStage assessmentId={assessmentId} onOpenItemDefinition={() => setTab('02')} />
          ) : stage02.isLoading ? (
            <p className="p-10 text-muted-foreground">Loading the item definition...</p>
          ) : stage02.error ? (
            <p className="p-10 text-signal-ink">{(stage02.error as Error).message}</p>
          ) : !def ? (
            <div className="p-10">
              <p className="m-0">There is no item definition yet.</p>
              <button type="button" onClick={() => setTab('01')} className="mt-3 underline underline-offset-4">Add the documents and execute on 01 Documents</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-8 py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h1 className="text-[22px] font-semibold leading-[30px]">Item definition</h1>
                <span className="text-muted-foreground">
                  {elements.length} components, {links.length} connections. Run {stage02.data!.run_number}, built {new Date(stage02.data!.created_at).toLocaleString()}.
                </span>
              </div>
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

        {panelOpen ? (
          <AssumptionsPanel
            assessmentId={assessmentId}
            stage={tab}
            view={view}
            onView={(v) => {
              setView(v);
              setOpenCard(null);
            }}
            cards={viewCards}
            questions={questions}
            docs={docs}
            openId={openCard?.id ?? null}
            onOpen={setOpenCard}
            filterName={filterName}
            onClearFilter={() => setFilterId(null)}
            onClose={() => {
              setPanelOpen(false);
              setOpenCard(null);
            }}
          />
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

      <WhatIRead open={settingsOpen} onOpenChange={setSettingsOpen} stage01={stage01.data ?? undefined} boundary={boundary.data?.text} />
    </div>
  );
}
