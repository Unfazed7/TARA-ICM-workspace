import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Shield, GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttackTreeNodeData } from './attack-tree-types';

/* ── Root Node (Threat Scenario) ── */
export const RootNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => (
  <div className={cn(
    'px-5 py-4 rounded-xl border-2 min-w-[220px] max-w-[300px] backdrop-blur-sm transition-all',
    'border-red-500/60 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    selected && 'ring-2 ring-red-400/50'
  )}>
    <div className="text-[9px] uppercase tracking-[0.2em] text-red-400/70 font-mono mb-1.5">Threat Scenario</div>
    <div className="text-sm font-semibold text-red-300 leading-snug">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300/30" />
  </div>
));
RootNode.displayName = 'RootNode';

/* ── Logic Gate Node (AND / OR) ── */
export const GateNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => {
  const isAnd = data.type === 'and-gate';
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[140px] backdrop-blur-sm transition-all text-center',
      'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      selected && 'ring-2 ring-blue-400/50'
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300/30" />
      <div className="flex items-center justify-center gap-2">
        {isAnd ? (
          <Shield className="h-5 w-5 text-blue-400" />
        ) : (
          <GitFork className="h-5 w-5 text-blue-400" />
        )}
        <span className="text-xs font-bold text-blue-300 tracking-wider uppercase">
          {isAnd ? 'AND' : 'OR'}
        </span>
      </div>
      {data.detail && (
        <div className="text-[10px] text-blue-400/60 mt-1">{data.detail}</div>
      )}
      {data.calculatedScore !== undefined && (
        <div className="text-[10px] text-blue-300/80 font-mono mt-1.5 border-t border-blue-500/20 pt-1">
          Score: {data.calculatedScore}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300/30" />
    </div>
  );
});
GateNode.displayName = 'GateNode';

/* ── Leaf Node (Attack Step) ── */
export const LeafNode = memo(({ data, selected }: NodeProps<AttackTreeNodeData>) => (
  <div className={cn(
    'px-4 py-3 rounded-lg border-2 min-w-[160px] max-w-[220px] backdrop-blur-sm transition-all',
    'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
    selected && 'ring-2 ring-emerald-400/50'
  )}>
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300/30" />
    <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 font-mono mb-1">Attack Step</div>
    <div className="text-xs font-medium text-emerald-300 leading-snug">{data.label}</div>
    {data.detail && (
      <div className="text-[10px] text-emerald-400/50 mt-1 line-clamp-2">{data.detail}</div>
    )}
    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-emerald-500/20">
      <span className="text-[9px] text-emerald-400/60 font-mono">DIFFICULTY</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-sm transition-colors',
              i <= (data.difficulty ?? 0)
                ? 'bg-emerald-400'
                : 'bg-emerald-500/20'
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-emerald-300 font-mono font-bold ml-auto">{data.difficulty ?? '?'}</span>
    </div>
  </div>
));
LeafNode.displayName = 'LeafNode';

export const attackTreeNodeTypes = {
  attackTreeRoot: RootNode,
  attackTreeGate: GateNode,
  attackTreeLeaf: LeafNode,
};
