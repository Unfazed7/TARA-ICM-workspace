/** Stage 01 and 02 data as the stage store returns it (specs 18, 22, 23). */

export type StageKey = '01' | '02';
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

export type Topic = 'exposure' | 'sign_in' | 'scope' | 'environment' | 'data' | 'naming' | 'reading';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'disputed';

export interface RationaleItem {
  rationale_id: string;
  stage: StageKey;
  kind: 'conflict' | 'ambiguity' | 'gap' | 'assumption';
  topic: Topic;
  attention: 'needs_attention' | 'information';
  title: string;
  concluded: string;
  why: { sources?: SourceRef[]; based_on_rationale_ids?: string[]; note?: string };
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
