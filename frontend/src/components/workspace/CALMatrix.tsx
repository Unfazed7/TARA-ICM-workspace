import { cn } from '@/lib/utils';
import { CALLevel, ImpactLevel, AttackVector } from '@/types/tara';

const impacts: ImpactLevel[] = ['severe', 'major', 'moderate', 'negligible'];
const vectors: AttackVector[] = ['network', 'adjacent', 'local', 'physical'];

const calMap: Record<ImpactLevel, Record<AttackVector, CALLevel>> = {
  severe:     { network: 4, adjacent: 4, local: 3, physical: 2 },
  major:      { network: 3, adjacent: 3, local: 2, physical: 1 },
  moderate:   { network: 2, adjacent: 2, local: 1, physical: 1 },
  negligible: { network: 1, adjacent: 1, local: 1, physical: 1 },
};

const calColors: Record<CALLevel, { bg: string; border: string; ring: string }> = {
  4: { bg: 'bg-red-500/20', border: 'border-red-500/40', ring: 'ring-red-500' },
  3: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', ring: 'ring-orange-500' },
  2: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', ring: 'ring-yellow-500' },
  1: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', ring: 'ring-blue-500' },
};

interface CALMatrixProps {
  selectedCell: { impact: ImpactLevel; vector: AttackVector } | null;
  onCellSelect: (impact: ImpactLevel, vector: AttackVector, cal: CALLevel) => void;
}

export function CALMatrix({ selectedCell, onCellSelect }: CALMatrixProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-xs text-muted-foreground font-medium text-left">Impact ↓ / Vector →</th>
            {vectors.map((v) => (
              <th key={v} className="p-2 text-xs text-muted-foreground font-medium capitalize text-center">{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {impacts.map((impact) => (
            <tr key={impact}>
              <td className="p-2 text-xs font-medium capitalize text-muted-foreground">{impact}</td>
              {vectors.map((vector) => {
                const cal = calMap[impact][vector];
                const colors = calColors[cal];
                const isSelected = selectedCell?.impact === impact && selectedCell?.vector === vector;
                return (
                  <td key={vector} className="p-1">
                    <button
                      onClick={() => onCellSelect(impact, vector, cal)}
                      className={cn(
                        'w-full h-14 rounded-md border text-sm font-semibold transition-all',
                        colors.bg, colors.border,
                        isSelected && `ring-2 ${colors.ring} scale-105`,
                        !isSelected && 'hover:scale-102 hover:brightness-125'
                      )}
                    >
                      CAL {cal}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
