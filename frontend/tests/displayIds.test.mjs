import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// The formatter is plain TypeScript with no imports, so strip the types and load it.
const source = readFileSync(new URL('../src/lib/displayIds.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('pipeline ids are shown the way the designs show them', () => {
  assert.equal(mod.damageCode('DS_01'), 'DMG-01');
  assert.equal(mod.threatCode('TH_12'), 'THR-12');
  assert.equal(mod.attackCode('AT_03'), 'AP-03');
  assert.equal(mod.riskCode('RSK_14'), 'RSK-14');
  assert.equal(mod.goalCode('CG_01'), 'CG-01');
  assert.equal(mod.dashed('CTR_07'), 'CTR-07');
});

test('an asset is shown by its reference, else by its register id', () => {
  assert.equal(mod.assetCode('WL-01', 'AS_01'), 'WL-01');
  assert.equal(mod.assetCode(null, 'AS_02'), 'AS-02');
  assert.equal(mod.assetCode('', undefined), '');
});

test('what is not a pipeline id is left alone', () => {
  assert.equal(mod.damageCode('free text'), 'free text');
  assert.equal(mod.damageCode(null), '');
});
