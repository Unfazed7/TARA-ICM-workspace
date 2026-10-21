/**
 * Details of the selected element or connection, with the quotes it rests on (spec 24, D-51).
 * Content of the Details tab in the Stage 02 side panel.
 */

import { Badge } from '@/components/ui/badge';
import type { Element, Fact, Link, RegisterEntry, ScopeDecision, Stage02Output } from '@/types/stages';
import { assetWords, SCOPE_WORDS } from './words';

type Tone = 'red' | 'yellow' | 'green' | 'blue' | 'grey';

interface Props {
  def: Stage02Output['item_definition'];
  selectedId: string;
  decisions: Map<string, ScopeDecision>;
  facts: Map<string, Fact>;
  docs: Map<string, RegisterEntry>;
  assumptionCount: number;
  exposureAssumed: boolean;
  onShowAssumptions: () => void;
  onSelect: (id: string) => void;
}

export function DetailsDrawer(props: Props) {
  const { def, selectedId } = props;
  const element = def.elements.find((e) => e.element_id === selectedId);
  const link = def.links.find((l) => l.link_id === selectedId);
  if (!element && !link) return null;
  const name = (id: string) => def.elements.find((e) => e.element_id === id)?.name || id;

  return (
    <div aria-label="Details">
      <div className="aegis-card-head px-[22px]">
        <span className="flex min-w-0 flex-col gap-1.5">
          <Badge variant={element ? 'grey' : 'blue'} className="self-start">
            {element ? 'Component' : `Connection ${link!.link_id}`}
          </Badge>
          <h2 className="m-0 text-lg font-semibold leading-tight tracking-[-0.02em]">{element ? element.name : `${name(link!.source_id)} to ${name(link!.destination_id)}`}</h2>
        </span>
      </div>
      {element ? <ElementDetails {...props} element={element} name={name} /> : <LinkDetails {...props} link={link!} />}
    </div>
  );
}

/** Shown in the Details tab while nothing is selected. */
export function DetailsEmpty() {
  return (
    <div>
      <div className="aegis-card-head px-[22px]">
        <span className="text-[15px] font-semibold">Details</span>
        <Badge variant="grey">Nothing selected</Badge>
      </div>
      <p className="m-0 px-[22px] py-6 text-sm text-[#5F5E5B]">Click a component or a connection to see where it sits, why it is in scope and what the documents say about it.</p>
    </div>
  );
}

/** One fact row: term, value (as a coloured tag when it marks a state) and an Assumed tag. */
function Row({ term, value, tone, assumed }: { term: string; value: string; tone?: Tone; assumed?: boolean }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 border-b border-rule py-2.5 text-sm">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-1.5">
        {tone ? <Badge variant={tone}>{value}</Badge> : <span>{value}</span>}
        {assumed && <Badge variant="yellow">Assumed</Badge>}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="aegis-label">{title}</span>
      {children}
    </div>
  );
}

function AssumptionsButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center gap-2 self-start rounded-[10px] border border-state-yellow-border bg-state-yellow px-3.5 text-sm font-medium text-[#6E4A00] transition-transform active:scale-[0.98]">
      <span className="h-2 w-2 rounded-full bg-state-yellow-foreground" aria-hidden="true" />
      See the {count} assumption{count > 1 ? 's' : ''} about this
    </button>
  );
}

function ElementDetails({
  def, element, decisions, facts, docs, assumptionCount, exposureAssumed, onShowAssumptions, onSelect, name,
}: Props & { element: Element; name: (id: string) => string }) {
  const decision = decisions.get(element.element_id);
  const where = placeOf(def, element);
  const exposure = element.internet_exposed;
  const links = def.links.filter((l) => l.source_id === element.element_id || l.destination_id === element.element_id);
  const exposureTone: Tone | undefined = exposure ? (exposure.value === 'yes' ? 'red' : exposure.value === 'no' ? 'grey' : 'yellow') : undefined;
  const scopeTone: Tone | undefined = decision ? ({ in_scope: 'green', interface: 'blue', out_of_scope: 'grey', ambiguous: 'yellow' } as const)[decision.status] : undefined;
  return (
    <>
      <dl className="m-0 px-[22px]">
        <Row term="Asset type" value={assetWords(element.asset_type, element.asset_type_label)} />
        <Row term="Where" value={where} />
        {exposure && (
          <Row
            term="Exposure"
            value={exposure.value === 'yes' ? 'Reachable from the internet' : exposure.value === 'no' ? 'Not reachable' : 'Not known'}
            tone={exposureTone}
            assumed={exposureAssumed || exposure.assumed}
          />
        )}
        {element.owner_operator && <Row term="Run by" value={element.owner_operator} />}
        {decision && <Row term="Scope" value={SCOPE_WORDS[decision.status]} tone={scopeTone} assumed={decision.assumed} />}
      </dl>
      <div className="flex flex-col gap-[18px] px-[22px] pb-[22px] pt-[18px]">
        {decision && (
          <Section title={`Why ${SCOPE_WORDS[decision.status].toLowerCase()}`}>
            <p className="m-0 text-sm text-[#2F2E2B]">{decision.reason}</p>
          </Section>
        )}
        {links.length > 0 && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-border">
            <span className="aegis-label border-b border-rule bg-[hsl(var(--well))] px-3 py-2">Connections · {links.length}</span>
            <ul className="m-0 flex list-none flex-col p-0">
              {links.map((l) => {
                const out = l.source_id === element.element_id;
                return (
                  <li key={l.link_id} className="border-b border-rule last:border-b-0">
                    <button type="button" onClick={() => onSelect(l.link_id)} className="flex min-h-10 w-full items-center gap-2 bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent">
                      <span className="aegis-mono text-[11.5px] text-muted-foreground">{l.link_id}</span>
                      <span className="min-w-0 flex-1">
                        {out ? 'To' : 'From'} {name(out ? l.destination_id : l.source_id)}
                      </span>
                      {l.protocol && l.protocol !== 'unknown' && <span className="text-xs text-muted-foreground">{protocolWords(l.protocol)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Quotes factIds={element.fact_ids} facts={facts} docs={docs} />
        <AssumptionsButton count={assumptionCount} onClick={onShowAssumptions} />
      </div>
    </>
  );
}

function LinkDetails({ link, facts, docs, assumptionCount, onShowAssumptions }: Props & { link: Link }) {
  const signIn = link.authentication === 'unknown' ? 'Not stated' : link.authentication;
  return (
    <>
      <dl className="m-0 px-[22px]">
        <Row term="Used for" value={link.usage_at_destination || 'Not stated'} tone={link.usage_at_destination ? undefined : 'yellow'} />
        <Row term="Protocol" value={protocolWords(link.protocol)} tone={link.protocol === 'unknown' ? 'yellow' : undefined} />
        <Row term="Sign-in" value={signIn} tone={signIn === 'Not stated' ? 'yellow' : undefined} />
        <Row term="Encryption" value={link.encryption === 'unknown' ? 'Not stated' : link.encryption} tone={link.encryption === 'unknown' ? 'yellow' : undefined} />
        <Row term="Direction" value={link.direction === 'bidirectional' ? 'Both ways' : 'One way'} />
        <Row term="Trust boundary" value={link.crosses_trust_boundary ? 'Crosses one' : 'Stays inside one area'} tone={link.crosses_trust_boundary ? 'red' : 'grey'} />
      </dl>
      <div className="flex flex-col gap-[18px] px-[22px] pb-[22px] pt-[18px]">
        {link.data_carried && link.data_carried.length > 0 && (
          <Section title="Data carried">
            <ul className="m-0 pl-5 text-sm">{link.data_carried.map((d) => <li key={d.item}>{d.item}</li>)}</ul>
          </Section>
        )}
        {link.remark && <p className="m-0 text-sm text-muted-foreground">{link.remark}</p>}
        <Quotes factIds={link.fact_ids} facts={facts} docs={docs} />
        <AssumptionsButton count={assumptionCount} onClick={onShowAssumptions} />
      </div>
    </>
  );
}

/** Quotes from the stored facts only: the document, where in it, and the words. */
export function Quotes({ factIds, facts, docs, title = 'What the documents say' }: { factIds: string[]; facts: Map<string, Fact>; docs: Map<string, RegisterEntry>; title?: string }) {
  const refs = factIds.flatMap((id) => facts.get(id)?.source_refs || []);
  const seen = new Set<string>();
  const unique = refs.filter((r) => {
    const k = `${r.doc_id}|${r.location}|${r.quote}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!unique.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="aegis-label">{title} · {unique.length}</span>
      <div className="flex flex-col gap-2">
        {unique.map((r) => (
          <SourceQuote key={`${r.doc_id}|${r.location}|${r.quote}`} quote={r.quote} doc={docs.get(r.doc_id)?.client_doc_ref || r.doc_id} location={r.location} />
        ))}
      </div>
    </div>
  );
}

export function SourceQuote({ quote, doc, location }: { quote: string; doc: string; location: string }) {
  return (
    <blockquote className="m-0 rounded-xl border border-rule bg-[hsl(var(--well))] px-3.5 py-3">
      <p className="m-0 text-sm">"{quote}"</p>
      <footer className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">{doc}, {location}</footer>
    </blockquote>
  );
}

function placeOf(def: Props['def'], element: Element): string {
  const chain: string[] = [];
  let id = element.parent_container_id;
  while (id) {
    const c = def.containers.find((x) => x.container_id === id);
    if (!c) break;
    chain.push(c.name);
    id = c.parent_id;
  }
  if (chain.length) return chain.slice(0, 2).join(', inside the ');
  return def.zones.find((z) => z.zone_id === element.zone_id)?.name || 'Not placed';
}

function protocolWords(p: string): string {
  return (
    { https_rest: 'HTTPS', sql_wire: 'Database connection', s3_api: 'Storage API', sigv4_service_api: 'Cloud service API', other: 'Other', unknown: 'Not stated' } as Record<string, string>
  )[p] || p.replace(/_/g, ' ');
}
