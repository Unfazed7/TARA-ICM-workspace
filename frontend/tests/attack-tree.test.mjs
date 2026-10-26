import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttackTreeFromPath } from '../src/components/workspace/attack-tree/attack-tree-utils.ts';

test('builds a React Flow attack tree from a generated five-step attack path', () => {
  const tree = buildAttackTreeFromPath({
    id: 'AT_01',
    linkedThreatId: 'TH_01',
    description: 'Flood the Kubernetes API until the control plane is unavailable.',
    steps: [
      'Reach the public API endpoint.',
      'Send expensive LIST and WATCH requests.',
      'Exhaust request concurrency.',
      'No rate limiting protects system traffic.',
      'The control plane becomes unavailable.',
    ],
    afrValue: 5,
    afrLabel: 'very high',
  }, 'EKS Kubernetes API denial of service');

  assert.equal(tree.nodes.length, 7);
  assert.equal(tree.edges.length, 6);
  assert.equal(tree.nodes[0].data.type, 'root');
  assert.match(tree.nodes[0].data.label, /TH_01/);
  assert.equal(tree.nodes[1].data.type, 'and-gate');
  assert.deepEqual(
    tree.nodes.slice(2).map((node) => node.data.label),
    [
      '1. Initial Precondition',
      '2. Abuse Technique',
      '3. Exploit Effect',
      '4. Control Gap',
      '5. Threat Realization',
    ],
  );
  assert.equal(tree.nodes[2].data.detail, 'Reach the public API endpoint.');
  assert.deepEqual(
    tree.edges.map((edge) => [edge.source, edge.target]),
    [
      ['AT_01-root', 'AT_01-and'],
      ['AT_01-and', 'AT_01-step-1'],
      ['AT_01-and', 'AT_01-step-2'],
      ['AT_01-and', 'AT_01-step-3'],
      ['AT_01-and', 'AT_01-step-4'],
      ['AT_01-and', 'AT_01-step-5'],
    ],
  );
});
