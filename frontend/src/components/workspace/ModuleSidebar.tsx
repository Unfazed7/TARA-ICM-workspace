import { useState } from 'react';
import { Box, Search, Shield, ChevronsLeft, ChevronsRight, ClipboardList } from 'lucide-react';
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
        'shrink-0 flex flex-col h-full bg-[#05070a]/80 backdrop-blur-[20px] border-r border-white/5 transition-all duration-300 overflow-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand Area */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Shield className="w-4 h-4 text-cyan-400" />
        </div>
        {!collapsed && (
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-300 whitespace-nowrap">
            AutoTARA
          </span>
        )}
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
              className={cn(
                'group relative flex items-center gap-3 rounded-md transition-all duration-200 min-h-[40px] w-full',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-white'
                  : 'text-slate-400/80 hover:text-white hover:translate-x-1'
              )}
            >
              {/* Active laser line */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.7),0_0_20px_rgba(6,182,212,0.3)]" />
              )}

              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                  active
                    ? 'text-white drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                    : 'group-hover:text-white'
                )}
              />
              {!collapsed && (
                <span className="text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap">
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
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
      </div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full h-9 mb-2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
