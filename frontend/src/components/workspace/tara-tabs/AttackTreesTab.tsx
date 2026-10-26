import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitBranch, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTara } from '@/contexts/TaraContext';
import { AttackTreeDesigner } from '@/components/workspace/attack-tree/AttackTreeDesigner';

function TreeState({
  kind,
  title,
  message,
}: {
  kind: 'loading' | 'failed' | 'empty';
  title: string;
  message: string;
}) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'failed' ? AlertTriangle : GitBranch;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center" role={kind === 'loading' ? 'status' : undefined}>
      <div className={kind === 'failed' ? 'rounded-full bg-destructive/10 p-3 text-destructive' : 'rounded-full bg-primary/10 p-3 text-primary'}>
        <Icon className={kind === 'loading' ? 'size-7 animate-spin' : 'size-7'} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function AttackTreesTab() {
  const { attackPaths, threats, stageStatuses } = useTara();
  const status = stageStatuses['06'] ?? 'not_started';
  const [selectedAttackId, setSelectedAttackId] = useState('');

  useEffect(() => {
    if (!attackPaths.some((path) => path.id === selectedAttackId)) {
      setSelectedAttackId(attackPaths[0]?.id ?? '');
    }
  }, [attackPaths, selectedAttackId]);

  const selectedPath = useMemo(
    () => attackPaths.find((path) => path.id === selectedAttackId) ?? attackPaths[0],
    [attackPaths, selectedAttackId],
  );
  const threatById = useMemo(
    () => new Map(threats.map((threat) => [threat.threatId, threat])),
    [threats],
  );

  if (status === 'pending' || status === 'running') {
    return <TreeState kind="loading" title="Generating attack paths…" message="The tree will be built from the five generated steps as soon as Stage 6 completes." />;
  }
  if (status === 'failed') {
    return <TreeState kind="failed" title="Attack Path Modelling failed" message="No tree from the failed attempt is being shown. Review the Stage 6 run log and rerun the stage." />;
  }
  if (status === 'cancelled') {
    return <TreeState kind="empty" title="Stage 6 was cancelled" message="Rerun Attack Path Modelling to generate attack trees." />;
  }
  if (status !== 'complete') {
    return <TreeState kind="empty" title="No generated attack trees yet" message="Run Stage 6 — Attack Path Modelling. Each generated five-step attack path will appear here as a selectable tree." />;
  }
  if (!selectedPath) {
    return <TreeState kind="empty" title="Stage 6 returned no attack paths" message="The stage is marked complete, but attack-paths.json contains no records." />;
  }

  const selectedThreat = threatById.get(selectedPath.linkedThreatId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <label htmlFor="attack-tree-selector" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Generated tree
        </label>
        <select
          id="attack-tree-selector"
          value={selectedPath.id}
          onChange={(event) => setSelectedAttackId(event.target.value)}
          className="h-9 min-w-0 max-w-xl flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          {attackPaths.map((path) => {
            const threat = threatById.get(path.linkedThreatId);
            return (
              <option key={path.id} value={path.id}>
                {path.id} / {path.linkedThreatId}{threat?.scenario ? ` — ${threat.scenario.slice(0, 90)}` : ''}
              </option>
            );
          })}
        </select>
        <Badge variant="secondary">{attackPaths.length} trees</Badge>
      </div>

      <div className="min-h-0 flex-1">
        <AttackTreeDesigner
          key={selectedPath.id}
          attackPath={selectedPath}
          threatLabel={selectedThreat?.scenario}
        />
      </div>
    </div>
  );
}
