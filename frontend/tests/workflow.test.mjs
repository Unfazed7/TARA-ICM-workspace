import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSheetProgress, calculateWorkflowProgress, canRunStage, phaseTabs, stageDestination, stageForTab } from '../src/lib/workflow.ts';

test('workflow progress is derived from completed backend stages', () => {
  assert.equal(calculateWorkflowProgress('assets-damage', { '03': 'complete', '04': 'not_started' }), 50);
  // Stage 10 (residual risk) is part of the risk phase (D-55).
  assert.equal(calculateWorkflowProgress('risk-treatment', { '07': 'complete', '08': 'complete', '09': 'complete' }), 75);
  assert.equal(calculateWorkflowProgress('risk-treatment', { '07': 'complete', '08': 'complete', '09': 'complete', '10': 'complete' }), 100);
});

test('the Impacts page runs Stage 04 alone, and the sheets and stages follow the new pills', () => {
  assert.equal(calculateWorkflowProgress('impacts', { '04': 'complete' }), 100);
  assert.deepEqual(phaseTabs.impacts, ['damage-analysis']);
  assert.deepEqual(stageDestination[4], { phase: 'impacts', tab: 'damage-analysis' });
  assert.equal(stageForTab['residual-risk'], 10);
});

test('a stage only runs when it is available and dependencies are complete', () => {
  const stage = { available: true, dependencies: [3, 4] };
  assert.equal(canRunStage(stage, 'not_started', { '03': 'complete', '04': 'complete' }), true);
  assert.equal(canRunStage(stage, 'not_started', { '03': 'complete', '04': 'running' }), false);
  assert.equal(canRunStage(stage, 'complete', { '03': 'complete', '04': 'complete' }), false);
});

test('sheet progress allocates an equal segment to every visible result sheet', () => {
  const threatSheets = [5, 6, 6];
  assert.equal(calculateSheetProgress(threatSheets, { '05': 'complete', '06': 'not_started' }), 33);
  assert.equal(calculateSheetProgress(threatSheets, { '05': 'complete', '06': 'complete' }), 100);
});
