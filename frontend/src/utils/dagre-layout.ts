import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const BUS_WIDTH = 350;
const BUS_HEIGHT = 48;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 150,
    nodesep: 100,
    edgesep: 50,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    const isBus = node.type === 'bus';
    if (isBus) {
      // Bus nodes are wide horizontal bars — give them large width
      dagreGraph.setNode(node.id, {
        width: direction === 'TB' ? BUS_WIDTH : BUS_HEIGHT,
        height: direction === 'TB' ? BUS_HEIGHT : BUS_WIDTH,
      });
    } else {
      dagreGraph.setNode(node.id, {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isBus = node.type === 'bus';
    const w = isBus ? (direction === 'TB' ? BUS_WIDTH : BUS_HEIGHT) : NODE_WIDTH;
    const h = isBus ? (direction === 'TB' ? BUS_HEIGHT : BUS_WIDTH) : NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
