/**
 * Stage 1 — Item Definition types.
 *
 * Mirrors:
 *   src/schemas/stage-01-*.schema.json          (pipeline contracts)
 *   checkpoint_api/schemas.py                    (boundary review API)
 *
 * Field names are load-bearing — they match the pipeline output on disk.
 */

export type ScopeStatus = 'in_scope' | 'interface' | 'out_of_scope' | 'ambiguous';
export type Origin = 'stated' | 'derived';
export type Confidence = 'high' | 'medium' | 'low';
export type BoundaryPhase = 'proposal' | 'final';

export type EscalationReason =
  | 'low_extraction_confidence'
  | 'unresolved_conflict'
  | 'derived_element'
  | 'boundary_genuinely_unclear';

export type ElementType =
  | 'component'
  | 'function'
  | 'feature_group'
  | 'network_segment'
  | 'node';

export type ComponentType =
  | 'ecu'
  | 'gateway'
  | 'sensor'
  | 'actuator'
  | 'backend_service'
  | 'web_app'
  | 'mobile_app'
  | 'database'
  | 'network_device'
  | 'other';

export type Domain = 'vehicle' | 'cloud' | 'user_device' | 'backend' | 'unknown';

export type Protocol =
  | 'CAN' | 'CAN-FD' | 'LIN' | 'FlexRay' | 'Ethernet' | 'SOME/IP'
  | 'UDS' | 'DoIP' | 'USB' | 'UART' | 'SPI' | 'I2C' | 'MQTT'
  | 'gRPC' | 'HTTPS' | 'HTTP' | 'TLS' | 'BLE' | 'WiFi' | 'Cellular'
  | 'unknown';

export type Tristate = 'yes' | 'no' | 'unknown';

export type SourceType =
  | 'feature_function_list'
  | 'network_topology'
  | 'architecture_diagram'
  | 'existing_item_definition'
  | 'free_text_description';

export interface SourceRef {
  source_id: string;
  element_ref?: string;
  /** Page or bounding-box hint for visual sources. Drives provenance display. */
  region?: string;
}

export interface ModelElement {
  element_id: string;
  type: ElementType;
  name: string;
  description?: string;
  origin: Origin;
  /** Present when origin === 'derived'. */
  derived_from?: string[];
  derivation_rationale?: string;
  confidence: Confidence;
  source_refs: SourceRef[];
  domain?: Domain;
  component_type?: ComponentType;
  /** Functions only — element_id of the hosting component. */
  allocated_to?: string;
  /** Set by the API when an analyst adds a missed element at CP1. */
  added_by_analyst?: boolean;
}

export interface ModelLink {
  link_id: string;
  from: string;
  to: string;
  protocol?: Protocol;
  authenticated?: Tristate;
  encrypted?: Tristate;
  origin: Origin;
  derived_from?: string[];
  derivation_rationale?: string;
  confidence: Confidence;
  source_refs?: SourceRef[];
}

export interface MergedModel {
  model_id: string;
  version: number;
  created_timestamp: string;
  elements: ModelElement[];
  links: ModelLink[];
}

export interface BoundaryDecision {
  element_id: string;
  status: ScopeStatus;
  rationale: string;
  /** Required when status === 'ambiguous'. */
  escalation_reason?: EscalationReason | null;
  decided_by: 'agent' | 'analyst';
}

export type ConflictType =
  | 'element_missing_in_source'
  | 'attribute_mismatch'
  | 'function_without_host'
  | 'orphan_node'
  | 'protocol_disagreement'
  | 'existing_itemdef_contradiction';

export type ConflictResolutionStatus =
  | 'auto_resolved'
  | 'escalated_cp1'
  | 'resolved_by_analyst';

export interface Conflict {
  conflict_id: string;
  type: ConflictType;
  description: string;
  involved: { source_id: string; element_ref?: string; claim?: string }[];
  resolution_status: ConflictResolutionStatus;
  resolution?: {
    rule_applied?: string;
    winner?: string;
    analyst_note?: string;
    timestamp?: string;
  };
}

export interface ConflictsDocument {
  model_ref: string;
  conflicts: Conflict[];
}

export interface CoverageConsequence {
  absent_source: SourceType;
  impact: string;
  affected_count: number;
  downstream_effect: string;
}

export interface Coverage {
  sources_provided: SourceType[];
  sources_absent: SourceType[];
  consequences: CoverageConsequence[];
  recommendation?: string;
}

/** GET /api/v1/assessments/{id}/boundary */
export interface BoundaryState {
  boundary_id: string;
  assessment_id: string;
  model_ref: string;
  phase: BoundaryPhase;
  boundary_statement: string;
  decisions: BoundaryDecision[];
  merged_model: MergedModel | null;
  conflicts: ConflictsDocument | null;
  coverage: Coverage | null;
  /** Server-computed. Drives the blocking gate and the next-unresolved stepper. */
  unresolved_count: number;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
}

export type BoundaryEditAction =
  | 'status_change'
  | 'rename'
  | 'add_element'
  | 'delete_element'
  | 'add_link'
  | 'delete_link'
  | 'resolve_conflict'
  | 'edit_rationale';

export interface BoundaryEdit {
  edit_id: string;
  action: BoundaryEditAction;
  element_id: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  rationale?: string | null;
  actor: string;
  timestamp: string;
}

/* --- Request payloads ------------------------------------------------------ */

export interface ElementScopeUpdate {
  status: ScopeStatus;
  rationale: string;
  actor: string;
}

export interface ElementAdd {
  element_id?: string;
  name: string;
  type: ElementType;
  component_type?: ComponentType;
  domain?: Domain;
  status?: ScopeStatus;
  rationale: string;
  actor: string;
}

export interface ElementDelete {
  rationale: string;
  actor: string;
}

export interface ConflictResolve {
  conflict_id: string;
  analyst_note: string;
  actor: string;
}

export interface BoundaryFinalizeResponse {
  boundary_id: string;
  phase: BoundaryPhase;
  finalized_at: string;
  decisions_count: number;
  edit_count: number;
}

/* --- Item definition (CP2) ------------------------------------------------- */

/** Every narrative field is traced: sourced, or explicitly agent_proposed. */
export interface TracedField {
  text: string;
  agent_proposed: boolean;
  source_refs?: SourceRef[];
  confirmed_at_cp2?: boolean;
}

export interface ItemFunction {
  function_id: string;
  name: string;
  description: TracedField;
  allocated_to?: string;
  origin: Origin;
}

export interface ItemAssumption {
  assumption_id: string;
  text: TracedField;
  /** element_id of the boundary decision that required this assumption. */
  justified_by: string;
}

export interface ItemDefinition {
  item_id: string;
  item_name: string;
  version: number;
  created_timestamp: string;
  purpose: TracedField;
  functions: ItemFunction[];
  boundary_ref: string;
  preliminary_architecture: {
    in_scope_elements: string[];
    interface_elements: string[];
    narrative?: TracedField;
  };
  operational_environment: {
    narrative: TracedField;
    domains?: Domain[];
  };
  assumptions: ItemAssumption[];
  coverage: Coverage;
}

/* --- View helpers ---------------------------------------------------------- */

export const TERMINAL_STATUSES: ScopeStatus[] = [
  'in_scope',
  'interface',
  'out_of_scope',
];

export function isBlocking(decision: BoundaryDecision): boolean {
  return decision.status === 'ambiguous';
}

export function unresolvedIds(state: BoundaryState): string[] {
  return state.decisions.filter(isBlocking).map((d) => d.element_id);
}

export function openConflicts(state: BoundaryState): Conflict[] {
  return (state.conflicts?.conflicts ?? []).filter(
    (c) => c.resolution_status === 'escalated_cp1',
  );
}

/** Can the analyst finalize? Mirrors the server-side gate exactly. */
export function canFinalize(state: BoundaryState): boolean {
  return (
    state.phase === 'proposal' &&
    state.unresolved_count === 0 &&
    openConflicts(state).length === 0
  );
}
