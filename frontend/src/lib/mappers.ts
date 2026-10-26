import type { Assessment } from '@/types/api';
import type { Project, VehicleType, ProjectDomain } from '@/types/tara';

export function assessmentToProject(a: Assessment): Project {
  return {
    id: a.assessment_id,
    name: a.name,
    description: a.description ?? undefined,
    vehicleType: a.vehicle_type as VehicleType,
    catalogVersion: 'iso21434-2021',
    domains: a.domains as ProjectDomain[],
    scope: 'vehicle',
    workflowMode: 'ai-assisted',
    status: a.status,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    completionPercentage: a.completion_percentage,
    threatCount: 0,
    riskCount: 0,
  };
}

// ── Stage 10 Residual Risk (D-55) ─────────────────────────────────────────────

export type CvssMetricKey = 'attack_vector' | 'attack_complexity' | 'privileges_required' | 'user_interaction';

export interface RawResidualState {
  metrics: Record<CvssMetricKey, string>;
  afr_value: number;
  afr_label: string;
  risk_score: number;
  risk_level: string;
}

export interface RawResidualRisk {
  residual_id: string;
  threat_id: string;
  risk_id: string;
  attack_id: string;
  asset_id: string;
  treatment_option: string;
  controls: { control_id: string; control_title: string; control_type: string }[];
  pre: RawResidualState;
  post: RawResidualState;
  metric_changes: { metric: CvssMetricKey; from: string; to: string; control_id: string; reason: string }[];
  created_timestamp?: string;
}

export interface TaraResidualRisk {
  id: string;
  threatId: string;
  riskId: string;
  attackId: string;
  assetId: string;
  treatmentOption: string;
  controls: { id: string; title: string; type: string }[];
  pre: { metrics: Record<CvssMetricKey, string>; afrValue: number; afrLabel: string; score: number; level: string };
  post: { metrics: Record<CvssMetricKey, string>; afrValue: number; afrLabel: string; score: number; level: string };
  changes: { metric: CvssMetricKey; from: string; to: string; controlId: string; reason: string }[];
}

const mapResidualState = (state: RawResidualState) => ({
  metrics: state.metrics,
  afrValue: state.afr_value,
  afrLabel: state.afr_label,
  score: state.risk_score,
  level: state.risk_level,
});

export function mapResidualRisk(raw: RawResidualRisk): TaraResidualRisk {
  return {
    id: raw.residual_id,
    threatId: raw.threat_id,
    riskId: raw.risk_id,
    attackId: raw.attack_id,
    assetId: raw.asset_id,
    treatmentOption: raw.treatment_option,
    controls: raw.controls.map((control) => ({ id: control.control_id, title: control.control_title, type: control.control_type })),
    pre: mapResidualState(raw.pre),
    post: mapResidualState(raw.post),
    changes: raw.metric_changes.map((change) => ({ metric: change.metric, from: change.from, to: change.to, controlId: change.control_id, reason: change.reason })),
  };
}
