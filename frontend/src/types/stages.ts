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
  /** Folders 04 to 10, built after Stage 03 in the same Execute. */
  folders?: { stage_num: number; status: string; error: string | null; started_at: string | null; completed_at: string | null }[];
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

// ── Screens 04 Impacts, 05 Threats, 06 TARA (specs 29 to 31) ──────────────────

export type UiStage = '04' | '05' | '06';
export type ImpactLevel = 'Negligible' | 'Moderate' | 'Major' | 'Severe';
export type RiskLevel = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type Treatment = 'reduce' | 'accept' | 'share' | 'avoid';

export interface EditInfo {
  kind: 'confirmed' | 'changed';
  reason: string;
  by: string;
  at: string;
  from: unknown;
}

export interface RowNotes {
  comment_fields: string[];
  assumption_fields: string[];
  assumptions_open: number;
}

export interface UiRowBase {
  record_id: string;
  asset_id: string;
  asset_ref: string;
  asset_name: string;
  family: string;
  family_name: string;
  property: string | null;
  notes: RowNotes;
}

export interface ImpactCell {
  level: ImpactLevel | null;
  mixed: boolean;
  locked: boolean;
  rule: string | null;
  why: { threat_id: string; level: ImpactLevel; reason: string }[];
  edit: EditInfo | null;
}

export interface ImpactRow extends UiRowBase {
  damage: string;
  stakeholder: string;
  impact_ids: string[];
  rated: boolean;
  cells: Record<string, ImpactCell>;
  overall: { value: number; label: ImpactLevel } | null;
}

export interface ThreatFactor {
  code: string;
  label: string;
  why: string;
  edit: EditInfo | null;
}

export interface ThreatRow extends UiRowBase {
  threat: string;
  derivation_note: string;
  damage_id: string;
  damage: string | null;
  stride: { value: string; edit: EditInfo | null };
  attack_id: string | null;
  factors: Record<string, ThreatFactor> | null;
  cvss: number | null;
  feasibility: { value: number; label: string } | null;
  attack_path: { description: string; steps: string[] } | null;
}

export interface TaraRow extends UiRowBase {
  risk_id: string;
  damage_id: string;
  damage: string | null;
  impact: { value: number; label: ImpactLevel };
  threat_id: string;
  threat: string | null;
  feasibility: { value: number; label: string };
  risk: { score: number; level: RiskLevel; rank: number };
  cvss: number | null;
  treatment: {
    option: Treatment;
    rationale: string;
    goal: { id: string; statement: string; cal: number } | null;
    claim: { id: string; statement: string; basis: string } | null;
    avoidance_action: string | null;
    controls: { id: string; title: string; type: string }[];
    cal: number;
    edit: EditInfo | null;
  } | null;
  residual: {
    pre: { metrics: Record<string, string>; afr_value: number; afr_label: string; risk_score: number; risk_level: RiskLevel };
    post: { metrics: Record<string, string>; afr_value: number; afr_label: string; risk_score: number; risk_level: RiskLevel };
    changes: { metric: string; from: string; to: string; control_id: string; reason: string }[];
  } | null;
}

export interface UiAssumption {
  id: string; // AS-04-01
  key: string;
  folder: number;
  record_id: string | null;
  field: string | null;
  text: string;
  status: 'open' | 'confirmed' | 'disputed';
  note: string | null;
}

export interface UiScales {
  weights: Record<string, Record<string, number>>;
  afr_labels: Record<string, string>;
  exploitability: { min: number; max: number; factor: number };
  risk_levels: { level: RiskLevel; from: number; to: number }[];
}

export interface UiStageOutput<Row> {
  ui_stage: UiStage;
  built_from: { label: string; run: number | null };
  building: boolean;
  folders: { stage_num: number; status: string; error: string | null }[];
  stale: { is: boolean; folders: number[]; reason: string | null };
  finished: { by: string; at: string } | null;
  has_data: boolean;
  families: { code: string; name: string }[];
  rows: Row[];
  assumptions: UiAssumption[];
  scales: UiScales;
}

export interface UiComment {
  id: number;
  record_id: string;
  field: string | null;
  author: 'analyst' | 'assistant';
  text: string;
  created_at: string;
  resolved: boolean;
  proposed_change: { field: string; value: string; state: 'open' | 'applied' | 'kept'; from?: string | null } | null;
}

export interface UiEditBody {
  value?: string;
  reason?: string;
  confirm?: true;
  goal_statement?: string;
  avoidance_action?: string;
}
