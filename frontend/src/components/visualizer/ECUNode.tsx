import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cpu, Router, Radio, CircuitBoard, Eye, Disc } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface ECUNodeData {
  label: string;
  nodeType: 'ecu' | 'gateway' | 'sensor' | 'actuator';
  layer?: 'powertrain' | 'infotainment' | 'chassis' | 'adas' | 'body';
  assetTags?: string[];
  isScanning?: boolean;
  hasAISuggestion?: boolean;
}

const nodeIcons = {
  ecu: Cpu,
  gateway: Router,
  sensor: Radio,
  actuator: CircuitBoard,
};

const layerColors: Record<string, string> = {
  powertrain: 'border-primary bg-primary/10',
  infotainment: 'border-chart-4 bg-chart-4/10',
  chassis: 'border-amber bg-amber/10',
  adas: 'border-chart-3 bg-chart-3/10',
  body: 'border-chart-5 bg-chart-5/10',
};

const assetTagColors: Record<string, string> = {
  'PII Data': 'bg-destructive/80',
  'Safety Critical': 'bg-amber/80',
  'Network Access': 'bg-chart-4/80',
  'Crypto Keys': 'bg-primary/80',
};

function ECUNodeComponent({ data, selected }: NodeProps<ECUNodeData>) {
  const Icon = nodeIcons[data.nodeType] || Cpu;
  const colorClass = layerColors[data.layer || 'powertrain'];
  
  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg border-2 min-w-[140px] transition-all duration-200",
        colorClass,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        data.isScanning && "animate-pulse",
        data.hasAISuggestion && "shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
      )}
    >
      {/* Asset Tags */}
      {data.assetTags && data.assetTags.length > 0 && (
        <div className="absolute -top-2 -right-2 flex gap-0.5">
          {data.assetTags.slice(0, 2).map((tag, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center",
                assetTagColors[tag] || 'bg-muted'
              )}
              title={tag}
            >
              {tag === 'PII Data' && <Eye className="w-2.5 h-2.5 text-white" />}
              {tag === 'Safety Critical' && <Disc className="w-2.5 h-2.5 text-white" />}
            </div>
          ))}
        </div>
      )}

      {/* AI Suggestion Glow Indicator */}
      {data.hasAISuggestion && (
        <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-primary animate-ping" />
      )}
      
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      <div className="flex flex-col items-center gap-2">
        <div className="p-2 rounded-md bg-background/50">
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium text-center">{data.label}</span>
        {data.layer && (
          <Badge variant="outline" className="text-xs capitalize font-normal">
            {data.layer}
          </Badge>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
}

export const ECUNode = memo(ECUNodeComponent);
