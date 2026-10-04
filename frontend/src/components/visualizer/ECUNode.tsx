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

// Layer is a structural attribute: a left rule in the cool palette (signal is reserved for risk).
const layerColors: Record<string, string> = {
  powertrain: 'border-l-primary',
  infotainment: 'border-l-foreground',
  chassis: 'border-l-muted-foreground',
  adas: 'border-l-primary/50',
  body: 'border-l-border',
};

const assetTagColors: Record<string, string> = {
  'PII Data': 'bg-destructive',
  'Safety Critical': 'bg-destructive',
  'Network Access': 'bg-foreground',
  'Crypto Keys': 'bg-primary',
};

function ECUNodeComponent({ data, selected }: NodeProps<ECUNodeData>) {
  const Icon = nodeIcons[data.nodeType] || Cpu;
  const colorClass = layerColors[data.layer || 'powertrain'];
  
  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded border border-l-4 border-foreground bg-background min-w-[140px] transition-colors",
        colorClass,
        // Fault Line: the selected (analysed) component sits on a block of signal colour.
        selected && "aegis-fault",
        data.isScanning && "animate-pulse",
        data.hasAISuggestion && ""
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
              {tag === 'PII Data' && <Eye className="w-2.5 h-2.5 text-primary-foreground" />}
              {tag === 'Safety Critical' && <Disc className="w-2.5 h-2.5 text-primary-foreground" />}
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
