import { useState } from 'react';
import { 
  CommunicationProtocol, 
  PROTOCOL_CONFIGS, 
  PROTOCOL_CATEGORIES 
} from '@/types/communication-protocols';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Check, ChevronDown, Wifi, Cable, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EdgeProtocolEditorProps {
  protocol: CommunicationProtocol;
  customLabel?: string;
  onProtocolChange: (protocol: CommunicationProtocol, customLabel?: string) => void;
  children: React.ReactNode;
}

const categoryIcons = {
  wired: Cable,
  wireless: Wifi,
  internal: Cpu,
};

export function EdgeProtocolEditor({ 
  protocol, 
  customLabel, 
  onProtocolChange, 
  children 
}: EdgeProtocolEditorProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(customLabel || '');
  const [selectedProtocol, setSelectedProtocol] = useState<CommunicationProtocol>(protocol);

  const handleSave = () => {
    onProtocolChange(selectedProtocol, label || undefined);
    setOpen(false);
  };

  const handleProtocolSelect = (proto: CommunicationProtocol) => {
    setSelectedProtocol(proto);
    // Auto-set label to protocol short label if empty
    if (!label) {
      setLabel(PROTOCOL_CONFIGS[proto].shortLabel);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-border z-50" align="center">
        <div className="p-3 border-b border-border">
          <h4 className="font-medium text-sm">Communication Protocol</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Select the protocol type for this connection
          </p>
        </div>
        
        <ScrollArea className="h-64">
          <div className="p-2">
            {Object.entries(PROTOCOL_CATEGORIES).map(([categoryKey, category]) => {
              const IconComponent = categoryIcons[categoryKey as keyof typeof categoryIcons];
              return (
                <div key={categoryKey} className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <IconComponent className="h-3 w-3" />
                    {category.label}
                  </div>
                  <div className="space-y-0.5">
                    {category.protocols.map((proto) => {
                      const config = PROTOCOL_CONFIGS[proto];
                      return (
                        <button
                          key={proto}
                          onClick={() => handleProtocolSelect(proto)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors",
                            selectedProtocol === proto
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <div 
                            className="w-4 h-0.5 rounded-full"
                            style={{ 
                              backgroundColor: config.color,
                              ...(config.strokeDasharray && { 
                                background: `repeating-linear-gradient(90deg, ${config.color} 0px, ${config.color} 4px, transparent 4px, transparent 8px)` 
                              })
                            }}
                          />
                          <span className="flex-1">{config.shortLabel}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {config.description.split(' ').slice(0, 3).join(' ')}...
                          </span>
                          {selectedProtocol === proto && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />
        
        <div className="p-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom-label" className="text-xs">
              Custom Label (optional)
            </Label>
            <Input
              id="custom-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={PROTOCOL_CONFIGS[selectedProtocol]?.shortLabel || 'Label'}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              e.g., "CAN-HS", "100BASE-T1", "Private CAN"
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: PROTOCOL_CONFIGS[selectedProtocol]?.color }}
              >
                {label || PROTOCOL_CONFIGS[selectedProtocol]?.shortLabel}
              </Badge>
            </div>
            <Button size="sm" onClick={handleSave}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
