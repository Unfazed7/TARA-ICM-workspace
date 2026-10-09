/** Details of the selected element or connection, with the quotes it rests on (spec 24). */

import { X } from 'lucide-react';
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
  onClose: () => void;
}

export function DetailsDrawer(props: Props) {
  const { def, selectedId, onClose } = props;
  const element = def.elements.find((e) => e.element_id === selectedId);
  const link = def.links.find((l) => l.link_id === selectedId);
  if (!element && !link) return null;
  const name = (id: string) => def.elements.find((e) => e.element_id === id)?.name || id;

  return (
    <aside aria-label="Details" className="flex w-[380px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-foreground bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="aegis-label">{element ? 'Component' : 'Connection'}</div>
          <h2 className="mt-1 text-lg font-semibold leading-6">{element ? element.name : `${name(link!.source_id)} to ${name(link!.destination_id)}`}</h2>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-foreground hover:bg-accent">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {element ? <ElementDetails {...props} element={element} name={name} /> : <LinkDetails {...props} link={link!} />}
    </aside>
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
  return <span className="aegis-label ml-1.5 text-signal-ink">Assumed</span>;
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
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {links.map((l) => {
              const out = l.source_id === element.element_id;
              return (
                <li key={l.link_id}>
                  <button type="button" onClick={() => onSelect(l.link_id)} className="text-left underline decoration-border underline-offset-4 hover:decoration-primary">
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
        <button type="button" onClick={onShowAssumptions} className="self-start rounded-md border border-foreground px-4 py-2.5 hover:bg-accent">
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
        <button type="button" onClick={onShowAssumptions} className="self-start rounded-md border border-foreground px-4 py-2.5 hover:bg-accent">
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
    <blockquote className="m-0 rounded-md border border-border p-2.5">
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
