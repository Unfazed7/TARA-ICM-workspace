/**
 * BoundaryReview.tsx — functional Stage 1 CP1 screen, wired to the live API.
 *
 * This is NOT the final canvas from the Claude Design brief. It exists so the
 * item-definition engine can be exercised end-to-end today: real fetch, real
 * mutations, real finalize gate. Swap the list-based layout below for the
 * React Flow canvas once those screens are implemented; the data layer
 * (useBoundary hook + api.boundary.*) does not need to change.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BoundaryState,
  BoundaryDecision,
  ScopeStatus,
  ModelElement,
} from '@/types/item-definition';
import { unresolvedIds, openConflicts, canFinalize } from '@/types/item-definition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Circle, Diamond } from 'lucide-react';

function useBoundary(assessmentId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['boundary', assessmentId];

  const query = useQuery({
    queryKey,
    queryFn: () => api.boundary.get(assessmentId),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const updateElement = useMutation({
    mutationFn: (args: { elementId: string; status: ScopeStatus; rationale: string }) =>
      api.boundary.updateElement(assessmentId, args.elementId, {
        status: args.status,
        rationale: args.rationale,
        actor: 'current_analyst', // TODO: pull from AuthContext once wired
      }),
    onSuccess: invalidate,
  });

  const resolveConflict = useMutation({
    mutationFn: (args: { conflictId: string; note: string }) =>
      api.boundary.resolveConflict(assessmentId, {
        conflict_id: args.conflictId,
        analyst_note: args.note,
        actor: 'current_analyst',
      }),
    onSuccess: invalidate,
  });

  const finalize = useMutation({
    mutationFn: () => api.boundary.finalize(assessmentId, 'current_analyst'),
    onSuccess: invalidate,
  });

  return { ...query, updateElement, resolveConflict, finalize };
}

const STATUS_LABEL: Record<ScopeStatus, string> = {
  in_scope: 'In scope',
  interface: 'Interface',
  out_of_scope: 'Out of scope',
  ambiguous: 'Ambiguous',
};

function elementLookup(state: BoundaryState): Map<string, ModelElement> {
  const map = new Map<string, ModelElement>();
  for (const el of state.merged_model?.elements ?? []) map.set(el.element_id, el);
  return map;
}

function DecisionRow({
  decision,
  element,
  onResolve,
}: {
  decision: BoundaryDecision;
  element: ModelElement | undefined;
  onResolve: (status: ScopeStatus, rationale: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rationale, setRationale] = useState('');
  const blocking = decision.status === 'ambiguous';

  return (
    <div
      className="aegis-ruled rounded-sm p-3 flex flex-col gap-2"
      style={
        blocking
          ? {
              borderColor: 'hsl(var(--aegis-decide))',
              background: 'hsl(var(--aegis-decide-fill))',
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {blocking ? (
            <Diamond className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--aegis-decide))' }} />
          ) : (
            <Circle className="h-3 w-3 shrink-0 fill-current opacity-30" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="aegis-id">{decision.element_id}</span>
              {element?.origin === 'derived' && (
                <span className="aegis-label" style={{ borderBottom: '1px dashed currentColor' }}>
                  derived
                </span>
              )}
              {decision.decided_by === 'analyst' && (
                <span className="aegis-label">analyst</span>
              )}
            </div>
            <div className="font-medium text-sm">{element?.name ?? decision.element_id}</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="aegis-mono shrink-0"
          style={
            blocking
              ? { borderColor: 'hsl(var(--aegis-decide))', color: 'hsl(var(--aegis-decide-text))' }
              : decision.status === 'interface'
              ? { borderColor: 'hsl(var(--aegis-interface))', color: 'hsl(var(--aegis-interface-text))' }
              : undefined
          }
        >
          {STATUS_LABEL[decision.status]}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{decision.rationale}</p>
      {decision.escalation_reason && (
        <p className="text-xs aegis-mono" style={{ color: 'hsl(var(--aegis-decide-text))' }}>
          escalation: {decision.escalation_reason}
        </p>
      )}

      {blocking && !editing && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Resolve
        </Button>
      )}

      {blocking && editing && (
        <div className="flex flex-col gap-2 pt-1">
          <Textarea
            placeholder="Rationale for this decision (required, min 5 chars)"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            className="text-xs aegis-mono min-h-16"
          />
          <div className="flex gap-2 flex-wrap">
            {(['in_scope', 'interface', 'out_of_scope'] as ScopeStatus[]).map((status) => (
              <Button
                key={status}
                size="sm"
                variant="secondary"
                disabled={rationale.trim().length < 5}
                onClick={() => {
                  onResolve(status, rationale);
                  setEditing(false);
                  setRationale('');
                }}
              >
                {STATUS_LABEL[status]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BoundaryReview({ assessmentId }: { assessmentId: string }) {
  const { data, isLoading, error, updateElement, resolveConflict, finalize } =
    useBoundary(assessmentId);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground aegis-mono">Loading boundary…</div>;
  }

  if (error || !data) {
    return (
      <Card className="aegis-ruled m-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            No boundary found
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Stage 1 hasn't produced a boundary proposal for this assessment yet.
          Run the pipeline, then seed it via{' '}
          <code className="aegis-mono">POST /boundary/seed</code>, or run{' '}
          <code className="aegis-mono">node scripts/demo-run.js --fixtures</code> to see this
          screen populated end to end.
        </CardContent>
      </Card>
    );
  }

  const lookup = elementLookup(data);
  const unresolved = unresolvedIds(data);
  const conflicts = openConflicts(data);
  const finalizable = canFinalize(data);
  const drawable = data.decisions.filter((d) => lookup.get(d.element_id));

  const byStatus = (status: ScopeStatus) => drawable.filter((d) => d.status === status);

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl">
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--aegis-rule)' }}>
        <div>
          <div className="aegis-label">
            Stage 1 · Item Definition · Boundary review
          </div>
          <h2 className="text-lg font-semibold mt-1">{data.boundary_id}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{data.boundary_statement}</p>
        </div>
        <div className="text-right shrink-0">
          {data.phase === 'final' ? (
            <Badge className="aegis-mono">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalized
            </Badge>
          ) : (
            <>
              <div className="text-sm aegis-mono">
                {unresolved.length} unresolved · {conflicts.length} open conflicts
              </div>
              <Button
                size="sm"
                className="mt-2"
                disabled={!finalizable || finalize.isPending}
                onClick={() => finalize.mutate()}
              >
                {finalize.isPending ? 'Finalizing…' : 'Finalize boundary'}
              </Button>
            </>
          )}
        </div>
      </div>

      {data.coverage && data.coverage.sources_absent.length > 0 && (
        <Card className="aegis-ruled">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs aegis-label">Coverage</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>
              Provided: <span className="aegis-mono">{data.coverage.sources_provided.join(', ') || '—'}</span>
            </div>
            <div>
              Absent: <span className="aegis-mono">{data.coverage.sources_absent.join(', ')}</span>
            </div>
            {data.coverage.consequences.map((c) => (
              <div key={c.absent_source}>{c.downstream_effect}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {conflicts.length > 0 && (
        <Card className="aegis-ruled" style={{ borderColor: 'hsl(var(--aegis-conflict))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs aegis-label" style={{ color: 'hsl(var(--aegis-conflict-text))' }}>
              Open conflicts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conflicts.map((c) => (
              <div key={c.conflict_id} className="text-xs space-y-1">
                <div className="aegis-mono">{c.conflict_id} · {c.type}</div>
                <div className="text-muted-foreground">{c.description}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    resolveConflict.mutate({
                      conflictId: c.conflict_id,
                      note: 'Reviewed and confirmed by analyst',
                    })
                  }
                >
                  Mark resolved
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(['in_scope', 'interface', 'ambiguous', 'out_of_scope'] as ScopeStatus[]).map((status) => {
        const rows = byStatus(status);
        if (rows.length === 0) return null;
        return (
          <div key={status} className="space-y-2">
            <div className="aegis-label">{STATUS_LABEL[status]} · {rows.length}</div>
            {rows.map((decision) => (
              <DecisionRow
                key={decision.element_id}
                decision={decision}
                element={lookup.get(decision.element_id)}
                onResolve={(newStatus, rationale) =>
                  updateElement.mutate({ elementId: decision.element_id, status: newStatus, rationale })
                }
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
