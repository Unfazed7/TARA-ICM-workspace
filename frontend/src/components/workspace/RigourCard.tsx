import { CALLevel } from '@/types/tara';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Shield, ShieldQuestion } from 'lucide-react';

const rigourData: Record<CALLevel, { title: string; description: string; icon: React.ElementType; color: string }> = {
  4: {
    title: 'CAL 4 — Maximum Rigour',
    description: 'Requires Penetration Testing (High Expertise) and Independent Assessment',
    icon: ShieldAlert,
    color: 'border-red-500/40 bg-red-500/10 text-red-400',
  },
  3: {
    title: 'CAL 3 — High Rigour',
    description: 'Requires Vulnerability Analysis and Requirements-Based Testing',
    icon: ShieldCheck,
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  },
  2: {
    title: 'CAL 2 — Moderate Rigour',
    description: 'Requires Interface Testing and Integration Verification',
    icon: Shield,
    color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  },
  1: {
    title: 'CAL 1 — Basic Rigour',
    description: 'Requires Functional Testing',
    icon: ShieldQuestion,
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  },
};

interface RigourCardProps {
  cal: CALLevel | null;
}

export function RigourCard({ cal }: RigourCardProps) {
  if (!cal) {
    return (
      <div className="rounded-lg border border-border/30 bg-card/20 backdrop-blur-sm p-4 text-center text-sm text-muted-foreground">
        Select a cell in the matrix to see rigour requirements
      </div>
    );
  }

  const data = rigourData[cal];
  const Icon = data.icon;

  return (
    <div className={cn('rounded-lg border backdrop-blur-sm p-4 flex items-start gap-3 transition-all', data.color)}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{data.title}</p>
        <p className="text-xs mt-1 opacity-80">{data.description}</p>
      </div>
    </div>
  );
}
