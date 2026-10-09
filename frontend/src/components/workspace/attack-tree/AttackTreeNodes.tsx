import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Shield, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttackTreeNodeData } from './attack-tree-types';

/* ── Root Node (Threat Scenario) ── */
export const RootNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => (
  <div className={cn(
    // Fault Line: the target under attack sits on a block of signal colour.
    'aegis-fault px-4 py-3 rounded min-w-[220px] max-w-[300px] text-foreground',
    selected && 'outline outline-2 outline-offset-4 outline-primary/40'
  )}>
    <div className="aegis-label mb-1">Threat scenario</div>
    <div className="text-sm font-semibold leading-snug">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !rounded-sm !bg-primary !border-0" />
  </div>
));
RootNode.displayName = 'RootNode';

/* ── Logic Gate Node (AND / OR) ── */
export const GateNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => {
  const isAnd = data.type === 'and-gate';
  return (
    <div className={cn(
      'px-4 py-2.5 rounded border border-primary min-w-[140px] bg-primary-soft text-center transition-colors',
      selected && 'ring-2 ring-primary/40'
    )}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !rounded-sm !bg-primary !border-0" />
      <div className="flex items-center justify-center gap-2">
        {isAnd ? (
          <Shield className="h-5 w-5 text-primary" />
        ) : (
          <GitFork className="h-5 w-5 text-primary" />
        )}
        <span className="text-xs font-bold text-primary tracking-wider uppercase">
          {isAnd ? 'AND' : 'OR'}
        </span>
      </div>
      {data.detail && (
        <div className="text-[10px] text-muted-foreground mt-1">{data.detail}</div>
      )}
      {data.calculatedScore !== undefined && (
        <div className="text-[10px] text-muted-foreground font-mono mt-1.5 border-t border-primary/20 pt-1">
          Score: {data.calculatedScore}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !rounded-sm !bg-primary !border-0" />
    </div>
  );
});
GateNode.displayName = 'GateNode';

/* ── Leaf Node (Attack Step) ── */
export const LeafNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => (
  <div className={cn(
    'px-3 py-2.5 rounded border border-foreground min-w-[160px] max-w-[220px] bg-background transition-colors',
    selected && 'ring-2 ring-primary/40'
  )}>
    <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !rounded-sm !bg-primary !border-0" />
    <div className="aegis-label mb-1">Attack step</div>
    <div className="text-xs font-medium text-foreground leading-snug">{data.label}</div>
    {data.detail && (
      <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{data.detail}</div>
    )}
    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
      <span className="aegis-label !text-[9px]">Difficulty</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-sm transition-colors',
              i <= (data.difficulty ?? 0)
                ? 'bg-primary'
                : 'bg-primary/20'
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-primary font-mono font-bold ml-auto">{data.difficulty ?? '?'}</span>
    </div>
  </div>
));
LeafNode.displayName = 'LeafNode';

export const attackTreeNodeTypes = {
  attackTreeRoot: RootNode,
  attackTreeGate: GateNode,
  attackTreeLeaf: LeafNode,
};
