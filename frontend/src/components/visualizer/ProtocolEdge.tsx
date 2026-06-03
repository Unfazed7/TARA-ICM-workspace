import { memo, useCallback } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { 
  CommunicationProtocol, 
  getProtocolStyle, 
  getProtocolLabel,
  PROTOCOL_CONFIGS 
} from '@/types/communication-protocols';
import { EdgeProtocolEditor } from './EdgeProtocolEditor';

export interface ProtocolEdgeData {
  protocol: CommunicationProtocol;
  label?: string;
}

function ProtocolEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ProtocolEdgeData>) {
  const { setEdges } = useReactFlow();
  const protocol = data?.protocol || 'can';
  const style = getProtocolStyle(protocol);
  const config = PROTOCOL_CONFIGS[protocol];
  
  // Use smooth step path for cleaner orthogonal lines
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const handleProtocolChange = useCallback((newProtocol: CommunicationProtocol, customLabel?: string) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? { 
              ...edge, 
              data: { 
                ...edge.data, 
                protocol: newProtocol, 
                label: customLabel 
              } 
            }
          : edge
      )
    );
  }, [id, setEdges]);

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={style.stroke}
        strokeWidth={selected ? style.strokeWidth + 1 : style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        className={selected ? 'opacity-100' : 'opacity-60'}
        style={{ transition: 'opacity 0.2s, stroke-width 0.2s' }}
      />
      <EdgeLabelRenderer>
        <EdgeProtocolEditor
          protocol={protocol}
          customLabel={data?.label}
          onProtocolChange={handleProtocolChange}
        >
          <div
            className="nodrag nopan absolute pointer-events-auto"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <Badge 
              variant="outline" 
              className="text-[9px] font-mono px-1.5 py-0 h-5 bg-background/95 backdrop-blur-sm cursor-pointer hover:bg-muted transition-colors border"
              style={{ borderColor: config?.color, color: config?.color }}
            >
              {data?.label || getProtocolLabel(protocol)}
            </Badge>
          </div>
        </EdgeProtocolEditor>
      </EdgeLabelRenderer>
    </>
  );
}

export const ProtocolEdge = memo(ProtocolEdgeComponent);
