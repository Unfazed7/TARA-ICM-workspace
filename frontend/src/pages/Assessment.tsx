/**
 * Stage screens for stages 01 and 02 (D-46, D-51, spec 24): 01 Documents, 02 Item Definition,
 * the Assumptions of the current stage from the top bar, and Settings with "What I read".
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Info, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMotionPreset } from '@/lib/motion';
import { ApiError, stagesApi } from '@/lib/stagesApi';
import type { RationaleItem, ScopeStatus, StageKey } from '@/types/stages';
import { DocumentsStage } from '@/components/stages/DocumentsStage';
import { Diagram, Legend } from '@/components/stages/Diagram';
import { DetailsDrawer, DetailsEmpty } from '@/components/stages/DetailsDrawer';
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

/** The kinds of area the diagram shows, as coloured tags for the workspace header. */
function zoneTags(def: { zones: { kind: string }[]; containers: { kind: string; zone_id?: string }[] }) {
  const zoneKind = new Map(def.zones.map((z) => [(z as { zone_id?: string }).zone_id, z.kind]));
  const kinds = new Set([...def.zones.map((z) => z.kind), ...def.containers.map((c) => (c.zone_id ? zoneKind.get(c.zone_id) ?? c.kind : c.kind))]);
  const has = (test: (k: string) => boolean) => [...kinds].some(test);
  const tags: { label: string; tone: 'red' | 'yellow' | 'green' | 'blue' | 'grey' }[] = [];
  if (has((k) => k === 'internet_external')) tags.push({ label: 'Internet', tone: 'red' });
  if (has((k) => k.includes('public'))) tags.push({ label: 'Public', tone: 'yellow' });
  if (has((k) => k.includes('private'))) tags.push({ label: 'Private', tone: 'green' });
  if (has((k) => k.includes('managed'))) tags.push({ label: 'Managed', tone: 'blue' });
  if (has((k) => ['corporate_it', 'third_party_saas', 'vehicle_field_device'].includes(k))) tags.push({ label: 'Outside', tone: 'grey' });
  return tags;
}

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
  const [sideOpen, setSideOpen] = useState(true);
  const [boundaryOpen, setBoundaryOpen] = useState(false);
  const { easeOut } = useMotionPreset();

  const assessment = useQuery({ queryKey: ['assessment', assessmentId], queryFn: () => stagesApi.assessment(assessmentId) });
  const stage01 = useQuery({ queryKey: ['stage01', assessmentId], queryFn: () => orNothing(stagesApi.stage01(assessmentId)) });
  const stage02 = useQuery({ queryKey: ['stage02', assessmentId], queryFn: () => orNothing(stagesApi.stage02(assessmentId)) });
  const rat01 = useQuery({ queryKey: ['rationale', assessmentId, '01'], queryFn: () => orNothing(stagesApi.rationale(assessmentId, '01')) });
  const rat02 = useQuery({ queryKey: ['rationale', assessmentId, '02'], queryFn: () => orNothing(stagesApi.rationale(assessmentId, '02')) });
  const boundary = useQuery({ queryKey: ['boundary', assessmentId], queryFn: () => stagesApi.boundary(assessmentId) });

  const items01 = useMemo<RationaleItem[]>(() => rat01.data?.items ?? [], [rat01.data]);
  const items02 = useMemo<RationaleItem[]>(() => rat02.data?.items ?? [], [rat02.data]);
  const def = stage02.data?.item_definition;
  const elements = useMemo(() => def?.elements ?? [], [def]);
  const links = useMemo(() => def?.links ?? [], [def]);

  const facts = useMemo(() => new Map((stage01.data?.facts ?? []).map((f) => [f.fact_id, f])), [stage01.data]);
  const docs = useMemo(() => new Map((stage01.data?.document_register ?? []).map((d) => [d.doc_id, d])), [stage01.data]);
  const questions = useMemo(() => new Map((stage02.data?.questions ?? []).map((q) => [q.question_id, q])), [stage02.data]);
  const decisions = useMemo(() => new Map((def?.scope_decisions ?? []).map((d) => [d.element_id, d])), [def]);
  const scope = useMemo(() => new Map<string, ScopeStatus>([...decisions].map(([k, d]) => [k, d.status])), [decisions]);

  // Each stage shows only its own Assumptions (D-51).
  const stageCards = useMemo(() => buildCards(items01, items02, tab), [items01, items02, tab]);
  const cards02 = useMemo(() => buildCards(items01, items02, '02'), [items01, items02]);
  const needCount = stageCards.filter(needsYou).length;
  const needs01 = useMemo(() => buildCards(items01, items02, '01').filter(needsYou).length, [items01, items02]);
  const needs02 = useMemo(() => cards02.filter(needsYou).length, [cards02]);
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
    setSideOpen(true);
  };
  const selectOnDiagram = (id: string) => {
    setSelectedId(id);
    setPanelOpen(false);
    setSideOpen(true);
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
        stages={TABS.map((t) => {
          const open = t.key === '01' ? needs01 : t.key === '02' ? needs02 : 0;
          if (t.key === tab) return { ...t, note: 'You are here', tone: 'blue' as const };
          if (t.ready && open) return { ...t, note: `${open} need you`, tone: 'yellow' as const };
          return { ...t, tone: 'grey' as const };
        })}
        description={boundary.data?.text ?? undefined}
        current={tab}
        onStage={goTo}
        needCount={needCount}
        assumptionsOpen={panelOpen}
        onAssumptions={() => (panelOpen && (tab === '01' || sideOpen) ? setPanelOpen(false) : openAssumptions())}
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
            <div className="mx-auto flex max-w-[1600px] flex-col px-[clamp(16px,2.5vw,32px)] pb-12 pt-7">
              <PageHeader
                project={project}
                title="Item definition"
                right={
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot tone="green" />
                      Built {new Date(stage02.data!.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{' '}
                      <span className="aegis-mono text-[11.5px]">run {stage02.data!.run_number}</span>
                    </span>
                    <button
                      type="button"
                      aria-expanded={boundaryOpen}
                      aria-controls="boundary-text"
                      onClick={() => setBoundaryOpen((v) => !v)}
                      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-accent active:scale-[0.98]"
                    >
                      Boundary
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', boundaryOpen && 'rotate-180')} aria-hidden="true" />
                    </button>
                  </>
                }
                below={
                  <AnimatePresence initial={false}>
                    {boundaryOpen && (
                      <motion.p
                        id="boundary-text"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={easeOut}
                        className="m-0 mt-3 max-w-[90ch] overflow-hidden rounded-xl border border-rule bg-card px-4 py-3 text-sm leading-relaxed text-foreground/85"
                      >
                        {def.boundary_statement.text}
                        {def.boundary_statement.proposed ? ' (proposed)' : ''}
                      </motion.p>
                    )}
                  </AnimatePresence>
                }
              />
              {highlight && (
                <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-state-yellow-border bg-state-yellow py-2 pl-4 pr-2 text-sm text-[hsl(var(--aegis-decide-text))]">
                  <span>Showing what <b className="font-semibold">{openCard?.item.title}</b> affects.</span>
                  <button type="button" onClick={() => setOpenCard(null)} className="min-h-[34px] rounded-[10px] border border-border bg-card px-3 font-medium text-foreground hover:bg-accent">Show everything</button>
                </div>
              )}

              <section className="aegis-card" aria-label="Item definition workspace">
                <div className="aegis-card-head">
                  <span className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      aria-controls="side-panel"
                      aria-expanded={sideOpen}
                      aria-label={sideOpen ? 'Collapse the side panel' : 'Expand the side panel'}
                      title={sideOpen ? 'Collapse the side panel' : 'Expand the side panel'}
                      onClick={() => setSideOpen((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card hover:bg-accent active:scale-[0.98]"
                    >
                      <PanelLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <span className="text-[15px] font-semibold">Diagram</span>
                    <span className="aegis-mono hidden text-xs text-muted-foreground sm:inline">{elements.length} components · {links.length} connections</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {zoneTags(def).map((z) => (
                      <Badge key={z.label} variant={z.tone}>{z.label}</Badge>
                    ))}
                  </span>
                </div>
                <div className="border-b border-rule px-[22px] py-2.5">
                  <Legend />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[var(--side)_minmax(0,1fr)]" style={{ ['--side' as string]: sideOpen ? '380px' : '60px' }}>
                  <aside id="side-panel" className={cn('min-w-0 border-b border-border md:border-b-0 md:border-r', sideOpen ? 'bg-[hsl(var(--well))]' : 'bg-muted')}>
                    {sideOpen ? (
                      <>
                        <div role="tablist" aria-label="Side panel" className="m-3 grid grid-cols-2 gap-1 rounded-xl bg-[hsl(var(--state-grey))] p-1">
                          {(['details', 'assumptions'] as const).map((t) => {
                            const on = t === 'assumptions' ? panelOpen : !panelOpen;
                            return (
                              <button
                                key={t}
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => (t === 'assumptions' ? openAssumptions(filterId) : setPanelOpen(false))}
                                className={cn('relative flex min-h-9 items-center justify-center gap-2 rounded-[9px] text-[13.5px] transition-colors', on ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
                              >
                                {on && <motion.span layoutId="side-tab" transition={easeOut} className="absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_2px_hsl(40_6%_10%/0.08)]" aria-hidden="true" />}
                                <span className="relative">{t === 'details' ? 'Details' : 'Assumptions'}</span>
                                {t === 'assumptions' && needCount > 0 && <span className="aegis-mono relative rounded-full bg-state-yellow px-1.5 text-[11px] text-state-yellow-foreground">{needCount}</span>}
                              </button>
                            );
                          })}
                        </div>
                        <div className="max-h-[860px] overflow-y-auto border-t border-border bg-card">
                          {panelOpen ? (
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
                          ) : selectedId ? (
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
                            />
                          ) : (
                            <DetailsEmpty />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-row gap-2 p-2.5 md:flex-col md:items-center">
                        <button type="button" aria-label="Show details" title="Details" onClick={() => { setSideOpen(true); setPanelOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-card hover:bg-accent">
                          <Info className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Show assumptions" title="Assumptions" onClick={() => openAssumptions()} className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-card text-xs font-semibold hover:bg-accent">
                          A
                          {needCount > 0 && <span className="aegis-mono absolute -right-1.5 -top-1.5 rounded-full bg-state-yellow px-1.5 text-[10px] text-state-yellow-foreground">{needCount}</span>}
                        </button>
                      </div>
                    )}
                  </aside>
                  <div className="min-w-0">
                    <Diagram def={def} scope={scope} selectedId={selectedId} highlight={highlight} onSelect={selectOnDiagram} fitKey={sideOpen ? 'open' : 'closed'} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
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
