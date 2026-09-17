import { Node, Edge } from 'reactflow';
import { AttackTreeNodeData } from './attack-tree-types';

/* ── Demo Data ── */
export function buildDemoTree(): { nodes: Node<AttackTreeNodeData>[]; edges: Edge[] } {
  const nodes: Node<AttackTreeNodeData>[] = [
    {
      id: 'root-1',
      type: 'attackTreeRoot',
      position: { x: 400, y: 40 },
      data: { label: 'Spoof Low Beam Signal', type: 'root' },
    },
    {
      id: 'or-1',
      type: 'attackTreeGate',
      position: { x: 400, y: 200 },
      data: { label: 'OR', type: 'or-gate' },
    },
    {
      id: 'and-1',
      type: 'attackTreeGate',
      position: { x: 200, y: 380 },
      data: { label: 'AND (Remote)', type: 'and-gate', detail: 'Remote Attack Path' },
    },
    {
      id: 'leaf-1',
      type: 'attackTreeLeaf',
      position: { x: 60, y: 560 },
      data: { label: 'Compromise Telematics', type: 'leaf', difficulty: 3 },
    },
    {
      id: 'leaf-2',
      type: 'attackTreeLeaf',
      position: { x: 260, y: 560 },
      data: { label: 'Pivot to Gateway', type: 'leaf', difficulty: 4 },
    },
    {
      id: 'leaf-3',
      type: 'attackTreeLeaf',
      position: { x: 460, y: 560 },
      data: { label: 'Inject CAN Message', type: 'leaf', difficulty: 2 },
    },
    {
      id: 'leaf-4',
      type: 'attackTreeLeaf',
      position: { x: 650, y: 380 },
      data: { label: 'Connect to OBD-II', type: 'leaf', difficulty: 1, detail: 'Physical access required' },
    },
  ];

  const edges: Edge[] = [
    { id: 'e-root-or', source: 'root-1', target: 'or-1', type: 'smoothstep', style: { stroke: 'rgba(239,68,68,0.5)', strokeWidth: 2 } },
    { id: 'e-or-and', source: 'or-1', target: 'and-1', type: 'smoothstep', style: { stroke: 'rgba(59,130,246,0.5)', strokeWidth: 2 } },
    { id: 'e-or-leaf4', source: 'or-1', target: 'leaf-4', type: 'smoothstep', style: { stroke: 'rgba(59,130,246,0.5)', strokeWidth: 2 } },
    { id: 'e-and-leaf1', source: 'and-1', target: 'leaf-1', type: 'smoothstep', style: { stroke: 'rgba(59,130,246,0.5)', strokeWidth: 2 } },
    { id: 'e-and-leaf2', source: 'and-1', target: 'leaf-2', type: 'smoothstep', style: { stroke: 'rgba(59,130,246,0.5)', strokeWidth: 2 } },
    { id: 'e-and-leaf3', source: 'and-1', target: 'leaf-3', type: 'smoothstep', style: { stroke: 'rgba(59,130,246,0.5)', strokeWidth: 2 } },
  ];

  return { nodes, edges };
}

/* ── Feasibility Calculation ── */
export function calculateFeasibility(
  nodes: Node<AttackTreeNodeData>[],
  edges: Edge[]
): number | null {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  function getChildren(nodeId: string): string[] {
    return edges.filter(e => e.source === nodeId).map(e => e.target);
  }

  function computeScore(nodeId: string): number | null {
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const data = node.data as AttackTreeNodeData;

    if (data.type === 'leaf') {
      return data.difficulty ?? null;
    }

    const childIds = getChildren(nodeId);
    if (childIds.length === 0) return null;

    const childScores = childIds.map(computeScore).filter((s): s is number => s !== null);
    if (childScores.length === 0) return null;

    if (data.type === 'and-gate') {
      return childScores.reduce((sum, s) => sum + s, 0);
    }
    if (data.type === 'or-gate') {
      return Math.min(...childScores);
    }

    // root: treat like pass-through to single child
    if (data.type === 'root') {
      if (childScores.length === 1) return childScores[0];
      return Math.min(...childScores);
    }

    return null;
  }

  const rootNode = nodes.find(n => (n.data as AttackTreeNodeData).type === 'root');
  if (!rootNode) return null;
  return computeScore(rootNode.id);
}

export function feasibilityLabel(score: number): { label: string; color: string } {
  if (score <= 2) return { label: 'Very High', color: 'text-red-400' };
  if (score <= 5) return { label: 'High', color: 'text-amber-400' };
  if (score <= 9) return { label: 'Medium', color: 'text-yellow-400' };
  if (score <= 14) return { label: 'Low', color: 'text-cyan-400' };
  return { label: 'Very Low', color: 'text-slate-400' };
}
