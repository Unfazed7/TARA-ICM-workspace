import { 
  LayoutDashboard, 
  FolderKanban, 
  Database, 
  Shield, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GlobalNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'projects', icon: FolderKanban, label: 'Projects' },
  { id: 'assets', icon: Database, label: 'Asset Library' },
  { id: 'threats', icon: Shield, label: 'Threat Catalogs' },
];

export function GlobalNav({ activeSection, onSectionChange, collapsed, onToggleCollapse }: GlobalNavProps) {
  return (
    <nav className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
      collapsed ? "w-14" : "w-14"
    )}>
      {/* Logo */}
      <div className="h-12 flex items-center justify-center border-b border-sidebar-border">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <Tooltip key={item.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "mx-2 p-2.5 rounded-md flex items-center justify-center transition-all duration-150",
                  activeSection === item.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Settings & Collapse */}
      <div className="py-3 border-t border-sidebar-border">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSectionChange('settings')}
              className={cn(
                "mx-2 p-2.5 rounded-md flex items-center justify-center transition-all duration-150",
                activeSection === 'settings'
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
