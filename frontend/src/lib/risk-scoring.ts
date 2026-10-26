export interface RawRiskScore {
  risk_id: string;
  threat_id: string;
  damage_scenario_id: string;
  attack_id: string;
  impact_id: string;
  asset_id: string;
  impact_rating_value: number;
  impact_rating_label: string;
  afr_value: number;
  afr_label: string;
  risk_score: number;
  risk_level: string;
  risk_rank: number;
  created_timestamp?: string;
}

export interface TaraRiskScore {
  id: string;
  threatId: string;
  damageScenarioId: string;
  attackId: string;
  impactId: string;
  assetId: string;
  impactValue: number;
  impactLabel: string;
  afrValue: number;
  afrLabel: string;
  score: number;
  level: string;
  rank: number;
  createdAt: string;
}

export function mapRiskScore(raw: RawRiskScore): TaraRiskScore {
  return {
    id: raw.risk_id,
    threatId: raw.threat_id,
    damageScenarioId: raw.damage_scenario_id,
    attackId: raw.attack_id,
    impactId: raw.impact_id,
    assetId: raw.asset_id,
    impactValue: raw.impact_rating_value,
    impactLabel: raw.impact_rating_label,
    afrValue: raw.afr_value,
    afrLabel: raw.afr_label,
    score: raw.risk_score,
    level: raw.risk_level,
    rank: raw.risk_rank,
    createdAt: raw.created_timestamp ?? '',
  };
}
