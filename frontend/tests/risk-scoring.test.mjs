import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRiskScore } from '../src/lib/risk-scoring.ts';

test('maps a Stage 08 risk-register record for the results table', () => {
  const risk = mapRiskScore({
    risk_id: 'RSK_01',
    threat_id: 'TH_01',
    damage_scenario_id: 'DS_01',
    attack_id: 'AT_01',
    impact_id: 'IM_01',
    asset_id: 'AS_01',
    impact_rating_value: 2,
    impact_rating_label: 'Major',
    afr_value: 5,
    afr_label: 'very high',
    risk_score: 10,
    risk_level: 'high',
    risk_rank: 1,
    created_timestamp: '2026-10-09T12:54:37.961Z',
  });

  assert.deepEqual(risk, {
    id: 'RSK_01',
    threatId: 'TH_01',
    damageScenarioId: 'DS_01',
    attackId: 'AT_01',
    impactId: 'IM_01',
    assetId: 'AS_01',
    impactValue: 2,
    impactLabel: 'Major',
    afrValue: 5,
    afrLabel: 'very high',
    score: 10,
    level: 'high',
    rank: 1,
    createdAt: '2026-10-09T12:54:37.961Z',
  });
});
