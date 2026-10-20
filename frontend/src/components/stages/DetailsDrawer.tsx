/**
 * Details of the selected element or connection, with the quotes it rests on (spec 24, D-51).
 * Content of the Details tab in the Stage 02 side panel.
 */

import type { Element, Fact, Link, RegisterEntry, ScopeDecision, Stage02Output } from '@/types/stages';
import { assetWords, SCOPE_WORDS } from './words';

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
    <div aria-label="Details" className="flex flex-col gap-5 px-5 py-5 text-sm">
      <div className="flex flex-col gap-1.5">
        <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[.05em] ${element ? 'bg-state-grey text-state-grey-foreground' : 'bg-state-blue text-state-blue-foreground'}`}>
          {element ? 'Component' : 'Connection'}
          {link ? ` ${link.link_id}` : ''}
        </span>
        <h2 className="m-0 text-lg font-semibold leading-snug tracking-tight">{element ? element.name : `${name(link!.source_id)} to ${name(link!.destination_id)}`}</h2>
      </div>
      {element ? <ElementDetails {...props} element={element} name={name} /> : <LinkDetails {...props} link={link!} />}
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="m-0">{children}</dd>
    </>
  );
}

function Assumed() {
  return <span className="ml-1.5 rounded-full bg-state-yellow px-1.5 py-px text-[10.5px] font-medium uppercase tracking-[.05em] text-state-yellow-foreground">Assumed</span>;
}

function ElementDetails({
  def, element, decisions, facts, docs, assumptionCount, exposureAssumed, onShowAssumptions, onSelect, name,
}: Props & { element: Element; name: (id: string) => string }) {
  const decision = decisions.get(element.element_id);
  const where = placeOf(def, element);
  const exposure = element.internet_exposed;
  const links = def.links.filter((l) => l.source_id === element.element_id || l.destination_id === element.element_id);
  return (
    <>
      <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
        <Row term="Asset type">{assetWords(element.asset_type, element.asset_type_label)}</Row>
        <Row term="Where">{where}</Row>
        {exposure && (
          <Row term="Exposure">
            {exposure.value === 'yes' ? 'Reachable from the internet' : exposure.value === 'no' ? 'Not reachable from the internet' : 'Not known'}
            {(exposureAssumed || exposure.assumed) && <Assumed />}
          </Row>
        )}
        {element.owner_operator && <Row term="Run by">{element.owner_operator}</Row>}
        {decision && (
          <Row term="Scope">
            {SCOPE_WORDS[decision.status]}
            {decision.assumed && <Assumed />}
          </Row>
        )}
      </dl>
      {decision && (
        <div>
          <div className="aegis-label mb-1">Why {SCOPE_WORDS[decision.status].toLowerCase()}</div>
          <p className="m-0">{decision.reason}</p>
        </div>
      )}
      {links.length > 0 && (
        <div>
          <div className="aegis-label mb-1.5">Connections ({links.length})</div>
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[10px] border border-border p-0">
            {links.map((l) => {
              const out = l.source_id === element.element_id;
              return (
                <li key={l.link_id} className="border-b border-rule last:border-b-0">
                  <button type="button" onClick={() => onSelect(l.link_id)} className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent">
                    <span className="aegis-mono text-[11.5px] text-muted-foreground">{l.link_id}</span>
                    {out ? 'To' : 'From'} {name(out ? l.destination_id : l.source_id)}
                    {l.protocol && l.protocol !== 'unknown' ? `, ${protocolWords(l.protocol)}` : ''}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Quotes factIds={element.fact_ids} facts={facts} docs={docs} />
      {assumptionCount > 0 && (
        <button type="button" onClick={onShowAssumptions} className="inline-flex min-h-10 items-center gap-2 self-start rounded-[10px] border border-state-yellow-border bg-state-yellow px-3.5 font-medium text-[hsl(var(--aegis-decide-text))] transition-transform active:scale-[0.98]">
          <span className="h-2 w-2 rounded-full bg-state-yellow-foreground" aria-hidden="true" />
          See the {assumptionCount} assumption{assumptionCount > 1 ? 's' : ''} about this
        </button>
      )}
    </>
  );
}

function LinkDetails({ link, facts, docs, assumptionCount, onShowAssumptions }: Props & { link: Link }) {
  return (
    <>
      <dl className="m-0 grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
        <Row term="Used for">{link.usage_at_destination || 'Not stated'}</Row>
        <Row term="Protocol">{protocolWords(link.protocol)}</Row>
        <Row term="Sign-in">{link.authentication === 'unknown' ? 'Not stated' : link.authentication}</Row>
        <Row term="Encryption">{link.encryption === 'unknown' ? 'Not stated' : link.encryption}</Row>
        <Row term="Direction">{link.direction === 'bidirectional' ? 'Both ways' : 'One way'}</Row>
        <Row term="Trust boundary">{link.crosses_trust_boundary ? 'Crosses one' : 'Stays inside one area'}</Row>
      </dl>
      {link.data_carried && link.data_carried.length > 0 && (
        <div>
          <div className="aegis-label mb-1.5">Data carried</div>
          <ul className="m-0 pl-5">{link.data_carried.map((d) => <li key={d.item}>{d.item}</li>)}</ul>
        </div>
      )}
      {link.remark && <p className="m-0 text-muted-foreground">{link.remark}</p>}
      <Quotes factIds={link.fact_ids} facts={facts} docs={docs} />
      {assumptionCount > 0 && (
        <button type="button" onClick={onShowAssumptions} className="inline-flex min-h-10 items-center gap-2 self-start rounded-[10px] border border-state-yellow-border bg-state-yellow px-3.5 font-medium text-[hsl(var(--aegis-decide-text))] transition-transform active:scale-[0.98]">
          <span className="h-2 w-2 rounded-full bg-state-yellow-foreground" aria-hidden="true" />
          See the {assumptionCount} assumption{assumptionCount > 1 ? 's' : ''} about this
        </button>
      )}
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
    <div>
      <div className="aegis-label mb-1.5">{title} ({unique.length})</div>
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
    <blockquote className="m-0 rounded-[10px] border border-rule bg-[hsl(var(--well))] px-3 py-2.5">
      <p className="m-0">"{quote}"</p>
      <footer className="aegis-id mt-1">{doc}, {location}</footer>
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
