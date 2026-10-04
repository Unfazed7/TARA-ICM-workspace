import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionLineType,
  Connection,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Shield, GitFork, Crosshair, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { attackTreeNodeTypes } from './AttackTreeNodes';
import { AttackTreeInspector } from './AttackTreeInspector';
import { AttackTreeNodeData } from './attack-tree-types';
import { buildDemoTree, calculateFeasibility, feasibilityLabel } from './attack-tree-utils';

export function AttackTreeDesigner() {
  const demo = useMemo(() => buildDemoTree(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(demo.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(demo.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const feasibilityScore = useMemo(
    () => calculateFeasibility(nodes as Node<AttackTreeNodeData>[], edges),
    [nodes, edges]
  );

  const feasInfo = feasibilityScore !== null ? feasibilityLabel(feasibilityScore) : null;

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--primary) / 0.6)', strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const handleUpdateNode = useCallback((id: string, updates: Partial<AttackTreeNodeData>) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n;
      return { ...n, data: { ...n.data, ...updates } };
    }));
  }, [setNodes]);

  const addNode = useCallback((type: AttackTreeNodeData['type']) => {
    const id = `${type}-${Date.now()}`;
    const labels: Record<string, string> = {
      'and-gate': 'AND',
      'or-gate': 'OR',
      leaf: 'New Step',
    };
    const rfType: Record<string, string> = {
      'and-gate': 'attackTreeGate',
      'or-gate': 'attackTreeGate',
      leaf: 'attackTreeLeaf',
    };
    const newNode: Node<AttackTreeNodeData> = {
      id,
      type: rfType[type],
      position: { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 },
      data: { label: labels[type] ?? 'Node', type, difficulty: type === 'leaf' ? 1 : undefined },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
  }, [setNodes]);

  const resetDemo = useCallback(() => {
    const d = buildDemoTree();
    setNodes(d.nodes);
    setEdges(d.edges);
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  // Propagate calculated scores to gate nodes for display
  useEffect(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    function getChildren(nodeId: string): string[] {
      return edges.filter(e => e.source === nodeId).map(e => e.target);
    }
    function computeScore(nodeId: string): number | null {
      const node = nodeMap.get(nodeId);
      if (!node) return null;
      const d = node.data as AttackTreeNodeData;
      if (d.type === 'leaf') return d.difficulty ?? null;
      const childIds = getChildren(nodeId);
      const scores = childIds.map(computeScore).filter((s): s is number => s !== null);
      if (scores.length === 0) return null;
      if (d.type === 'and-gate') return scores.reduce((a, b) => a + b, 0);
      if (d.type === 'or-gate') return Math.min(...scores);
      if (d.type === 'root' && scores.length > 0) return scores.length === 1 ? scores[0] : Math.min(...scores);
      return null;
    }

    let changed = false;
    const updated = nodes.map(n => {
      const d = n.data as AttackTreeNodeData;
      if (d.type === 'and-gate' || d.type === 'or-gate') {
        const score = computeScore(n.id);
        if (score !== d.calculatedScore) {
          changed = true;
          return { ...n, data: { ...d, calculatedScore: score ?? undefined } };
        }
      }
      return n;
    });
    if (changed) setNodes(updated);
  }, [nodes, edges, setNodes]);

  return (
    <div className="h-full flex bg-background">
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={attackTreeNodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: 'hsl(var(--primary) / 0.5)', strokeWidth: 2 }}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background color="hsl(var(--primary) / 0.12)" gap={20} />
          <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-foreground/5" />

          {/* Add Node Toolbar */}
          <Panel position="top-left" className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              onClick={() => addNode('and-gate')}
            >
              <Shield className="h-3 w-3" /> AND Gate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              onClick={() => addNode('or-gate')}
            >
              <GitFork className="h-3 w-3" /> OR Gate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              onClick={() => addNode('leaf')}
            >
              <Crosshair className="h-3 w-3" /> Attack Step
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={resetDemo}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </Panel>

          {/* Feasibility Score */}
          <Panel position="bottom-center">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-6 py-3 flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Path Feasibility</span>
              {feasInfo ? (
                <>
                  <span className={cn('text-2xl font-bold font-mono', feasInfo.color)}>
                    {feasibilityScore}
                  </span>
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', feasInfo.color)}>
                    {feasInfo.label}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground/70">No complete path</span>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Inspector Sidebar */}
      <div className="w-72 border-l border-border bg-background">
        <AttackTreeInspector selectedNode={selectedNode} onUpdate={handleUpdateNode} />
      </div>
    </div>
  );
}
