import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TaraAttackPath } from '@/contexts/TaraContext';
import { attackTreeNodeTypes } from './AttackTreeNodes';
import { AttackTreeInspector } from './AttackTreeInspector';
import type { AttackTreeNodeData } from './attack-tree-types';
import { buildAttackTreeFromPath } from './attack-tree-utils';

interface AttackTreeDesignerProps {
  attackPath: TaraAttackPath;
  threatLabel?: string;
}

const AFR_STYLE: Record<string, string> = {
  'very high': 'text-destructive ',
  high: 'text-signal-ink ',
  medium: 'text-signal-ink ',
  low: 'text-primary ',
  'very low': 'text-muted-foreground/70 ',
};

export function AttackTreeDesigner({ attackPath, threatLabel }: AttackTreeDesignerProps) {
  const generated = useMemo(
    () => buildAttackTreeFromPath(attackPath, threatLabel),
    [attackPath, threatLabel],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(generated.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generated.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const resetGeneratedTree = useCallback(() => {
    const next = buildAttackTreeFromPath(attackPath, threatLabel);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(null);
  }, [attackPath, setEdges, setNodes, threatLabel]);

  return (
    <div className="flex h-full min-h-0 bg-background">
      <div className="relative min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={attackTreeNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.25}
          nodesConnectable={false}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background color="hsl(var(--border))" gap={20} />
          <Controls className="!rounded-lg !border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted" />

          <Panel position="top-left">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 bg-card text-xs"
              onClick={resetGeneratedTree}
            >
              <RotateCcw className="size-3" /> Reset layout
            </Button>
          </Panel>

          <Panel position="bottom-center">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card/95 px-5 py-3 shadow-sm backdrop-blur-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Attack Feasibility Rating</span>
              {attackPath.afrValue !== undefined ? (
                <>
                  <span className={cn('font-mono text-xl font-bold', AFR_STYLE[attackPath.afrLabel ?? ''] ?? 'text-foreground')}>
                    {attackPath.afrValue}/5
                  </span>
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', AFR_STYLE[attackPath.afrLabel ?? ''] ?? 'text-foreground')}>
                    {attackPath.afrLabel}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Not calculated</span>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <div className="hidden w-72 shrink-0 border-l border-border bg-card lg:block">
        <AttackTreeInspector
          selectedNode={selectedNode as Node<AttackTreeNodeData> | null}
          onUpdate={() => undefined}
          readOnly
        />
      </div>
    </div>
  );
}
