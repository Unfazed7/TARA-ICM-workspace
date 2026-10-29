/** Stage 01, 02 and 03 data as the stage store returns it (specs 18, 22, 23, 27). */

export type StageKey = '01' | '02' | '03';
export type JobStatus = 'not_started' | 'pending' | 'running' | 'complete' | 'failed';
export type DocGroup = 'components' | 'behaviour';

export interface UploadedDocument {
  file: string;
  doc_type: string;
  category?: DocGroup;
  type_label?: string;
  date_received?: string;
  size_bytes: number;
}

export interface PipelineStatus {
  stages: {
    stage: StageKey;
    status: JobStatus;
    error: string | null;
    run_number: number | null;
    refused_count: number | null;
    started_at: string | null;
    completed_at: string | null;
  }[];
  documents: number;
  boundary_set: boolean;
  missing: string[];
}

export interface SourceRef {
  doc_id: string;
  location: string;
  quote: string;
}

export interface RegisterEntry {
  doc_id: string;
  title: string;
  client_doc_ref: string;
  date_received: string;
  doc_type: string;
  doc_type_label?: string;
  read_status: 'parsed' | 'partial' | 'failed';
  /** How the document was read: `parsed` by code, or by the model (for example `image_model`). */
  reading_method?: string;
  precedence_rank: number;
  environment: string;
  used_for: string;
  ignored_and_why: string;
}

export interface Fact {
  fact_id: string;
  subject: string;
  fact_type: string;
  value: string;
  source_refs: SourceRef[];
  status: string;
}

export interface Stage01Output {
  run_number: number;
  created_at: string;
  document_register: RegisterEntry[];
  facts: Fact[];
}

export interface Zone {
  zone_id: string;
  kind: string;
  name: string;
}

export interface Container {
  container_id: string;
  kind: string;
  name: string;
  parent_id?: string;
  zone_id?: string;
  fact_ids: string[];
}

export interface Exposure {
  value: 'yes' | 'no' | 'unknown';
  evidence_fact_ids?: string[];
  assumed?: boolean;
}

export interface Element {
  element_id: string;
  name: string;
  asset_type: string;
  asset_type_label?: string;
  parent_container_id?: string;
  zone_id: string;
  provider?: string;
  hosting_type?: string;
  internet_exposed?: Exposure;
  is_entry_point: boolean;
  auth_method?: string;
  owner_operator: string;
  fact_ids: string[];
}

export interface Link {
  link_id: string;
  type: string;
  direction: 'unidirectional' | 'bidirectional';
  source_id: string;
  destination_id: string;
  protocol: string;
  usage_at_destination: string;
  authentication: string;
  encryption: string;
  data_carried?: { item: string; category: string }[];
  crosses_trust_boundary: boolean;
  remark?: string;
  fact_ids: string[];
}

export type ScopeStatus = 'in_scope' | 'interface' | 'out_of_scope' | 'ambiguous';

export interface ScopeDecision {
  decision_id: string;
  element_id: string;
  status: ScopeStatus;
  reason: string;
  assumed: boolean;
}

export interface Question {
  question_id: string;
  target_id: string;
  text: string;
  why_it_matters: string;
  default_if_unanswered: string;
  status: 'open' | 'answered' | 'sent_to_client' | 'dropped_answered_by_docs';
  answer?: string;
}

export interface Stage02Output {
  run_number: number;
  created_at: string;
  item_definition: {
    item_name: string;
    boundary_statement: { text: string; proposed?: boolean };
    zones: Zone[];
    containers: Container[];
    elements: Element[];
    links: Link[];
    scope_decisions: ScopeDecision[];
  };
  questions: Question[];
}

export type Topic = 'exposure' | 'sign_in' | 'scope' | 'environment' | 'data' | 'naming' | 'reading' | 'assets';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'disputed';

export interface RationaleItem {
  rationale_id: string;
  stage: StageKey;
  kind: 'conflict' | 'ambiguity' | 'gap' | 'assumption';
  topic: Topic;
  attention: 'needs_attention' | 'information';
  title: string;
  concluded: string;
  why: { sources?: SourceRef[]; based_on_rationale_ids?: string[]; from_ids?: string[]; note?: string };
  assumed: string;
  would_change: string;
  question_id?: string;
  affects: string[];
  review: { status: ReviewStatus; note?: string; by?: string; at?: string };
}

export interface RationaleList {
  stage: StageKey;
  run_number: number;
  items: RationaleItem[];
}

// ── Stage 03 Assets (spec 27) ─────────────────────────────────────────────────

export type PropertyCode = 'C' | 'I' | 'A' | 'Au' | 'Az' | 'NR';
export type AssetStatus = 'proposed' | 'confirmed' | 'removed';

export interface AssetProperty {
  applies: boolean;
  reason: string;
  origin: 'default' | 'model' | 'analyst';
  reviewed: boolean;
}

export interface Asset {
  asset_id: string;
  family: string;
  name: string;
  type_label: string;
  description: string;
  source: { kind: 'element' | 'function' | 'item' | 'link'; ids: string[]; label: string; scope: ScopeStatus };
  interface: boolean;
  reason: string;
  would_change: string;
  quotes: { text: string; where: string }[];
  asset_type_row: boolean;
  status: AssetStatus;
  status_note: string | null;
  properties: Record<PropertyCode, AssetProperty>;
}

export interface Stage03Output {
  stage: '03';
  run_number: number;
  created_at: string;
  built_from_02_run: number | null;
  stale: boolean;
  /** `stage03`, or `upload:<file name>` while the later stages read an uploaded list. */
  register_source: string;
  assets: Asset[];
  families: { code: string; name: string; count: number }[];
  finished: { by: string; at: string } | null;
  rationale: RationaleItem[];
}

export interface AssetComment {
  id: number;
  run_number: number;
  asset_id: string;
  property: PropertyCode | null;
  author: 'analyst' | 'assistant';
  text: string;
  created_at: string;
  resolved: boolean;
  proposed_change: { property: PropertyCode; applies: boolean; state: 'open' | 'applied' | 'kept' } | null;
}
