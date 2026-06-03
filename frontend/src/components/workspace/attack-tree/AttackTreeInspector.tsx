import { Node } from 'reactflow';
import { Shield, GitFork, Target, Crosshair } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AttackTreeNodeData } from './attack-tree-types';

interface Props {
  selectedNode: Node<AttackTreeNodeData> | null;
  onUpdate: (id: string, data: Partial<AttackTreeNodeData>) => void;
}

export function AttackTreeInspector({ selectedNode, onUpdate }: Props) {
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 px-4 text-center gap-3">
        <Crosshair className="h-8 w-8 text-slate-600" />
        <p className="text-xs">Select a node to inspect its properties</p>
      </div>
    );
  }

  const data = selectedNode.data;
  const isLeaf = data.type === 'leaf';
  const isGate = data.type === 'and-gate' || data.type === 'or-gate';
  const isRoot = data.type === 'root';

  const typeConfig = {
    root: { icon: Target, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Threat Scenario' },
    'and-gate': { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'AND Gate' },
    'or-gate': { icon: GitFork, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'OR Gate' },
    leaf: { icon: Crosshair, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Attack Step' },
  };

  const config = typeConfig[data.type];
  const Icon = config.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={cn('px-4 py-3 border-b border-white/5 flex items-center gap-2', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', config.color)}>{config.label}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-slate-500">Label</Label>
          <Input
            value={data.label}
            onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
            className="h-8 text-xs bg-white/5 border-white/10"
            readOnly={isRoot}
          />
        </div>

        {/* Detail / Description */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-slate-500">Description</Label>
          <Textarea
            value={data.detail ?? ''}
            onChange={(e) => onUpdate(selectedNode.id, { detail: e.target.value })}
            className="text-xs bg-white/5 border-white/10 min-h-[60px] resize-none"
            placeholder="Optional description..."
          />
        </div>

        {/* Gate Type Toggle */}
        {isGate && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest text-slate-500">Gate Type</Label>
            <div className="flex gap-2">
              {(['and-gate', 'or-gate'] as const).map(gt => (
                <button
                  key={gt}
                  onClick={() => onUpdate(selectedNode.id, { type: gt, label: gt === 'and-gate' ? 'AND' : 'OR' })}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all',
                    data.type === gt
                      ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                      : 'border-white/10 bg-white/5 text-slate-500 hover:bg-white/10'
                  )}
                >
                  {gt === 'and-gate' ? (
                    <span className="flex items-center justify-center gap-1.5"><Shield className="h-3.5 w-3.5" /> AND</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5"><GitFork className="h-3.5 w-3.5" /> OR</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              {data.type === 'and-gate' ? 'ALL children must succeed (scores summed)' : 'ANY child can succeed (minimum score)'}
            </p>
          </div>
        )}

        {/* Difficulty Score */}
        {isLeaf && (
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-slate-500">Difficulty Score</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[data.difficulty ?? 1]}
                min={1}
                max={5}
                step={1}
                onValueChange={([v]) => onUpdate(selectedNode.id, { difficulty: v })}
                className="flex-1"
              />
              <span className="text-lg font-bold text-emerald-300 font-mono w-6 text-center">
                {data.difficulty ?? 1}
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 font-mono">
              <span>Easy (1)</span>
              <span>Hard (5)</span>
            </div>
            {/* Visual blocks */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => onUpdate(selectedNode.id, { difficulty: i })}
                  className={cn(
                    'flex-1 h-8 rounded-md text-xs font-bold transition-all',
                    i <= (data.difficulty ?? 0)
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-600 border border-white/10 hover:bg-white/10'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Node ID (read-only info) */}
        <div className="space-y-1.5 pt-3 border-t border-white/5">
          <Label className="text-[10px] uppercase tracking-widest text-slate-600">Node ID</Label>
          <p className="text-[10px] text-slate-600 font-mono">{selectedNode.id}</p>
        </div>
      </div>
    </div>
  );
}
