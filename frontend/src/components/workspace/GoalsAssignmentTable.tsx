import { useState } from 'react';
import { CALLevel, CybersecurityGoal } from '@/types/tara';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalsAssignmentTableProps {
  lockedCAL: CALLevel | null;
}

let nextId = 4;

const initialGoals: CybersecurityGoal[] = [
  { id: 'CG-01', description: 'Prevent unauthorized ECU firmware modification', allocatedCAL: null, rationale: '' },
  { id: 'CG-02', description: 'Ensure integrity of diagnostic communications', allocatedCAL: null, rationale: '' },
  { id: 'CG-03', description: 'Protect V2X message authenticity', allocatedCAL: null, rationale: '' },
];

export function GoalsAssignmentTable({ lockedCAL }: GoalsAssignmentTableProps) {
  const [goals, setGoals] = useState<CybersecurityGoal[]>(initialGoals);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === goals.length ? new Set() : new Set(goals.map((g) => g.id))));
  };

  const updateGoal = (id: string, patch: Partial<CybersecurityGoal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addGoal = () => {
    const num = String(nextId++).padStart(2, '0');
    setGoals((prev) => [...prev, { id: `CG-${num}`, description: '', allocatedCAL: null, rationale: '' }]);
  };

  const removeSelected = () => {
    setGoals((prev) => prev.filter((g) => !selected.has(g.id)));
    setSelected(new Set());
  };

  const bulkApply = () => {
    if (!lockedCAL) return;
    setGoals((prev) => prev.map((g) => (selected.has(g.id) ? { ...g, allocatedCAL: lockedCAL } : g)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={addGoal} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </Button>
        {selected.size > 0 && (
          <>
            <Button variant="ghost" size="sm" onClick={removeSelected} className="gap-1.5 text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Remove ({selected.size})
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={bulkApply}
              disabled={!lockedCAL}
              className="gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Apply CAL {lockedCAL ?? '?'} to Selected
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border/20 bg-card/10 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/20">
              <th className="p-2 w-8">
                <Checkbox checked={selected.size === goals.length && goals.length > 0} onCheckedChange={toggleAll} />
              </th>
              <th className="p-2 text-left text-xs text-muted-foreground font-medium w-20">Goal ID</th>
              <th className="p-2 text-left text-xs text-muted-foreground font-medium">Description</th>
              <th className="p-2 text-left text-xs text-muted-foreground font-medium w-24">CAL</th>
              <th className="p-2 text-left text-xs text-muted-foreground font-medium">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr
                key={goal.id}
                className={cn(
                  'border-b border-border/10 transition-colors',
                  selected.has(goal.id) && 'bg-primary/5'
                )}
              >
                <td className="p-2">
                  <Checkbox checked={selected.has(goal.id)} onCheckedChange={() => toggleSelect(goal.id)} />
                </td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{goal.id}</td>
                <td className="p-2">
                  <Input
                    value={goal.description}
                    onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
                    className="h-8 text-xs bg-transparent border-border/20"
                    placeholder="Enter goal description..."
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={goal.allocatedCAL?.toString() ?? ''}
                    onValueChange={(v) => updateGoal(goal.id, { allocatedCAL: Number(v) as CALLevel })}
                  >
                    <SelectTrigger className="h-8 w-20 text-xs bg-transparent border-border/20">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((v) => (
                        <SelectItem key={v} value={v.toString()}>CAL {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Input
                    value={goal.rationale}
                    onChange={(e) => updateGoal(goal.id, { rationale: e.target.value })}
                    className="h-8 text-xs bg-transparent border-border/20"
                    placeholder="Enter rationale..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
