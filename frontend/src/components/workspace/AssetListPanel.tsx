import { useState, useCallback } from 'react';
import { Plus, ArrowRightLeft, Database, Trash2, Edit, Shield, Lock, Eye, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  DataFlowAsset,
  DataAtRestAsset,
  DataType,
  CybersecurityProperty,
  dataTypeOptions,
  storageTypeOptions,
  cybersecurityPropertyOptions,
} from '@/types/asset-catalog';
import { PROTOCOL_CONFIGS, CommunicationProtocol } from '@/types/communication-protocols';

// Mock components for selection (in real app, this would come from the architecture)
const mockComponents = [
  { id: 'gateway-1', name: 'Central Gateway' },
  { id: 'engine-ecu', name: 'Engine ECU' },
  { id: 'trans-ecu', name: 'Transmission ECU' },
  { id: 'abs-ecu', name: 'ABS Module' },
  { id: 'eps-ecu', name: 'EPS Controller' },
  { id: 'adas-ecu', name: 'ADAS Controller' },
  { id: 'radar-sensor', name: 'Front Radar' },
  { id: 'camera-sensor', name: 'Vision Camera' },
  { id: 'head-unit', name: 'Head Unit' },
  { id: 'telematics', name: 'Telematics Unit' },
];

// Initial mock data
const initialDataFlowAssets: DataFlowAsset[] = [
  {
    id: '1',
    assetId: 'DFA-001',
    name: 'Vehicle Speed Signal',
    description: 'Speed data transmitted from ABS to ADAS',
    sourceComponentId: 'abs-ecu',
    sourceComponentName: 'ABS Module',
    targetComponentId: 'adas-ecu',
    targetComponentName: 'ADAS Controller',
    protocol: 'can',
    dataTypes: ['vehicle-state', 'sensor-data'],
    cybersecurityProperties: ['integrity', 'availability'],
    damageScenarioIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    assetId: 'DFA-002',
    name: 'Firmware Update Package',
    description: 'OTA firmware updates to ECUs via telematics',
    sourceComponentId: 'telematics',
    sourceComponentName: 'Telematics Unit',
    targetComponentId: 'gateway-1',
    targetComponentName: 'Central Gateway',
    protocol: 'ethernet',
    dataTypes: ['firmware', 'authentication-token'],
    cybersecurityProperties: ['confidentiality', 'integrity', 'availability'],
    damageScenarioIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialDataAtRestAssets: DataAtRestAsset[] = [
  {
    id: '1',
    assetId: 'DRA-001',
    name: 'Cryptographic Keys',
    description: 'Master keys stored in gateway HSM',
    componentId: 'gateway-1',
    componentName: 'Central Gateway',
    partOf: 'Security Subsystem',
    dataTypes: ['cryptographic-key'],
    cybersecurityProperties: ['confidentiality', 'integrity'],
    storageType: 'secure-element',
    damageScenarioIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    assetId: 'DRA-002',
    name: 'User Profile Data',
    description: 'Personal settings and preferences stored in head unit',
    componentId: 'head-unit',
    componentName: 'Head Unit',
    partOf: 'Infotainment System',
    dataTypes: ['user-data', 'configuration'],
    cybersecurityProperties: ['confidentiality', 'integrity'],
    storageType: 'non-volatile',
    damageScenarioIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const getCybersecurityIcon = (property: CybersecurityProperty) => {
  switch (property) {
    case 'confidentiality':
      return Lock;
    case 'integrity':
      return Shield;
    case 'availability':
      return Eye;
    default:
      return Shield;
  }
};

interface AssetListPanelProps {
  className?: string;
}

export function AssetListPanel({ className }: AssetListPanelProps) {
  const [activeAssetType, setActiveAssetType] = useState<'data-flow' | 'data-at-rest'>('data-flow');
  const [dataFlowAssets, setDataFlowAssets] = useState<DataFlowAsset[]>(initialDataFlowAssets);
  const [dataAtRestAssets, setDataAtRestAssets] = useState<DataAtRestAsset[]>(initialDataAtRestAssets);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DataFlowAsset | DataAtRestAsset | null>(null);

  // Data Flow form state
  const [dfName, setDfName] = useState('');
  const [dfDescription, setDfDescription] = useState('');
  const [dfSourceComponent, setDfSourceComponent] = useState('');
  const [dfTargetComponent, setDfTargetComponent] = useState('');
  const [dfProtocol, setDfProtocol] = useState<CommunicationProtocol>('can');
  const [dfDataTypes, setDfDataTypes] = useState<DataType[]>([]);
  const [dfCybersecurityProps, setDfCybersecurityProps] = useState<CybersecurityProperty[]>([]);

  // Data At Rest form state
  const [darName, setDarName] = useState('');
  const [darDescription, setDarDescription] = useState('');
  const [darComponent, setDarComponent] = useState('');
  const [darPartOf, setDarPartOf] = useState('');
  const [darDataTypes, setDarDataTypes] = useState<DataType[]>([]);
  const [darStorageType, setDarStorageType] = useState<DataAtRestAsset['storageType']>('non-volatile');
  const [darCybersecurityProps, setDarCybersecurityProps] = useState<CybersecurityProperty[]>([]);

  const resetDataFlowForm = useCallback(() => {
    setDfName('');
    setDfDescription('');
    setDfSourceComponent('');
    setDfTargetComponent('');
    setDfProtocol('can');
    setDfDataTypes([]);
    setDfCybersecurityProps([]);
  }, []);

  const resetDataAtRestForm = useCallback(() => {
    setDarName('');
    setDarDescription('');
    setDarComponent('');
    setDarPartOf('');
    setDarDataTypes([]);
    setDarStorageType('non-volatile');
    setDarCybersecurityProps([]);
  }, []);

  const handleAddDataFlowAsset = useCallback(() => {
    const sourceComp = mockComponents.find(c => c.id === dfSourceComponent);
    const targetComp = mockComponents.find(c => c.id === dfTargetComponent);

    if (!sourceComp || !targetComp || !dfName) return;

    const newAsset: DataFlowAsset = {
      id: Date.now().toString(),
      assetId: `DFA-${String(dataFlowAssets.length + 1).padStart(3, '0')}`,
      name: dfName,
      description: dfDescription,
      sourceComponentId: sourceComp.id,
      sourceComponentName: sourceComp.name,
      targetComponentId: targetComp.id,
      targetComponentName: targetComp.name,
      protocol: dfProtocol,
      dataTypes: dfDataTypes,
      cybersecurityProperties: dfCybersecurityProps,
      damageScenarioIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDataFlowAssets(prev => [...prev, newAsset]);
    resetDataFlowForm();
    setIsAddDialogOpen(false);
  }, [dfName, dfDescription, dfSourceComponent, dfTargetComponent, dfProtocol, dfDataTypes, dfCybersecurityProps, dataFlowAssets.length, resetDataFlowForm]);

  const handleAddDataAtRestAsset = useCallback(() => {
    const comp = mockComponents.find(c => c.id === darComponent);

    if (!comp || !darName) return;

    const newAsset: DataAtRestAsset = {
      id: Date.now().toString(),
      assetId: `DRA-${String(dataAtRestAssets.length + 1).padStart(3, '0')}`,
      name: darName,
      description: darDescription,
      componentId: comp.id,
      componentName: comp.name,
      partOf: darPartOf || undefined,
      dataTypes: darDataTypes,
      cybersecurityProperties: darCybersecurityProps,
      storageType: darStorageType,
      damageScenarioIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDataAtRestAssets(prev => [...prev, newAsset]);
    resetDataAtRestForm();
    setIsAddDialogOpen(false);
  }, [darName, darDescription, darComponent, darPartOf, darDataTypes, darStorageType, darCybersecurityProps, dataAtRestAssets.length, resetDataAtRestForm]);

  const handleDeleteDataFlowAsset = useCallback((id: string) => {
    setDataFlowAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleDeleteDataAtRestAsset = useCallback((id: string) => {
    setDataAtRestAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggleDataType = (type: DataType, isFlow: boolean) => {
    if (isFlow) {
      setDfDataTypes(prev =>
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
    } else {
      setDarDataTypes(prev =>
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
    }
  };

  const toggleCybersecurityProp = (prop: CybersecurityProperty, isFlow: boolean) => {
    if (isFlow) {
      setDfCybersecurityProps(prev =>
        prev.includes(prop) ? prev.filter(p => p !== prop) : [...prev, prop]
      );
    } else {
      setDarCybersecurityProps(prev =>
        prev.includes(prop) ? prev.filter(p => p !== prop) : [...prev, prop]
      );
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Asset Catalog</h2>
            <p className="text-sm text-muted-foreground">ISO 21434 WP-15-01 Asset Identification</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Add {activeAssetType === 'data-flow' ? 'Data Flow' : 'Data At Rest'} Asset
                </DialogTitle>
                <DialogDescription>
                  Define a new {activeAssetType === 'data-flow' ? 'data flow between components' : 'data storage asset'}
                </DialogDescription>
              </DialogHeader>

              {activeAssetType === 'data-flow' ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="df-name">Asset Name</Label>
                    <Input
                      id="df-name"
                      value={dfName}
                      onChange={(e) => setDfName(e.target.value)}
                      placeholder="e.g., Vehicle Speed Signal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="df-description">Description</Label>
                    <Textarea
                      id="df-description"
                      value={dfDescription}
                      onChange={(e) => setDfDescription(e.target.value)}
                      placeholder="Describe the data flow..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source Component</Label>
                      <Select value={dfSourceComponent} onValueChange={setDfSourceComponent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockComponents.map(comp => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Component</Label>
                      <Select value={dfTargetComponent} onValueChange={setDfTargetComponent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockComponents.map(comp => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Communication Protocol</Label>
                    <Select value={dfProtocol} onValueChange={(v) => setDfProtocol(v as CommunicationProtocol)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(PROTOCOL_CONFIGS).map(protocol => (
                          <SelectItem key={protocol.id} value={protocol.id}>
                            {protocol.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Types</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {dataTypeOptions.map(option => (
                        <div key={option.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`df-dt-${option.id}`}
                            checked={dfDataTypes.includes(option.id)}
                            onCheckedChange={() => toggleDataType(option.id, true)}
                          />
                          <Label htmlFor={`df-dt-${option.id}`} className="text-sm cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cybersecurity Properties (CIA)</Label>
                    <div className="flex gap-4">
                      {cybersecurityPropertyOptions.map(option => {
                        const Icon = getCybersecurityIcon(option.id);
                        return (
                          <div key={option.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`df-cp-${option.id}`}
                              checked={dfCybersecurityProps.includes(option.id)}
                              onCheckedChange={() => toggleCybersecurityProp(option.id, true)}
                            />
                            <Label htmlFor={`df-cp-${option.id}`} className="flex items-center gap-1 text-sm cursor-pointer">
                              <Icon className="w-3 h-3" />
                              {option.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="dar-name">Asset Name</Label>
                    <Input
                      id="dar-name"
                      value={darName}
                      onChange={(e) => setDarName(e.target.value)}
                      placeholder="e.g., Cryptographic Keys"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dar-description">Description</Label>
                    <Textarea
                      id="dar-description"
                      value={darDescription}
                      onChange={(e) => setDarDescription(e.target.value)}
                      placeholder="Describe the stored data..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Component</Label>
                      <Select value={darComponent} onValueChange={setDarComponent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockComponents.map(comp => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dar-partof">Part Of (Subsystem)</Label>
                      <Input
                        id="dar-partof"
                        value={darPartOf}
                        onChange={(e) => setDarPartOf(e.target.value)}
                        placeholder="e.g., Security Subsystem"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Type</Label>
                    <Select value={darStorageType} onValueChange={(v) => setDarStorageType(v as DataAtRestAsset['storageType'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storageTypeOptions.map(option => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Types</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {dataTypeOptions.map(option => (
                        <div key={option.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`dar-dt-${option.id}`}
                            checked={darDataTypes.includes(option.id)}
                            onCheckedChange={() => toggleDataType(option.id, false)}
                          />
                          <Label htmlFor={`dar-dt-${option.id}`} className="text-sm cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cybersecurity Properties (CIA)</Label>
                    <div className="flex gap-4">
                      {cybersecurityPropertyOptions.map(option => {
                        const Icon = getCybersecurityIcon(option.id);
                        return (
                          <div key={option.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`dar-cp-${option.id}`}
                              checked={darCybersecurityProps.includes(option.id)}
                              onCheckedChange={() => toggleCybersecurityProp(option.id, false)}
                            />
                            <Label htmlFor={`dar-cp-${option.id}`} className="flex items-center gap-1 text-sm cursor-pointer">
                              <Icon className="w-3 h-3" />
                              {option.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={activeAssetType === 'data-flow' ? handleAddDataFlowAsset : handleAddDataAtRestAsset}>
                  Add Asset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeAssetType} onValueChange={(v) => setActiveAssetType(v as 'data-flow' | 'data-at-rest')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data-flow" className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Data Flow ({dataFlowAssets.length})
            </TabsTrigger>
            <TabsTrigger value="data-at-rest" className="gap-2">
              <Database className="w-4 h-4" />
              Data At Rest ({dataAtRestAssets.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {activeAssetType === 'data-flow' ? (
          <div className="p-4">
            {dataFlowAssets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <ArrowRightLeft className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-muted-foreground">No Data Flow Assets</h3>
                  <p className="text-sm text-muted-foreground/70 mb-4">
                    Add data flows between components to identify assets in transit
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Data Flow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Source → Target</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Data Types</TableHead>
                    <TableHead>CIA</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataFlowAssets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-xs">{asset.assetId}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">{asset.sourceComponentName}</span>
                        <span className="mx-2 text-primary">→</span>
                        <span className="text-muted-foreground">{asset.targetComponentName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: PROTOCOL_CONFIGS[asset.protocol]?.color }}>
                          {PROTOCOL_CONFIGS[asset.protocol]?.label || asset.protocol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {asset.dataTypes.slice(0, 2).map(dt => (
                            <Badge key={dt} variant="secondary" className="text-xs">
                              {dataTypeOptions.find(o => o.id === dt)?.label || dt}
                            </Badge>
                          ))}
                          {asset.dataTypes.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{asset.dataTypes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {asset.cybersecurityProperties.map(prop => {
                            const Icon = getCybersecurityIcon(prop);
                            return (
                              <span key={prop} title={prop}>
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleDeleteDataFlowAsset(asset.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          <div className="p-4">
            {dataAtRestAssets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Database className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-muted-foreground">No Data At Rest Assets</h3>
                  <p className="text-sm text-muted-foreground/70 mb-4">
                    Add data storage assets to identify data at rest in components
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Data At Rest
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Part Of</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Data Types</TableHead>
                    <TableHead>CIA</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataAtRestAssets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-xs">{asset.assetId}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.componentName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.partOf || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {storageTypeOptions.find(o => o.id === asset.storageType)?.label || asset.storageType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {asset.dataTypes.slice(0, 2).map(dt => (
                            <Badge key={dt} variant="secondary" className="text-xs">
                              {dataTypeOptions.find(o => o.id === dt)?.label || dt}
                            </Badge>
                          ))}
                          {asset.dataTypes.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{asset.dataTypes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                        <div className="flex gap-1">
                          {asset.cybersecurityProperties.map(prop => {
                            const Icon = getCybersecurityIcon(prop);
                            return (
                              <span key={prop} title={prop}>
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </span>
                            );
                          })}
                        </div>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleDeleteDataAtRestAsset(asset.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
