import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Folder, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupNodeData {
  label: string;
  layer?: 'powertrain' | 'infotainment' | 'chassis' | 'adas' | 'body';
  expanded?: boolean;
  childCount?: number;
}

const layerColors: Record<string, string> = {
  powertrain: 'border-primary/50 bg-primary/5',
  infotainment: 'border-chart-4/50 bg-chart-4/5',
  chassis: 'border-amber/50 bg-amber/5',
  adas: 'border-chart-3/50 bg-chart-3/5',
  body: 'border-chart-5/50 bg-chart-5/5',
};

function GroupNodeComponent({ id, data, selected }: NodeProps<GroupNodeData>) {
  const [isExpanded, setIsExpanded] = useState(data.expanded ?? false);
  const { setNodes } = useReactFlow();
  
  const handleDoubleClick = useCallback(() => {
    setIsExpanded(!isExpanded);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, expanded: !isExpanded } }
          : node
      )
    );
  }, [id, isExpanded, setNodes]);

  const colorClass = layerColors[data.layer || 'powertrain'];
  
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-300",
        colorClass,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isExpanded ? "min-w-[300px] min-h-[200px]" : "min-w-[160px] min-h-[80px]"
      )}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 border-b border-dashed",
        colorClass.replace('bg-', 'border-')
      )}>
        <div className="p-1.5 rounded bg-background/50">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <Layers className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label}</span>
        {data.childCount && !isExpanded && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.childCount} components
          </span>
        )}
      </div>
      
      {/* Content area for nested nodes */}
      {isExpanded && (
        <div className="p-4 min-h-[140px] flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            Drop components here
          </span>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
