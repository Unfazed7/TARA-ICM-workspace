import { useState, useMemo } from 'react';
import {
  Cpu,
  Router,
  Radio,
  CircuitBoard,
  ChevronRight,
  Search,
  GripVertical,
  Layers,
  Plus,
  Trash2,
  Cable,
  Package
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useProjects } from '@/contexts/ProjectContext';
import { groupAssetsByCategory, getDisplayName, type TaraAssetItem } from '@/data/taraAssets';
import type { ProjectScope } from '@/types/tara';

export interface ComponentTemplate {
  id: string;
  label: string;
  nodeType: 'ecu' | 'gateway' | 'sensor' | 'actuator' | 'group' | 'bus';
  layer?: 'powertrain' | 'infotainment' | 'chassis' | 'adas' | 'body';
  busType?: 'can' | 'can-fd' | 'lin' | 'ethernet' | 'flexray' | 'most';
  orientation?: 'horizontal' | 'vertical';
  description: string;
  vendor?: string;
  isCustom?: boolean;
}

// --- Color & metadata mappings ---

const layerBorderColors: Record<string, string> = {
  powertrain: 'border-t-primary',
  infotainment: 'border-t-chart-4',
  chassis: 'border-t-amber',
  adas: 'border-t-chart-3',
  body: 'border-t-chart-5',
};

const layerBgColors: Record<string, string> = {
  powertrain: 'bg-primary/15',
  infotainment: 'bg-chart-4/15',
  chassis: 'bg-amber/15',
  adas: 'bg-chart-3/15',
  body: 'bg-chart-5/15',
};

const layerIconColors: Record<string, string> = {
  powertrain: 'text-primary',
  infotainment: 'text-chart-4',
  chassis: 'text-amber',
  adas: 'text-chart-3',
  body: 'text-chart-5',
};

const busBorderColors: Record<string, string> = {
  can: 'border-t-amber',
  'can-fd': 'border-t-primary',
  lin: 'border-t-muted-foreground',
  ethernet: 'border-t-chart-3',
  flexray: 'border-t-chart-5',
  most: 'border-t-chart-4',
};

const busBgColors: Record<string, string> = {
  can: 'bg-amber/15',
  'can-fd': 'bg-primary/15',
  lin: 'bg-muted-foreground/15',
  ethernet: 'bg-chart-3/15',
  flexray: 'bg-chart-5/15',
  most: 'bg-chart-4/15',
};

const busIconColors: Record<string, string> = {
  can: 'text-amber',
  'can-fd': 'text-primary',
  lin: 'text-muted-foreground',
  ethernet: 'text-chart-3',
  flexray: 'text-chart-5',
  most: 'text-chart-4',
};

const layerLabels: Record<string, string> = {
  powertrain: 'PWT',
  infotainment: 'IVI',
  chassis: 'CHS',
  adas: 'ADAS',
  body: 'BODY',
};

const busSpeedLabels: Record<string, string> = {
  can: '500 kbps',
  'can-fd': '5 Mbps',
  lin: '20 kbps',
  ethernet: '100 Mbps',
  flexray: '10 Mbps',
  most: '25 Mbps',
};

const nodeTypeIcons = {
  ecu: Cpu,
  gateway: Router,
  sensor: Radio,
  actuator: CircuitBoard,
  group: Layers,
  bus: Cable,
};

const categoryColors: Record<string, string> = {
  'Process': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Data Flow': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Data Store': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'External Entity': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Boundary': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Custom Components': 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
};

const defaultTemplates: Record<string, ComponentTemplate[]> = {
  'Process': [
    { id: 'proc-ecu', label: 'ECU', nodeType: 'ecu', layer: 'powertrain', description: 'Electronic Control Unit' },
    { id: 'proc-sensors', label: 'Sensors', nodeType: 'sensor', layer: 'chassis', description: 'General vehicle sensors' },
    { id: 'proc-std-sensors', label: 'Standard Sensors', nodeType: 'sensor', layer: 'chassis', description: 'Standard vehicle sensors' },
    { id: 'proc-auto-sensors', label: 'Sensors for Autonomous Vehicle', nodeType: 'sensor', layer: 'adas', description: 'Autonomous driving sensors' },
    { id: 'proc-actuators', label: 'Actuators', nodeType: 'actuator', layer: 'chassis', description: 'Vehicle actuators' },
    { id: 'proc-obd', label: 'OBD Port', nodeType: 'ecu', layer: 'body', description: 'On-board diagnostics port' },
    { id: 'proc-ui', label: 'End User Interfaces', nodeType: 'ecu', layer: 'infotainment', description: 'HMI and user-facing interfaces' },
    { id: 'proc-phys-access', label: 'Other Physical Access (Debug, USB,..)', nodeType: 'ecu', layer: 'body', description: 'Debug port, USB port, etc.' },
    { id: 'proc-3rd-party', label: 'Hosted 3rd Party Software', nodeType: 'ecu', layer: 'infotainment', description: 'Third-party hosted software' },
    { id: 'proc-remote', label: 'Remotely Operated Vehicle Systems', nodeType: 'ecu', layer: 'adas', description: 'Remote operation systems' },
    { id: 'proc-other-phys', label: 'Other Physical System', nodeType: 'ecu', layer: 'body', description: 'Other physical systems' },
    { id: 'proc-other-wireless', label: 'Other Wireless System', nodeType: 'ecu', layer: 'body', description: 'Other wireless systems' },
    { id: 'proc-radio', label: 'Radio Antenna', nodeType: 'sensor', layer: 'infotainment', description: 'Radio antenna module' },
    { id: 'proc-other-device', label: 'Other Physical Device (Camera, Alarm, Audio, Display)', nodeType: 'actuator', layer: 'body', description: 'Camera, Alarm, Audio, Display, etc.' },
  ],
  'Data Flow': [
    { id: 'comm-sensor-data', label: 'Sensor Data', nodeType: 'bus', busType: 'can', orientation: 'horizontal', description: 'Sensor data streams' },
    { id: 'comm-video', label: 'Video Streams', nodeType: 'bus', busType: 'ethernet', orientation: 'horizontal', description: 'Video data streams' },
    { id: 'comm-short-wireless', label: 'Short Range Wireless (UWB/BLE/NFC/WiFi/Radio)', nodeType: 'bus', busType: 'most', orientation: 'horizontal', description: 'UWB, BLE, NFC, WiFi, Radio signal' },
    { id: 'comm-plc', label: 'PLC Communication (Twisted pair/RS/OTN)', nodeType: 'bus', busType: 'flexray', orientation: 'horizontal', description: 'Twisted pair, RS, OTN' },
    { id: 'comm-serial', label: 'Serial Bus (LIN, SPI, I2C, UART)', nodeType: 'bus', busType: 'lin', orientation: 'horizontal', description: 'LIN, SPI, I2C, UART' },
    { id: 'comm-can', label: 'CAN Communication', nodeType: 'bus', busType: 'can', orientation: 'horizontal', description: 'CAN bus communication' },
    { id: 'comm-debug', label: 'Debug Interface (JTAG,..)', nodeType: 'bus', busType: 'lin', orientation: 'horizontal', description: 'JTAG and debug interfaces' },
    { id: 'comm-swd', label: 'SWD', nodeType: 'bus', busType: 'lin', orientation: 'horizontal', description: 'Serial Wire Debug' },
    { id: 'comm-v2x', label: 'V2X Communications', nodeType: 'bus', busType: 'ethernet', orientation: 'horizontal', description: 'Vehicle-to-everything communication' },
    { id: 'comm-wider', label: 'Wider Vehicle Network', nodeType: 'bus', busType: 'can-fd', orientation: 'horizontal', description: 'Wider vehicle network' },
    { id: 'comm-ethernet', label: 'Ethernet', nodeType: 'bus', busType: 'ethernet', orientation: 'horizontal', description: 'Automotive Ethernet' },
    { id: 'comm-long-range', label: 'Long Range Communication (Cellular, GNSS, GPS)', nodeType: 'bus', busType: 'most', orientation: 'horizontal', description: 'Cellular, GNSS, GPS' },
    { id: 'comm-other-wireless', label: 'Other Wireless', nodeType: 'bus', busType: 'most', orientation: 'horizontal', description: 'Other wireless protocols' },
    { id: 'comm-phys-port', label: 'Physical Port (USB, CD Drive)', nodeType: 'bus', busType: 'lin', orientation: 'horizontal', description: 'USB, CD drive ports' },
    { id: 'comm-hardwire', label: 'Hardwire', nodeType: 'bus', busType: 'can', orientation: 'horizontal', description: 'Hardwired connections' },
  ],
  'Data Store': [
    { id: 'stor-software', label: 'Software', nodeType: 'ecu', layer: 'body', description: 'Software components' },
    { id: 'stor-memory', label: 'Memory', nodeType: 'ecu', layer: 'body', description: 'RAM / volatile memory' },
    { id: 'stor-security', label: 'Security Artifacts', nodeType: 'ecu', layer: 'body', description: 'Keys, certificates, credentials' },
    { id: 'stor-local', label: 'Device Local Storage', nodeType: 'ecu', layer: 'body', description: 'On-device local storage' },
    { id: 'stor-removable', label: 'Removable Storage', nodeType: 'ecu', layer: 'body', description: 'SD card, USB storage' },
    { id: 'stor-bootloader', label: 'Bootloader', nodeType: 'ecu', layer: 'powertrain', description: 'System bootloader' },
    { id: 'stor-filesystem', label: 'File System', nodeType: 'ecu', layer: 'body', description: 'File system layer' },
    { id: 'stor-cloud', label: 'Cloud Storage', nodeType: 'gateway', layer: 'infotainment', description: 'Cloud-based storage' },
  ],
  'External Entity': [
    { id: 'ext-server', label: 'External Server', nodeType: 'gateway', layer: 'infotainment', description: 'External backend server' },
    { id: 'ext-keyfob', label: 'Keyfob', nodeType: 'sensor', layer: 'body', description: 'Wireless key fob' },
    { id: 'ext-nfc', label: 'NFC Card', nodeType: 'sensor', layer: 'body', description: 'NFC card device' },
    { id: 'ext-mobile', label: 'Paired Mobile Phone / Tablet', nodeType: 'ecu', layer: 'infotainment', description: 'Paired mobile device' },
    { id: 'ext-charging', label: 'Charging Station', nodeType: 'actuator', layer: 'powertrain', description: 'EV charging station' },
    { id: 'ext-vehicle', label: 'Other Connected Vehicle', nodeType: 'ecu', layer: 'adas', description: 'V2V connected vehicle' },
    { id: 'ext-app', label: 'External Application or Service', nodeType: 'gateway', layer: 'infotainment', description: 'External app or cloud service' },
    { id: 'ext-removable', label: 'Removable Devices', nodeType: 'ecu', layer: 'body', description: 'Removable storage/devices' },
    { id: 'ext-staff', label: 'Staff', nodeType: 'ecu', layer: 'body', description: 'Maintenance/service staff' },
    { id: 'ext-phys-devices', label: 'Other Physical Connected Devices', nodeType: 'actuator', layer: 'body', description: 'Physical connected devices' },
    { id: 'ext-wireless-devices', label: 'Other Wireless Connected Devices', nodeType: 'sensor', layer: 'body', description: 'Wireless connected devices' },
    { id: 'ext-user', label: 'User', nodeType: 'ecu', layer: 'body', description: 'End user / driver' },
  ],
  'Boundary': [
    { id: 'bnd-item', label: 'Item Boundary', nodeType: 'group', layer: 'body', description: 'Item definition boundary' },
    { id: 'bnd-operational', label: 'Operational Environment', nodeType: 'group', layer: 'body', description: 'Operational environment boundary' },
    { id: 'bnd-vehicle', label: 'Vehicle Boundary', nodeType: 'group', layer: 'body', description: 'Vehicle system boundary' },
  ],
  'Custom Components': [],
};

function MiniPreview({ template }: { template: ComponentTemplate }) {
  const Icon = nodeTypeIcons[template.nodeType];

  if (template.nodeType === 'bus') {
    const borderColor = busBorderColors[template.busType || 'can'];
    const bgColor = busBgColors[template.busType || 'can'];
    const iconColor = busIconColors[template.busType || 'can'];
    return (
      <div className={cn(
        "w-8 h-8 rounded-md border-t-2 flex items-center justify-center shrink-0",
        "bg-card/60 border border-border/30",
        borderColor, bgColor
      )}>
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
      </div>
    );
  }

  const layer = template.layer || 'body';
  const borderColor = layerBorderColors[layer];
  const bgColor = layerBgColors[layer];
  const iconColor = layerIconColors[layer];

  return (
    <div className={cn(
      "w-8 h-8 rounded-md border-t-2 flex items-center justify-center shrink-0",
      "bg-card/60 border border-border/30",
      borderColor, bgColor
    )}>
      <Icon className={cn("w-3.5 h-3.5", iconColor)} />
    </div>
  );
}

function MetadataBadge({ template }: { template: ComponentTemplate }) {
  if (template.nodeType === 'bus' && template.busType) {
    const speed = busSpeedLabels[template.busType];
    return (
      <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
        {speed}
      </span>
    );
  }

  if (template.layer) {
    const domain = layerLabels[template.layer];
    return (
      <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
        Domain: {domain}
      </span>
    );
  }

  return null;
}

interface ComponentLibraryProps {
  onDragStart: (event: React.DragEvent, template: ComponentTemplate) => void;
}

export function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  const [search, setSearch] = useState('');
  const [componentTemplates, setComponentTemplates] = useState<Record<string, ComponentTemplate[]>>(defaultTemplates);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Process': true,
    'Data Flow': false,
    'Data Store': false,
    'External Entity': false,
    'Boundary': false,
    'Custom Components': true,
  });
  const [expandedAssetCategories, setExpandedAssetCategories] = useState<Record<string, boolean>>({});

  // === TARA Assets: read active project scope ===
  const { activeProject } = useProjects();
  const taraScope = activeProject?.scope as ProjectScope | undefined;

  const taraAssetGroups = useMemo(() => {
    if (!taraScope) return null;
    return groupAssetsByCategory(taraScope);
  }, [taraScope]);

  // Filter TARA assets by search term
  const filteredTaraGroups = useMemo(() => {
    if (!taraAssetGroups || !taraScope) return null;
    if (!search.trim()) return taraAssetGroups;

    const lowerSearch = search.toLowerCase();
    const result: Record<string, TaraAssetItem[]> = {};
    for (const [category, assets] of Object.entries(taraAssetGroups)) {
      const filtered = assets.filter(a => {
        const name = getDisplayName(a, taraScope);
        return name.toLowerCase().includes(lowerSearch) || category.toLowerCase().includes(lowerSearch);
      });
      if (filtered.length > 0) result[category] = filtered;
    }
    return result;
  }, [taraAssetGroups, taraScope, search]);

  const toggleAssetCategory = (category: string) => {
    setExpandedAssetCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleAssetDragStart = (event: React.DragEvent, asset: TaraAssetItem, category: string) => {
    if (!taraScope) return;
    const displayName = getDisplayName(asset, taraScope);
    const template = {
      id: `tara-asset-${displayName.replace(/\s+/g, '-').toLowerCase()}`,
      label: displayName,
      nodeType: 'asset',
      assetCategory: category,
      taraScope,
    };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<ComponentTemplate>>({
    label: '',
    nodeType: 'ecu',
    layer: 'body',
    description: '',
    vendor: '',
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleAddComponent = () => {
    if (!newComponent.label?.trim()) return;

    const template: ComponentTemplate = {
      id: `custom-${Date.now()}`,
      label: newComponent.label.trim(),
      nodeType: newComponent.nodeType || 'ecu',
      layer: newComponent.layer,
      description: newComponent.description || '',
      vendor: newComponent.vendor || 'Custom',
      isCustom: true,
    };

    setComponentTemplates(prev => ({
      ...prev,
      'Custom Components': [...(prev['Custom Components'] || []), template],
    }));

    setNewComponent({ label: '', nodeType: 'ecu', layer: 'body', description: '', vendor: '' });
    setAddDialogOpen(false);
  };

  const handleDeleteComponent = (templateId: string) => {
    setComponentTemplates(prev => ({
      ...prev,
      'Custom Components': prev['Custom Components'].filter(t => t.id !== templateId),
    }));
  };

  const filteredTemplates = Object.entries(componentTemplates).reduce((acc, [category, templates]) => {
    const filtered = templates.filter(t =>
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.vendor?.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0 || category === 'Custom Components') acc[category] = filtered;
    return acc;
  }, {} as Record<string, ComponentTemplate[]>);

  return (
    <div className="h-full flex flex-col backdrop-blur-xl bg-[#0b0f17]/80 border-r border-border/10">
      {/* Header */}
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Components List</h3>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add custom component</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/30 border-border/20 focus:border-primary/40 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Scrollable List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(filteredTemplates).map(([category, templates]) => (
            <div key={category} className="mb-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors",
                  categoryColors[category] || 'bg-muted/10 text-muted-foreground border-border/20'
                )}
              >
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    expandedCategories[category] && "rotate-90"
                  )}
                />
                <span className="text-[11px] uppercase tracking-widest font-bold">
                  {category}
                </span>
                <span className="ml-auto text-[10px] font-mono opacity-60">
                  {templates.length}
                </span>
              </button>

              {/* Items */}
              {expandedCategories[category] && (
                <div className="space-y-1 mt-1 px-0.5">
                  {templates.length === 0 && category === 'Custom Components' && (
                    <div className="px-3 py-4 text-[10px] text-muted-foreground/50 text-center border border-dashed border-border/20 rounded-lg">
                      No custom parts yet.
                      <br />
                      <button
                        onClick={() => setAddDialogOpen(true)}
                        className="text-primary/70 hover:text-primary hover:underline mt-1 inline-block transition-colors"
                      >
                        Add one now
                      </button>
                    </div>
                  )}
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                      className={cn(
                        "group flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing",
                        "bg-transparent hover:bg-muted/10 transition-all duration-200",
                        "border border-transparent hover:border-primary/20",
                        "hover:ring-1 hover:ring-primary/15"
                      )}
                    >
                      <MiniPreview template={template} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground/90 truncate leading-tight">
                          {template.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MetadataBadge template={template} />
                          {template.vendor && template.vendor !== 'Generic' && (
                            <span className="text-[10px] text-muted-foreground/40 truncate">
                              {template.vendor}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grip handle - visible on hover */}
                      {template.isCustom ? (
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComponent(template.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      ) : (
                        <GripVertical className="w-3 h-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* === TARA Asset Sections === */}
          {taraScope && filteredTaraGroups && (
            <>
              <div className="my-3 px-2">
                <div className="border-t border-border/20" />
                <div className="flex items-center gap-2 mt-2">
                  <Package className="w-3 h-3 text-primary/60" />
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-primary/60">
                    TARA Assets — {taraScope}
                  </span>
                </div>
              </div>

              {Object.entries(filteredTaraGroups).map(([category, assets]) => (
                <div key={`tara-${category}`} className="mb-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleAssetCategory(category)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 bg-primary/5 rounded-sm"
                  >
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 text-primary/40 transition-transform duration-200",
                        expandedAssetCategories[category] && "rotate-90"
                      )}
                    />
                    <span className="text-[10px] uppercase tracking-widest font-medium text-primary/60">
                      {category}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-muted-foreground/40">
                      {assets.length}
                    </span>
                  </button>

                  {/* Asset Items */}
                  {expandedAssetCategories[category] && (
                    <div className="space-y-1 mt-1 px-0.5">
                      {assets.map((asset, idx) => {
                        const displayName = getDisplayName(asset, taraScope);
                        return (
                          <div
                            key={`${category}-${displayName}-${idx}`}
                            draggable
                            onDragStart={(e) => handleAssetDragStart(e, asset, category)}
                            className={cn(
                              "group flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing",
                              "bg-transparent hover:bg-primary/5 transition-all duration-200",
                              "border border-transparent hover:border-primary/20",
                              "hover:ring-1 hover:ring-primary/15"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-md border-t-2 flex items-center justify-center shrink-0",
                              "bg-card/60 border border-border/30",
                              "border-t-primary bg-primary/15"
                            )}>
                              <Package className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground/90 truncate leading-tight">
                                {displayName}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
                                {category}
                              </span>
                            </div>
                            <GripVertical className="w-3 h-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {Object.keys(filteredTaraGroups).length === 0 && search.trim() && (
                <div className="px-3 py-4 text-[10px] text-muted-foreground/50 text-center">
                  No TARA assets match "{search}"
                </div>
              )}
            </>
          )}

          {!taraScope && (
            <div className="px-3 py-4 text-[10px] text-muted-foreground/50 text-center border border-dashed border-border/20 rounded-lg mx-2 mt-3">
              Open a project to see TARA asset items.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Component Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-muted-foreground">Component Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Custom ECU Module"
                value={newComponent.label || ''}
                onChange={(e) => setNewComponent(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</Label>
                <Select
                  value={newComponent.nodeType}
                  onValueChange={(value: ComponentTemplate['nodeType']) =>
                    setNewComponent(prev => ({ ...prev, nodeType: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecu">ECU</SelectItem>
                    <SelectItem value="gateway">Gateway</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="actuator">Actuator</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Layer</Label>
                <Select
                  value={newComponent.layer}
                  onValueChange={(value: ComponentTemplate['layer']) =>
                    setNewComponent(prev => ({ ...prev, layer: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="powertrain">Powertrain</SelectItem>
                    <SelectItem value="infotainment">Infotainment</SelectItem>
                    <SelectItem value="chassis">Chassis</SelectItem>
                    <SelectItem value="adas">ADAS</SelectItem>
                    <SelectItem value="body">Body</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendor</Label>
              <Input
                id="vendor"
                placeholder="e.g., Custom Vendor"
                value={newComponent.vendor || ''}
                onChange={(e) => setNewComponent(prev => ({ ...prev, vendor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
              <Input
                id="description"
                placeholder="Brief description..."
                value={newComponent.description || ''}
                onChange={(e) => setNewComponent(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddComponent} disabled={!newComponent.label?.trim()}>
              Add Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
