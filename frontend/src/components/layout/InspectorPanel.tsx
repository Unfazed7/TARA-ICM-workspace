import { X, Shield, AlertTriangle, Lock, Eye, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InspectorPanelProps {
  open: boolean;
  onClose: () => void;
  selectedNodeId: string | null;
}

// Mock data for selected node details
const mockNodeData: Record<string, {
  name: string;
  type: string;
  layer: string;
  description: string;
  functions: string[];
  securityGoals: { goal: string; level: string }[];
  threats: { name: string; severity: string }[];
  interfaces: { name: string; protocol: string }[];
}> = {
  'ecu-engine': {
    name: 'Engine ECU',
    type: 'ECU',
    layer: 'Powertrain',
    description: 'Primary engine management unit controlling fuel injection, ignition timing, and emission systems.',
    functions: ['Fuel injection control', 'Ignition timing management', 'Emission control', 'Torque calculation', 'Diagnostic monitoring'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'High' },
      { goal: 'Authenticity', level: 'High' },
    ],
    threats: [
      { name: 'CAN Bus Injection', severity: 'critical' },
      { name: 'Firmware Manipulation', severity: 'high' },
      { name: 'DoS Attack', severity: 'medium' },
    ],
    interfaces: [
      { name: 'CAN-HS', protocol: 'CAN 2.0B' },
      { name: 'Diagnostic', protocol: 'UDS' },
      { name: 'Calibration', protocol: 'XCP' },
    ],
  },
  'ecu-transmission': {
    name: 'Transmission ECU',
    type: 'ECU',
    layer: 'Powertrain',
    description: 'Automatic transmission controller managing gear selection and torque converter.',
    functions: ['Gear selection logic', 'Torque converter control', 'Shift quality optimization', 'Fault detection'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'Critical' },
    ],
    threats: [
      { name: 'Command Spoofing', severity: 'high' },
      { name: 'Parameter Tampering', severity: 'medium' },
    ],
    interfaces: [{ name: 'CAN-HS', protocol: 'CAN 2.0B' }],
  },
  // Canvas node mappings
  'gateway-1': {
    name: 'Central Gateway',
    type: 'Gateway',
    layer: 'Body',
    description: 'Central vehicle gateway managing inter-domain communication, routing, and security functions.',
    functions: ['Protocol translation', 'Message routing', 'Firewall enforcement', 'OTA update management', 'Intrusion detection'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'Critical' },
      { goal: 'Confidentiality', level: 'High' },
      { goal: 'Authenticity', level: 'Critical' },
    ],
    threats: [
      { name: 'Gateway Bypass', severity: 'critical' },
      { name: 'Routing Table Manipulation', severity: 'high' },
      { name: 'Key Extraction', severity: 'critical' },
    ],
    interfaces: [
      { name: 'CAN-HS', protocol: 'CAN 2.0B' },
      { name: 'Ethernet', protocol: '100BASE-T1' },
      { name: 'FlexRay', protocol: 'FlexRay 3.0' },
    ],
  },
  'engine-ecu': {
    name: 'Engine ECU',
    type: 'ECU',
    layer: 'Powertrain',
    description: 'Primary engine management unit controlling fuel injection, ignition timing, and emission systems.',
    functions: ['Fuel injection control', 'Ignition timing management', 'Emission control', 'Torque calculation'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'High' },
    ],
    threats: [
      { name: 'CAN Bus Injection', severity: 'critical' },
      { name: 'Firmware Manipulation', severity: 'high' },
    ],
    interfaces: [{ name: 'CAN-HS', protocol: 'CAN 2.0B' }],
  },
  'trans-ecu': {
    name: 'Transmission ECU',
    type: 'ECU',
    layer: 'Powertrain',
    description: 'Automatic transmission controller managing gear selection.',
    functions: ['Gear selection', 'Torque converter control', 'Shift optimization'],
    securityGoals: [{ goal: 'Integrity', level: 'Critical' }],
    threats: [{ name: 'Command Spoofing', severity: 'high' }],
    interfaces: [{ name: 'CAN-HS', protocol: 'CAN 2.0B' }],
  },
  'abs-ecu': {
    name: 'ABS Module',
    type: 'ECU',
    layer: 'Chassis',
    description: 'Anti-lock braking system controller ensuring vehicle stability during braking.',
    functions: ['Wheel speed monitoring', 'Brake pressure modulation', 'Traction control', 'Stability assist'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'Critical' },
    ],
    threats: [
      { name: 'Brake Disengagement Attack', severity: 'critical' },
      { name: 'Sensor Spoofing', severity: 'high' },
    ],
    interfaces: [{ name: 'CAN-C', protocol: 'CAN 2.0B' }],
  },
  'eps-ecu': {
    name: 'EPS Controller',
    type: 'ECU',
    layer: 'Chassis',
    description: 'Electric power steering controller providing steering assist and lane keeping.',
    functions: ['Steering assist', 'Lane keep assist', 'Park assist', 'Torque sensing'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'Critical' },
    ],
    threats: [
      { name: 'Steering Manipulation', severity: 'critical' },
      { name: 'Command Injection', severity: 'critical' },
    ],
    interfaces: [{ name: 'FlexRay', protocol: 'FlexRay 3.0' }],
  },
  'adas-ecu': {
    name: 'ADAS Controller',
    type: 'ECU',
    layer: 'ADAS',
    description: 'Central ADAS compute platform for sensor fusion and autonomous functions.',
    functions: ['Sensor fusion', 'Object detection', 'Path planning', 'Emergency braking'],
    securityGoals: [
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Availability', level: 'Critical' },
      { goal: 'Authenticity', level: 'High' },
    ],
    threats: [
      { name: 'Sensor Blinding', severity: 'critical' },
      { name: 'ML Model Poisoning', severity: 'high' },
      { name: 'False Object Injection', severity: 'critical' },
    ],
    interfaces: [
      { name: 'Ethernet', protocol: '100BASE-T1' },
      { name: 'CAN-FD', protocol: 'CAN FD' },
    ],
  },
  'radar-sensor': {
    name: 'Front Radar',
    type: 'Sensor',
    layer: 'ADAS',
    description: '77GHz front-facing radar for adaptive cruise control and collision detection.',
    functions: ['Range detection', 'Velocity measurement', 'Object classification'],
    securityGoals: [{ goal: 'Integrity', level: 'High' }],
    threats: [{ name: 'Radar Jamming', severity: 'high' }],
    interfaces: [{ name: 'CAN-FD', protocol: 'CAN FD' }],
  },
  'camera-sensor': {
    name: 'Vision Camera',
    type: 'Sensor',
    layer: 'ADAS',
    description: 'Forward-facing camera for lane detection and traffic sign recognition.',
    functions: ['Lane detection', 'Sign recognition', 'Pedestrian detection'],
    securityGoals: [{ goal: 'Integrity', level: 'High' }],
    threats: [{ name: 'Camera Blinding', severity: 'high' }],
    interfaces: [{ name: 'LVDS', protocol: 'Ethernet' }],
  },
  'head-unit': {
    name: 'Head Unit',
    type: 'ECU',
    layer: 'Infotainment',
    description: 'In-vehicle infotainment system with navigation, media, and connectivity.',
    functions: ['Navigation', 'Media playback', 'Smartphone integration', 'Voice control'],
    securityGoals: [
      { goal: 'Confidentiality', level: 'High' },
      { goal: 'Integrity', level: 'Medium' },
    ],
    threats: [
      { name: 'Malware Installation', severity: 'high' },
      { name: 'Data Exfiltration', severity: 'medium' },
    ],
    interfaces: [{ name: 'Ethernet', protocol: '1000BASE-T' }],
  },
  'telematics': {
    name: 'Telematics Unit',
    type: 'ECU',
    layer: 'Infotainment',
    description: 'Connectivity module for V2X, remote services, and OTA updates.',
    functions: ['Cellular connectivity', 'GPS tracking', 'Remote diagnostics', 'OTA updates'],
    securityGoals: [
      { goal: 'Confidentiality', level: 'Critical' },
      { goal: 'Integrity', level: 'Critical' },
      { goal: 'Authenticity', level: 'Critical' },
    ],
    threats: [
      { name: 'Remote Exploitation', severity: 'critical' },
      { name: 'Man-in-the-Middle', severity: 'high' },
      { name: 'Unauthorized Access', severity: 'critical' },
    ],
    interfaces: [{ name: 'Ethernet', protocol: '100BASE-T1' }],
  },
};

const defaultNodeData = {
  name: 'Select a Node',
  type: 'N/A',
  layer: 'N/A',
  description: 'Select a node from the Project Explorer to view its properties and security information.',
  functions: [],
  securityGoals: [],
  threats: [],
  interfaces: [],
};

export function InspectorPanel({ open, onClose, selectedNodeId }: InspectorPanelProps) {
  const nodeData = selectedNodeId ? mockNodeData[selectedNodeId] || defaultNodeData : defaultNodeData;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'high': return 'bg-amber/15 text-amber border-amber/30';
      case 'medium': return 'bg-chart-3/15 text-chart-3 border-chart-3/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-primary/15 text-primary border-primary/30';
      case 'high': return 'bg-amber/15 text-amber border-amber/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col overflow-hidden",
        open ? "w-full" : "w-0"
      )}
    >
      {open && (
        <>
          {/* Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-white/5 shrink-0">
            <span className="text-sm font-semibold">Inspector</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Node Header */}
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {nodeData.type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {nodeData.layer}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold leading-tight">{nodeData.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{nodeData.description}</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="properties" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-5 h-12">
                <TabsTrigger value="properties" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                  Properties
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                  Security
                </TabsTrigger>
                <TabsTrigger value="threats" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                  Threats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="p-5 space-y-5 mt-0">
                {/* Functions */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Functions
                  </h4>
                  {nodeData.functions.length > 0 ? (
                    <ul className="space-y-2">
                      {nodeData.functions.map((fn, i) => (
                        <li key={i} className="text-sm flex items-start gap-3 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          {fn}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No functions defined</p>
                  )}
                </div>

                <Separator className="bg-border/50" />

                {/* Interfaces */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Interfaces
                  </h4>
                  {nodeData.interfaces.length > 0 ? (
                    <div className="space-y-2">
                      {nodeData.interfaces.map((intf, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
                          <span className="text-sm">{intf.name}</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {intf.protocol}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No interfaces defined</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="security" className="p-5 space-y-5 mt-0">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Cybersecurity Goals
                  </h4>
                  {nodeData.securityGoals.length > 0 ? (
                    <div className="space-y-3">
                      {nodeData.securityGoals.map((goal, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            {goal.goal === 'Integrity' && <Lock className="w-4 h-4 text-primary" />}
                            {goal.goal === 'Availability' && <Database className="w-4 h-4 text-chart-3" />}
                            {goal.goal === 'Authenticity' && <Shield className="w-4 h-4 text-amber" />}
                            {goal.goal === 'Confidentiality' && <Eye className="w-4 h-4 text-chart-4" />}
                            <span className="text-sm">{goal.goal}</span>
                          </div>
                          <Badge className={cn("text-xs", getLevelColor(goal.level))}>
                            {goal.level}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No security goals defined</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="threats" className="p-5 space-y-5 mt-0">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Associated Threats
                  </h4>
                  {nodeData.threats.length > 0 ? (
                    <div className="space-y-2">
                      {nodeData.threats.map((threat, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className={cn(
                              "w-4 h-4",
                              threat.severity === 'critical' ? 'text-destructive' :
                              threat.severity === 'high' ? 'text-amber' : 'text-muted-foreground'
                            )} />
                            <span className="text-sm">{threat.name}</span>
                          </div>
                          <Badge className={cn("text-xs capitalize", getSeverityColor(threat.severity))}>
                            {threat.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No threats identified</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
