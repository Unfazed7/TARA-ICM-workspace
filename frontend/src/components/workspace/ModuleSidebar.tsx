import { useState } from 'react';
import { Boxes, ChevronLeft, ChevronRight, FileCheck2, GitBranch, ListChecks, Scale, Shield } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type WorkflowStep = 'scope' | 'item-definition' | 'assets-damage' | 'threat-analysis' | 'risk-treatment' | 'review-publish';

const modules: { id: WorkflowStep; step: number; label: string; icon: React.ElementType }[] = [
  { id: 'scope', step: 1, label: 'Define scope', icon: ListChecks },
  { id: 'item-definition', step: 2, label: 'Item definition', icon: Boxes },
  { id: 'assets-damage', step: 3, label: 'Assets & damage', icon: Shield },
  { id: 'threat-analysis', step: 4, label: 'Threat analysis', icon: GitBranch },
  { id: 'risk-treatment', step: 5, label: 'Risk & treatment', icon: Scale },
  { id: 'review-publish', step: 6, label: 'Review & publish', icon: FileCheck2 },
];

interface ModuleSidebarProps {
  activeModule: WorkflowStep;
  onModuleChange: (module: WorkflowStep) => void;
}

export function ModuleSidebar({ activeModule, onModuleChange }: ModuleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'relative hidden h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Logo / Brand Area */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="w-8 h-8 rounded border bg-background flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        {!collapsed && <span className="truncate text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap">
            AutoTARA
        </span>}
      </div>

      {/* Tech Separator — fades at both ends */}
      <div className="px-3 mb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const active = activeModule === mod.id;

          const button = (
            <button
              key={mod.id}
              onClick={() => onModuleChange(mod.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-md transition-all duration-200 min-h-[40px] w-full',
                collapsed ? 'justify-center px-2' : 'px-3',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {/* Active laser line */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-foreground" />
              )}

              {!collapsed && <span className="w-5 shrink-0 text-center text-xs font-mono" aria-hidden="true">{mod.step}</span>}
              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                  active
                    ? 'text-foreground'
                    : 'group-hover:text-foreground'
                )}
              />
              {!collapsed && <span className="truncate text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap">
                  {mod.label}
              </span>}
            </button>
          );

          return (
            <Tooltip key={mod.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" className="text-[10px] tracking-widest uppercase z-[10000]">
                {mod.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand workflow navigation' : 'Collapse workflow navigation'}
          aria-expanded={!collapsed}
          className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
    </aside>
  );
}
