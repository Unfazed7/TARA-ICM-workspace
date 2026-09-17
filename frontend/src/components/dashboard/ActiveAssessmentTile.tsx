import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types/tara';
import { Button } from '@/components/ui/button';
import { Play, Car, Zap, Truck, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActiveAssessmentTileProps {
  project: Project | null;
  recentProjects?: Project[];
  allProjects?: Project[];
}

const vehicleIcons: Record<string, React.ElementType> = {
  sedan: Car,
  suv: Car,
  truck: Truck,
  electric: Zap,
  commercial: Truck,
  motorcycle: Car,
  other: Car,
};

export function ActiveAssessmentTile({ project, recentProjects = [], allProjects = [] }: ActiveAssessmentTileProps) {
  const navigate = useNavigate();

  // Combine all projects for scrolling — use allProjects if provided, else fallback
  const scrollableProjects = allProjects.length > 0
    ? [...allProjects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : project
      ? [project, ...recentProjects]
      : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentProject = scrollableProjects[currentIndex] || null;
  const totalProjects = scrollableProjects.length;

  const completion = currentProject?.completionPercentage ?? 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (completion / 100) * circumference;
  const VehicleIcon = currentProject ? (vehicleIcons[currentProject.vehicleType] || Car) : Car;

  const goNext = () => {
    if (currentIndex < totalProjects - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div
      className={cn(
        'bento-tile relative overflow-hidden',
        'col-span-1 md:col-span-2 lg:col-span-3 lg:row-span-2',
        'flex flex-col p-6',
        'shadow-[inset_0_0_20px_hsl(217_91%_60%/0.1)]'
      )}
    >
      {/* Aurora gradient background */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(230_70%_55%/0.1)] via-[hsl(222_47%_8%/0.8)] to-[hsl(222_47%_8%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(217_91%_60%/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,hsl(199_89%_55%/0.08),transparent_50%)]" />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header with navigation arrows */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Project Command Center
          </p>
          {totalProjects > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className={cn(
                  'w-7 h-7 rounded-lg border border-border/30 flex items-center justify-center transition-all',
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-primary/10 hover:border-primary/40 cursor-pointer'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-muted-foreground px-1.5 min-w-[3rem] text-center">
                {currentIndex + 1} / {totalProjects}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex === totalProjects - 1}
                className={cn(
                  'w-7 h-7 rounded-lg border border-border/30 flex items-center justify-center transition-all',
                  currentIndex === totalProjects - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-primary/10 hover:border-primary/40 cursor-pointer'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-1">
          {/* Left: Project info */}
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-foreground">
              {currentProject?.name || 'No Active Project'}
            </h3>
            {currentProject && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <VehicleIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex gap-1.5 flex-wrap">
                    {currentProject.domains.slice(0, 3).map((d) => (
                      <span
                        key={d}
                        className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-border/30 bg-card/30 text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
                  Last edited {formatDistanceToNow(new Date(currentProject.updatedAt), { addSuffix: true })}
                </p>
                <Button
                  onClick={() => navigate(`/project/${currentProject.id}`)}
                  className="group rounded-full px-6 gap-2 shadow-[0_0_20px_hsl(217_91%_60%/0.3)] mt-3 w-fit"
                >
                  <Play className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  Resume
                </Button>
              </>
            )}
          </div>

          {/* Right: Progress ring */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                  <stop offset="100%" stopColor="hsl(199 89% 55%)" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(217 33% 20%)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="url(#progressGrad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono text-foreground">{completion}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative z-10 border-t border-border/20 my-3" />

      {/* Dot pagination + Recent History */}
      <div className="relative z-10">
        {/* Dot pagination */}
        {totalProjects > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {scrollableProjects.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                  idx === currentIndex
                    ? 'w-4 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>
        )}

        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Recent History
        </p>
        {recentProjects.length > 0 ? (
          <div className="space-y-1">
            {recentProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/project/${p.id}`)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-card/40 transition-colors group/row"
              >
                <span className="text-sm text-foreground truncate max-w-[60%]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-hover/row:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => navigate('/projects/new')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card/40 transition-colors text-muted-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-sm">Create your first project</span>
          </button>
        )}
      </div>
    </div>
  );
}
