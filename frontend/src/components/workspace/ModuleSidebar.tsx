import { useState } from 'react';
import { Box, Search, Shield, ShieldCheck, ChevronsLeft, ChevronsRight, ClipboardList } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ModuleType } from '@/types/tara';

const modules: { id: ModuleType; label: string; icon: React.ElementType }[] = [
  { id: 'feature-analysis', label: 'Feature Analysis', icon: Search },
  { id: 'assumption-scope', label: 'Assumption Scope', icon: ClipboardList },
  { id: 'item-definition', label: 'Item Definition', icon: Box },
  { id: 'tara', label: 'TARA', icon: Shield },
  { id: 'cal-determination', label: 'CAL', icon: ShieldCheck },
];

interface ModuleSidebarProps {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

export function ModuleSidebar({ activeModule, onModuleChange }: ModuleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'shrink-0 flex flex-col h-full bg-muted border-r border-border transition-all duration-300 overflow-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand Area */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        {!collapsed && (
          <span className="aegis-wordmark text-[13px] text-foreground whitespace-nowrap">
            AutoTARA
          </span>
        )}
      </div>

      <div className="px-3 mb-3">
        <div className="h-px bg-border" />
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
              className={cn(
                'group relative flex items-center gap-3 rounded transition-colors min-h-[38px] w-full',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-primary-soft text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              )}
            >
              {active && (
                <div className="absolute left-0 inset-y-0 w-[3px] rounded-l bg-primary" />
              )}

              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                  active ? 'text-primary' : 'group-hover:text-foreground'
                )}
              />
              {!collapsed && (
                <span className="text-[13px] whitespace-nowrap">
                  {mod.label}
                </span>
              )}
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

      {/* Bottom separator + collapse toggle */}
      <div className="px-3 mt-auto pt-2">
        <div className="h-px bg-border mb-2" />
      </div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full h-9 mb-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
