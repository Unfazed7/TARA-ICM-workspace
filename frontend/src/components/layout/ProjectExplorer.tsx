import { useState, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  Cpu,
  Radio,
  Gauge,
  Network,
  Router,
  Plus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectNode, NodeType } from '@/types/tara';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectExplorerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedNode: string | null;
  onSelectNode: (nodeId: string) => void;
}

const nodeIcons: Record<NodeType, typeof Cpu> = {
  folder: Folder,
  ecu: Cpu,
  sensor: Radio,
  actuator: Gauge,
  gateway: Router,
  network: Network,
};

const layerColors: Record<string, string> = {
  powertrain: 'text-emerald',
  infotainment: 'text-chart-3',
  chassis: 'text-amber',
  adas: 'text-chart-4',
  body: 'text-chart-5',
};

const initialNodes: ProjectNode[] = [
  {
    id: 'powertrain',
    name: 'Powertrain',
    type: 'folder',
    layer: 'powertrain',
    expanded: true,
    children: [
      { id: 'ecu-engine', name: 'Engine ECU', type: 'ecu', layer: 'powertrain' },
      { id: 'ecu-transmission', name: 'Transmission ECU', type: 'ecu', layer: 'powertrain' },
      { id: 'sensor-rpm', name: 'RPM Sensor', type: 'sensor', layer: 'powertrain' },
    ],
  },
  {
    id: 'infotainment',
    name: 'Infotainment',
    type: 'folder',
    layer: 'infotainment',
    expanded: false,
    children: [
      { id: 'ecu-head-unit', name: 'Head Unit', type: 'ecu', layer: 'infotainment' },
      { id: 'gateway-telematics', name: 'Telematics Gateway', type: 'gateway', layer: 'infotainment' },
    ],
  },
  {
    id: 'chassis',
    name: 'Chassis & Safety',
    type: 'folder',
    layer: 'chassis',
    expanded: false,
    children: [
      { id: 'ecu-abs', name: 'ABS Module', type: 'ecu', layer: 'chassis' },
      { id: 'ecu-airbag', name: 'Airbag Controller', type: 'ecu', layer: 'chassis' },
    ],
  },
  {
    id: 'networks',
    name: 'Communication Networks',
    type: 'folder',
    expanded: false,
    children: [
      { id: 'net-can-hs', name: 'CAN High-Speed', type: 'network' },
      { id: 'net-can-ls', name: 'CAN Low-Speed', type: 'network' },
      { id: 'net-ethernet', name: 'Automotive Ethernet', type: 'network' },
      { id: 'net-flexray', name: 'FlexRay', type: 'network' },
    ],
  },
];

function TreeNode({
  node,
  depth,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: ProjectNode;
  depth: number;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = node.type === 'folder' && node.expanded ? FolderOpen : nodeIcons[node.type];
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode === node.id;
  const layerColor = node.layer ? layerColors[node.layer] : '';

  return (
    <div className="relative">
      {/* Vertical guide line for hierarchy */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-px bg-border/40"
          style={{ left: `${depth * 16 + 8}px` }}
        />
      )}
      
      <div
        className={cn(
          "tree-node group relative",
          isSelected && "tree-node-selected",
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelectNode(node.id)}
      >
        {hasChildren || node.type === 'folder' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <ChevronRight 
              className={cn(
                "w-4 h-4 text-muted-foreground chevron-rotate",
                node.expanded && "rotate-90"
              )} 
            />
          </button>
        ) : (
          <span className="w-6" />
        )}
        
        <Icon className={cn("w-4 h-4", layerColor || "text-muted-foreground")} />
        
        <span className="flex-1 text-sm truncate">{node.name}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {node.type === 'folder' && (
              <>
                <DropdownMenuItem onClick={() => onAddChild(node.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Node
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onRename(node.id)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {node.expanded && node.children && (
        <div className="animate-accordion-down origin-top">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectExplorer({ 
  collapsed, 
  onToggleCollapse, 
  selectedNode, 
  onSelectNode 
}: ProjectExplorerProps) {
  const [nodes, setNodes] = useState<ProjectNode[]>(initialNodes);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addToParentId, setAddToParentId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('ecu');

  const toggleExpand = useCallback((id: string) => {
    const updateNodes = (nodes: ProjectNode[]): ProjectNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setNodes(updateNodes(nodes));
  }, [nodes]);

  const handleAddChild = (parentId: string) => {
    setAddToParentId(parentId);
    setNewNodeName('');
    setNewNodeType('ecu');
    setAddDialogOpen(true);
  };

  const confirmAddNode = () => {
    if (!newNodeName.trim() || !addToParentId) return;

    const addToParent = (nodes: ProjectNode[]): ProjectNode[] => {
      return nodes.map((node) => {
        if (node.id === addToParentId) {
          const newNode: ProjectNode = {
            id: `${newNodeType}-${Date.now()}`,
            name: newNodeName,
            type: newNodeType,
            layer: node.layer,
          };
          return {
            ...node,
            expanded: true,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.children) {
          return { ...node, children: addToParent(node.children) };
        }
        return node;
      });
    };

    setNodes(addToParent(nodes));
    setAddDialogOpen(false);
    setAddToParentId(null);
  };

  const handleAddFolder = () => {
    const newFolder: ProjectNode = {
      id: `folder-${Date.now()}`,
      name: 'New Component Layer',
      type: 'folder',
      expanded: true,
      children: [],
    };
    setNodes([...nodes, newFolder]);
  };

  const handleRename = (id: string) => {
    // For simplicity, using prompt - in production would use a dialog
    const newName = prompt('Enter new name:');
    if (!newName) return;

    const renameNode = (nodes: ProjectNode[]): ProjectNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: renameNode(node.children) };
        }
        return node;
      });
    };
    setNodes(renameNode(nodes));
  };

  const handleDelete = (id: string) => {
    const deleteNode = (nodes: ProjectNode[]): ProjectNode[] => {
      return nodes
        .filter((node) => node.id !== id)
        .map((node) => {
          if (node.children) {
            return { ...node, children: deleteNode(node.children) };
          }
          return node;
        });
    };
    setNodes(deleteNode(nodes));
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-card border-r border-border flex flex-col">
        <button
          onClick={onToggleCollapse}
          className="p-3 hover:bg-muted transition-colors"
        >
          <PanelLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full glass-panel border-r border-border flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <span className="text-sm font-semibold text-foreground">Project Explorer</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleAddFolder}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleCollapse}
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tree View with improved spacing */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
            onToggleExpand={toggleExpand}
            onAddChild={handleAddChild}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add Node Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Enter node name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-type">Type</Label>
              <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as NodeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecu">ECU</SelectItem>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="actuator">Actuator</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="folder">Folder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddNode}>
              Add Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
