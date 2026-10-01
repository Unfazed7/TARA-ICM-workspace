import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ThreatScenario, calculateMaxImpact, calculateFeasibility, getRiskColor } from '@/types/risk-assessment';

interface RiskMatrixProps {
  scenarios: ThreatScenario[];
  highlightedId?: string | null;
  className?: string;
}

const MATRIX_SIZE = 5;

const matrixColors = [
  ['bg-sage/30', 'bg-sage/30', 'bg-dusty-amber/30', 'bg-dusty-amber/50', 'bg-destructive/30'],
  ['bg-sage/30', 'bg-dusty-amber/30', 'bg-dusty-amber/50', 'bg-destructive/30', 'bg-destructive/50'],
  ['bg-dusty-amber/30', 'bg-dusty-amber/50', 'bg-dusty-amber/70', 'bg-destructive/50', 'bg-destructive/70'],
  ['bg-dusty-amber/50', 'bg-dusty-amber/70', 'bg-destructive/50', 'bg-destructive/70', 'bg-destructive/90'],
  ['bg-dusty-amber/70', 'bg-destructive/50', 'bg-destructive/70', 'bg-destructive/90', 'bg-destructive'],
];

export const RiskMatrix = memo(function RiskMatrix({ scenarios, highlightedId, className }: RiskMatrixProps) {
  const positions = useMemo(() => {
    return scenarios.map(scenario => ({
      id: scenario.id,
      impact: calculateMaxImpact(scenario),
      feasibility: calculateFeasibility(scenario.feasibilityFactors),
      color: getRiskColor(scenario.riskValue),
      isHighlighted: scenario.id === highlightedId
    }));
  }, [scenarios, highlightedId]);

  // Group scenarios by cell
  const cellPositions = useMemo(() => {
    const cells: Record<string, typeof positions> = {};
    positions.forEach(pos => {
      const key = `${pos.impact}-${pos.feasibility}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push(pos);
    });
    return cells;
  }, [positions]);

  return (
    <div className={cn("glass-effect rounded-lg p-4", className)}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Risk Matrix (5×5)
      </h3>
      
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
          Impact →
        </div>
        
        {/* X-axis label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5 text-[10px] text-muted-foreground font-medium">
          Feasibility →
        </div>
        
        {/* Matrix Grid */}
        <div className="ml-4 grid grid-cols-5 gap-0.5" style={{ width: '160px', height: '160px' }}>
          {Array.from({ length: MATRIX_SIZE * MATRIX_SIZE }).map((_, index) => {
            const row = Math.floor(index / MATRIX_SIZE);
            const col = index % MATRIX_SIZE;
            const impact = MATRIX_SIZE - row; // 5 at top, 1 at bottom
            const feasibility = col + 1; // 1 at left, 5 at right
            const cellKey = `${impact}-${feasibility}`;
            const cellDots = cellPositions[cellKey] || [];
            
            return (
              <div
                key={index}
                className={cn(
                  "relative flex items-center justify-center rounded-sm transition-all duration-300",
                  matrixColors[row][col]
                )}
              >
                {/* Dots for scenarios in this cell */}
                {cellDots.slice(0, 4).map((dot, i) => (
                  <div
                    key={dot.id}
                    className={cn(
                      "absolute w-2.5 h-2.5 rounded-full border transition-all duration-500",
                      dot.isHighlighted 
                        ? "scale-150 ring-2 ring-primary shadow-lg z-10" 
                        : "scale-100 opacity-80"
                    )}
                    style={{
                      backgroundColor: dot.color,
                      borderColor: 'hsl(var(--background))',
                      top: `${25 + (Math.floor(i / 2) * 50)}%`,
                      left: `${25 + ((i % 2) * 50)}%`,
                      transform: `translate(-50%, -50%) ${dot.isHighlighted ? 'scale(1.5)' : ''}`,
                    }}
                    title={dot.id}
                  />
                ))}
                {cellDots.length > 4 && (
                  <span className="absolute text-[8px] font-medium text-foreground/80 bottom-0 right-0.5">
                    +{cellDots.length - 4}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Axis numbers */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-around text-[9px] text-muted-foreground w-3">
          {[5, 4, 3, 2, 1].map(n => (
            <span key={n} className="text-center">{n}</span>
          ))}
        </div>
        <div className="ml-4 mt-1 flex justify-around text-[9px] text-muted-foreground" style={{ width: '160px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-sage" />
          <span className="text-muted-foreground">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-dusty-amber" />
          <span className="text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
});
