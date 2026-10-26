import type { Edge, Node } from 'reactflow';
import type { AttackTreeNodeData } from './attack-tree-types.ts';

export interface AttackPathTreeSource {
  id: string;
  linkedThreatId: string;
  description: string;
  steps: string[];
  afrValue?: number;
  afrLabel?: string;
}

const STEP_LABELS = [
  '1. Initial Precondition',
  '2. Abuse Technique',
  '3. Exploit Effect',
  '4. Control Gap',
  '5. Threat Realization',
];

function concise(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildAttackTreeFromPath(
  attackPath: AttackPathTreeSource,
  threatLabel?: string,
): { nodes: Node<AttackTreeNodeData>[]; edges: Edge[] } {
  const rootId = `${attackPath.id}-root`;
  const gateId = `${attackPath.id}-and`;
  const rootLabel = concise(
    `${attackPath.linkedThreatId}: ${threatLabel || attackPath.description}`,
    180,
  );

  const nodes: Node<AttackTreeNodeData>[] = [
    {
      id: rootId,
      type: 'attackTreeRoot',
      position: { x: 470, y: 20 },
      data: {
        label: rootLabel,
        type: 'root',
        detail: attackPath.description,
      },
    },
    {
      id: gateId,
      type: 'attackTreeGate',
      position: { x: 520, y: 210 },
      data: {
        label: 'AND',
        type: 'and-gate',
        detail: `${attackPath.id} requires all five steps${attackPath.afrLabel ? ` · AFR ${attackPath.afrValue}/5 (${attackPath.afrLabel})` : ''}`,
      },
    },
    ...STEP_LABELS.map((label, index): Node<AttackTreeNodeData> => ({
      id: `${attackPath.id}-step-${index + 1}`,
      type: 'attackTreeLeaf',
      position: { x: 20 + index * 245, y: 420 },
      data: {
        label,
        type: 'leaf',
        detail: attackPath.steps[index] || 'Step not supplied by Stage 6.',
      },
    })),
  ];

  const edges: Edge[] = [
    {
      id: `${attackPath.id}-root-to-and`,
      source: rootId,
      target: gateId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'rgba(239,68,68,0.55)', strokeWidth: 2 },
    },
    ...STEP_LABELS.map((_, index): Edge => ({
      id: `${attackPath.id}-and-to-step-${index + 1}`,
      source: gateId,
      target: `${attackPath.id}-step-${index + 1}`,
      type: 'smoothstep',
      style: { stroke: 'rgba(59,130,246,0.55)', strokeWidth: 2 },
    })),
  ];

  return { nodes, edges };
}
