import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewItem {
  id: string;
  title: string;
  project: string;
  status: 'pending' | 'in-review' | 'approved';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastModified: string;
}

const mockReviewItems: ReviewItem[] = [
  { id: '1', title: 'ECU-Engine Threat Analysis', project: 'Vehicle Platform Alpha', status: 'pending', riskLevel: 'high', lastModified: '2 hours ago' },
  { id: '2', title: 'CAN Bus Attack Vectors', project: 'Vehicle Platform Alpha', status: 'in-review', riskLevel: 'critical', lastModified: '4 hours ago' },
  { id: '3', title: 'Infotainment Gateway Assessment', project: 'Connected Car Beta', status: 'pending', riskLevel: 'medium', lastModified: '1 day ago' },
  { id: '4', title: 'ADAS Sensor Security', project: 'Autonomous Drive v2', status: 'approved', riskLevel: 'low', lastModified: '2 days ago' },
];

const checklistItems = [
  { id: 'c1', label: 'Asset inventory complete', category: 'Documentation' },
  { id: 'c2', label: 'Threat scenarios identified', category: 'Documentation' },
  { id: 'c3', label: 'Attack feasibility rated', category: 'Analysis' },
  { id: 'c4', label: 'Impact assessment complete', category: 'Analysis' },
  { id: 'c5', label: 'Risk treatment plan defined', category: 'Mitigation' },
  { id: 'c6', label: 'Residual risk acceptable', category: 'Mitigation' },
  { id: 'c7', label: 'Cybersecurity goals verified', category: 'Compliance' },
  { id: 'c8', label: 'ISO 21434 requirements met', category: 'Compliance' },
];

const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-[hsl(0,72%,51%)] bg-[hsl(0,72%,51%)]/10 border-[hsl(0,72%,51%)]/30';
    case 'high': return 'text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/30';
    case 'medium': return 'text-[hsl(45,93%,47%)] bg-[hsl(45,93%,47%)]/10 border-[hsl(45,93%,47%)]/30';
    default: return 'text-primary bg-primary/10 border-primary/30';
  }
};

export default function ReviewQueue() {
  const [activeSection, setActiveSection] = useState('projects');
  const [selectedItem, setSelectedItem] = useState<string | null>('1');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const { logout } = useAuth();

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
        {/* Top Bar */}
        <header className="h-11 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">AutoTARA</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Analyst Review Queue</span>
            <Badge variant="outline" className="text-xs font-mono">
              Audit Mode
            </Badge>
          </div>
          
          <Button variant="ghost" size="sm" className="h-7 gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          <GlobalNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            collapsed={true}
            onToggleCollapse={() => {}}
          />

          {/* Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: TARA Data / Review Items */}
            <div className="flex-1 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-sm">Pending Reviews</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {mockReviewItems.filter(i => i.status !== 'approved').length} items awaiting review
                </p>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {mockReviewItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedItem === item.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.project}</span>
                          <span>•</span>
                          <span>{item.lastModified}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs capitalize", getRiskColor(item.riskLevel))}>
                          {item.riskLevel}
                        </Badge>
                        {item.status === 'approved' && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                        {item.status === 'in-review' && (
                          <Clock className="w-4 h-4 text-accent" />
                        )}
                        {item.status === 'pending' && (
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Compliance Audit Checklist */}
            <div className="w-80 flex flex-col bg-card/50">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-sm">Compliance Checklist</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  ISO/SAE 21434 Requirements
                </p>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {['Documentation', 'Analysis', 'Mitigation', 'Compliance'].map((category) => (
                    <div key={category}>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {checklistItems
                          .filter(item => item.category === category)
                          .map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={checkedItems.includes(item.id)}
                                onCheckedChange={() => toggleCheck(item.id)}
                              />
                              <span className={cn(
                                "text-sm transition-all",
                                checkedItems.includes(item.id) 
                                  ? "text-muted-foreground line-through" 
                                  : "text-foreground"
                              )}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Progress</span>
                  <span>{checkedItems.length}/{checklistItems.length}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${(checkedItems.length / checklistItems.length) * 100}%` }}
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  disabled={checkedItems.length < checklistItems.length}
                >
                  Approve Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
