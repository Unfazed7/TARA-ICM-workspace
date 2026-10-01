import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { CommunicationProtocol, PROTOCOL_CONFIGS } from '@/types/communication-protocols';

export interface BusNodeData {
  label: string;
  busType: CommunicationProtocol;
  orientation?: 'horizontal' | 'vertical';
}

const busColors: Record<string, string> = {
  'can': 'bg-chart-1/20 border-chart-1',
  'can-fd': 'bg-chart-1/30 border-chart-1',
  'lin': 'bg-muted border-muted-foreground',
  'ethernet': 'bg-blue-500/20 border-blue-500',
  'flexray': 'bg-purple-500/20 border-purple-500',
  'most': 'bg-pink-500/20 border-pink-500',
};

function BusNodeComponent({ data, selected }: NodeProps<BusNodeData>) {
  const isVertical = data.orientation === 'vertical';
  const config = PROTOCOL_CONFIGS[data.busType];
  const colorClass = busColors[data.busType] || 'bg-muted/30 border-muted-foreground';
  
  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all duration-200",
        isVertical ? "w-12 min-h-[200px]" : "h-12 min-w-[300px]",
        "rounded-md border-2",
        colorClass,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Multiple connection handles along the bus */}
      {isVertical ? (
        <>
          {/* Left side handles */}
          <Handle
            type="target"
            position={Position.Left}
            id="left-1"
            style={{ top: '20%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-2"
            style={{ top: '40%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-3"
            style={{ top: '60%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-4"
            style={{ top: '80%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          {/* Right side handles */}
          <Handle
            type="source"
            position={Position.Right}
            id="right-1"
            style={{ top: '20%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-2"
            style={{ top: '40%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-3"
            style={{ top: '60%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-4"
            style={{ top: '80%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
        </>
      ) : (
        <>
          {/* Top handles */}
          <Handle
            type="target"
            position={Position.Top}
            id="top-1"
            style={{ left: '15%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-2"
            style={{ left: '35%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-3"
            style={{ left: '55%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-4"
            style={{ left: '75%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-5"
            style={{ left: '90%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          {/* Bottom handles */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-1"
            style={{ left: '15%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-2"
            style={{ left: '35%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-3"
            style={{ left: '55%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-4"
            style={{ left: '75%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-5"
            style={{ left: '90%' }}
            className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
          />
        </>
      )}

      {/* Bus label */}
      <div 
        className={cn(
          "absolute text-xs font-mono font-semibold px-2 py-1 rounded bg-background/90 whitespace-nowrap",
          isVertical ? "-rotate-90" : ""
        )}
        style={{ color: config?.color }}
      >
        {data.label}
      </div>

      {/* Bus line decoration */}
      <div 
        className={cn(
          "absolute",
          isVertical 
            ? "w-1 h-[calc(100%-16px)] left-1/2 -translate-x-1/2" 
            : "h-1 w-[calc(100%-16px)] top-1/2 -translate-y-1/2"
        )}
        style={{ backgroundColor: config?.color }}
      />
    </div>
  );
}

export const BusNode = memo(BusNodeComponent);
