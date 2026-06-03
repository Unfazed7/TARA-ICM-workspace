import { useState, useCallback } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Assumption {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'accepted' | 'rejected' | 'under-review';
  rationale: string;
}


const statusColors: Record<Assumption['status'], string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  'under-review': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const emptyAssumption = (): Assumption => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  status: 'draft',
  rationale: '',
});

export function AssumptionScope() {
  const [assumptions, setAssumptions] = useState<Assumption[]>([
    {
      id: '1',
      title: 'Vehicle operates on public roads only',
      description: 'The vehicle is assumed to operate exclusively on public road infrastructure.',
      status: 'accepted',
      rationale: 'Standard operating environment for passenger vehicles.',
    },
    {
      id: '2',
      title: 'OEM firmware update channel is trusted',
      description: 'OTA firmware updates are delivered through a secure, authenticated OEM channel.',
      status: 'accepted',
      rationale: 'OEM infrastructure meets ISO 21434 secure update requirements.',
    },
  ]);

  const handleAdd = useCallback(() => {
    setAssumptions((prev) => [...prev, emptyAssumption()]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setAssumptions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleChange = useCallback(
    <K extends keyof Assumption>(id: string, field: K, value: Assumption[K]) => {
      setAssumptions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Assumption &amp; Scope</h2>
            <p className="text-xs text-muted-foreground">
              Document assumptions and scope boundaries for the analysis
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          Add Assumption
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="min-w-[180px]">Title</TableHead>
                <TableHead className="min-w-[240px]">Description</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="min-w-[200px]">Rationale</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assumptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No assumptions added yet. Click "Add Assumption" to begin.
                  </TableCell>
                </TableRow>
              )}
              {assumptions.map((a, idx) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={a.title}
                      onChange={(e) => handleChange(a.id, 'title', e.target.value)}
                      placeholder="Assumption title…"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={a.description}
                      onChange={(e) => handleChange(a.id, 'description', e.target.value)}
                      placeholder="Describe the assumption…"
                      className="min-h-[60px] text-xs resize-y"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={a.status}
                      onValueChange={(v) => handleChange(a.id, 'status', v as Assumption['status'])}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="under-review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className={`mt-1 text-[10px] ${statusColors[a.status]}`}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={a.rationale}
                      onChange={(e) => handleChange(a.id, 'rationale', e.target.value)}
                      placeholder="Justification…"
                      className="min-h-[60px] text-xs resize-y"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(a.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
