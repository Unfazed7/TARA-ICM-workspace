import { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ECUNode, ECUNodeData } from '@/components/visualizer/ECUNode';
import { GroupNode, GroupNodeData } from '@/components/visualizer/GroupNode';
import { BusNode, BusNodeData } from '@/components/visualizer/BusNode';
import { AssetNode, AssetNodeData } from '@/components/visualizer/AssetNode';
import { ProtocolEdge, ProtocolEdgeData } from '@/components/visualizer/ProtocolEdge';
import { ComponentLibrary } from '@/components/visualizer/ComponentLibrary';
import { FloatingToolbar } from '@/components/visualizer/FloatingToolbar';
import { AIScanOverlay } from '@/components/visualizer/AIScanOverlay';
import { InspectorPanel } from '@/components/layout/InspectorPanel';
import { cn } from '@/lib/utils';
import { CommunicationProtocol } from '@/types/communication-protocols';
import { getLayoutedElements } from '@/utils/dagre-layout';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

// Initial nodes for demo - Bus-based topology
const initialNodes: Node<ECUNodeData | GroupNodeData | BusNodeData>[] = [
  // CAN Buses
  { id: 'can-bus-powertrain', type: 'bus', position: { x: 100, y: 280 }, data: { label: 'CAN-HS (Powertrain)', busType: 'can', orientation: 'horizontal' } },
  { id: 'can-bus-chassis', type: 'bus', position: { x: 500, y: 280 }, data: { label: 'CAN-C (Chassis)', busType: 'can', orientation: 'horizontal' } },
  { id: 'ethernet-backbone', type: 'bus', position: { x: 300, y: 450 }, data: { label: 'Ethernet Backbone', busType: 'ethernet', orientation: 'horizontal' } },

  // Gateway
  { id: 'gateway-1', type: 'ecu', position: { x: 340, y: 140 }, data: { label: 'Central Gateway', nodeType: 'gateway', layer: 'body' } },

  // Powertrain ECUs
  { id: 'engine-ecu', type: 'ecu', position: { x: 50, y: 80 }, data: { label: 'Engine ECU', nodeType: 'ecu', layer: 'powertrain' } },
  { id: 'trans-ecu', type: 'ecu', position: { x: 200, y: 80 }, data: { label: 'Transmission ECU', nodeType: 'ecu', layer: 'powertrain' } },

  // Chassis ECUs
  { id: 'abs-ecu', type: 'ecu', position: { x: 480, y: 80 }, data: { label: 'ABS Module', nodeType: 'ecu', layer: 'chassis' } },
  { id: 'eps-ecu', type: 'ecu', position: { x: 630, y: 80 }, data: { label: 'EPS Controller', nodeType: 'ecu', layer: 'chassis' } },

  // ADAS
  { id: 'adas-ecu', type: 'ecu', position: { x: 200, y: 560 }, data: { label: 'ADAS Controller', nodeType: 'ecu', layer: 'adas' } },
  { id: 'radar-sensor', type: 'ecu', position: { x: 350, y: 560 }, data: { label: 'Front Radar', nodeType: 'sensor', layer: 'adas' } },
  { id: 'camera-sensor', type: 'ecu', position: { x: 500, y: 560 }, data: { label: 'Vision Camera', nodeType: 'sensor', layer: 'adas' } },

  // Infotainment
  { id: 'head-unit', type: 'ecu', position: { x: 650, y: 560 }, data: { label: 'Head Unit', nodeType: 'ecu', layer: 'infotainment' } },
  { id: 'telematics', type: 'ecu', position: { x: 800, y: 560 }, data: { label: 'Telematics Unit', nodeType: 'ecu', layer: 'infotainment' } },
];

const initialEdges: Edge<ProtocolEdgeData>[] = [
  { id: 'e-gw-can-pt', source: 'gateway-1', target: 'can-bus-powertrain', targetHandle: 'top-3', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN-HS' } },
  { id: 'e-gw-can-ch', source: 'gateway-1', target: 'can-bus-chassis', targetHandle: 'top-1', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN-C' } },
  { id: 'e-gw-eth', source: 'gateway-1', target: 'ethernet-backbone', targetHandle: 'top-3', type: 'protocol', data: { protocol: 'ethernet' as CommunicationProtocol, label: '1000BASE-T' } },
  { id: 'e-eng-can', source: 'engine-ecu', target: 'can-bus-powertrain', targetHandle: 'top-1', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN' } },
  { id: 'e-trans-can', source: 'trans-ecu', target: 'can-bus-powertrain', targetHandle: 'top-2', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN' } },
  { id: 'e-abs-can', source: 'abs-ecu', target: 'can-bus-chassis', targetHandle: 'top-2', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN' } },
  { id: 'e-eps-can', source: 'eps-ecu', target: 'can-bus-chassis', targetHandle: 'top-3', type: 'protocol', data: { protocol: 'can' as CommunicationProtocol, label: 'CAN' } },
  { id: 'e-adas-eth', source: 'ethernet-backbone', sourceHandle: 'bottom-1', target: 'adas-ecu', type: 'protocol', data: { protocol: 'ethernet' as CommunicationProtocol, label: '100BASE-T1' } },
  { id: 'e-radar-eth', source: 'ethernet-backbone', sourceHandle: 'bottom-2', target: 'radar-sensor', type: 'protocol', data: { protocol: 'ethernet' as CommunicationProtocol, label: '100BASE-T1' } },
  { id: 'e-cam-eth', source: 'ethernet-backbone', sourceHandle: 'bottom-3', target: 'camera-sensor', type: 'protocol', data: { protocol: 'lvds' as CommunicationProtocol, label: 'LVDS' } },
  { id: 'e-head-eth', source: 'ethernet-backbone', sourceHandle: 'bottom-4', target: 'head-unit', type: 'protocol', data: { protocol: 'ethernet' as CommunicationProtocol, label: '1000BASE-T' } },
  { id: 'e-tele-eth', source: 'ethernet-backbone', sourceHandle: 'bottom-5', target: 'telematics', type: 'protocol', data: { protocol: 'cellular' as CommunicationProtocol, label: '4G/LTE' } },
];

interface ArchitectureVisualizerInnerProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

function ArchitectureVisualizerInner({ onNodeSelect }: ArchitectureVisualizerInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'revealing' | 'complete'>('idle');

  const { getViewport, setViewport, fitView, zoomIn, zoomOut } = useReactFlow();

  const nodeTypes: NodeTypes = useMemo(() => ({
    ecu: ECUNode,
    group: GroupNode,
    bus: BusNode,
    asset: AssetNode,
  }), []);

  const edgeTypes: EdgeTypes = useMemo(() => ({
    protocol: ProtocolEdge,
  }), []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'protocol',
      data: { protocol: 'can' as CommunicationProtocol, label: 'CAN' }
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
    onNodeSelect?.(node.id);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setInspectorOpen(false);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const connectedEdgeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    return new Set(
      edges
        .filter((e) => e.source === hoveredNodeId || e.target === hoveredNodeId)
        .map((e) => e.id)
    );
  }, [hoveredNodeId, edges]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>([hoveredNodeId]);
    edges.forEach((e) => {
      if (e.source === hoveredNodeId) connected.add(e.target);
      if (e.target === hoveredNodeId) connected.add(e.source);
    });
    return connected;
  }, [hoveredNodeId, edges]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    const deletedIds = new Set(deletedNodes.map((n) => n.id));
    setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
    setSelectedNodeId(null);
    setInspectorOpen(false);
    onNodeSelect?.(null);
  }, [setEdges, onNodeSelect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData || !reactFlowWrapper.current) return;

      const template = JSON.parse(templateData);
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const viewport = getViewport();

      const position = {
        x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
        y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
      };

      let nodeType = 'ecu';
      if (template.nodeType === 'group') nodeType = 'group';
      if (template.nodeType === 'bus') nodeType = 'bus';
      if (template.nodeType === 'asset') nodeType = 'asset';

      let nodeData: any;
      if (nodeType === 'asset') {
        nodeData = {
          label: template.label,
          assetCategory: template.assetCategory || '',
          taraScope: template.taraScope || '',
        };
      } else if (nodeType === 'bus') {
        nodeData = { label: template.label, busType: template.busType || 'can', orientation: template.orientation || 'horizontal' };
      } else {
        nodeData = { label: template.label, nodeType: template.nodeType, layer: template.layer };
      }

      const newNode: Node = {
        id: `${template.id}-${Date.now()}`,
        type: nodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [getViewport, setNodes]
  );

  const handleDragStart = useCallback((event: React.DragEvent, template: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleAIScan = useCallback(() => {
    setIsScanning(true);
    setScanPhase('scanning');

    const nodeIds = nodes.map((n) => n.id);
    let flickerIndex = 0;

    const flickerInterval = setInterval(() => {
      if (flickerIndex < nodeIds.length) {
        const nodeId = nodeIds[flickerIndex];
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, isScanning: true } }
              : node
          )
        );
        flickerIndex++;
      } else {
        clearInterval(flickerInterval);
      }
    }, 150);
  }, [nodes, setNodes]);

  const handleScanComplete = useCallback(() => {
    setScanPhase('revealing');

    setNodes((nds) =>
      nds.map((node, index) => {
        const assetTags: string[] = [];
        const hasAISuggestion = Math.random() > 0.7;
        const nodeData = node.data as ECUNodeData | GroupNodeData | BusNodeData;
        const layer = 'layer' in nodeData ? nodeData.layer : undefined;

        if (nodeData.label?.includes('Gateway')) {
          assetTags.push('Network Access', 'Crypto Keys');
        } else if (nodeData.label?.includes('Telematics') || nodeData.label?.includes('Head Unit')) {
          assetTags.push('PII Data', 'Network Access');
        } else if (layer === 'adas' || layer === 'chassis') {
          assetTags.push('Safety Critical');
        } else if (layer === 'powertrain') {
          assetTags.push('Safety Critical');
        }

        return {
          ...node,
          data: {
            ...node.data,
            isScanning: false,
            assetTags: assetTags.length > 0 ? assetTags : undefined,
            hasAISuggestion,
            revealDelay: index * 100,
          },
        };
      })
    );

    setTimeout(() => {
      setScanPhase('complete');
      setIsScanning(false);
    }, 800);
  }, [setNodes]);

  const handleAutoLayout = useCallback((direction: 'horizontal' | 'vertical') => {
    const dagreDirection = direction === 'horizontal' ? 'LR' : 'TB';

    setNodes((currentNodes) => {
      const { nodes: layoutedNodes } = getLayoutedElements(
        currentNodes,
        edges,
        dagreDirection
      );

      // Animate: apply CSS transition on each node
      return layoutedNodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }));
    });

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
  }, [setNodes, edges, fitView]);

  const viewport = getViewport();

  const styledEdges = useMemo(() => {
    if (!hoveredNodeId) return edges;
    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: connectedEdgeIds.has(edge.id) ? 1 : 0.15,
        strokeWidth: connectedEdgeIds.has(edge.id) ? 3 : 1,
      },
    }));
  }, [edges, hoveredNodeId, connectedEdgeIds]);

  const styledNodes = useMemo(() => {
    if (!hoveredNodeId) return nodes;
    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: connectedNodeIds.has(node.id) ? 1 : 0.3,
        transition: 'opacity 0.3s ease',
      },
    }));
  }, [nodes, hoveredNodeId, connectedNodeIds]);

  const toggleZenMode = useCallback(() => {
    setZenMode(prev => !prev);
    if (!zenMode) {
      setLibraryCollapsed(true);
      setInspectorOpen(false);
    }
  }, [zenMode]);

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Collapsible Component Library */}
      <div
        className={cn(
          "h-full shrink-0 transition-all duration-300 ease-out relative",
          zenMode && "!w-0 !opacity-0 !overflow-hidden",
          libraryCollapsed ? "w-0" : "w-72"
        )}
      >
        {!libraryCollapsed && !zenMode && (
          <div className="h-full w-72">
            <ComponentLibrary onDragStart={handleDragStart} />
          </div>
        )}
      </div>

      {/* Library collapse toggle */}
      {!zenMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-8 w-5 rounded-r-md rounded-l-none bg-[#0a0f16]/80 backdrop-blur-sm border border-l-0 border-white/5 text-muted-foreground hover:text-foreground hover:bg-[#0a0f16]"
              style={{ left: libraryCollapsed ? 0 : '288px' }}
              onClick={() => setLibraryCollapsed(!libraryCollapsed)}
            >
              {libraryCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{libraryCollapsed ? 'Show Library' : 'Hide Library'}</TooltipContent>
        </Tooltip>
      )}

      {/* Main Canvas */}
      <div className="flex-1 relative" style={{ backgroundColor: '#05070a' }}>
        <div ref={reactFlowWrapper} className="h-full w-full">
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onDrop={onDrop}
            onDragOver={onDragOver}
            deleteKeyCode={['Backspace', 'Delete']}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            panOnDrag={tool === 'pan'}
            selectionOnDrag={tool === 'select'}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="scan-active"
            proOptions={{ hideAttribution: true }}
          >
            {showGrid && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color="hsl(var(--border) / 0.5)"
              />
            )}
          </ReactFlow>

          {/* AI Scan Overlay */}
          <AIScanOverlay
            isScanning={isScanning}
            onComplete={handleScanComplete}
          />
        </div>

        {/* Floating Toolbar */}
        <FloatingToolbar
          tool={tool}
          onToolChange={setTool}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          zoom={viewport.zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={() => fitView({ padding: 0.2 })}
          onAIScan={handleAIScan}
          isScanning={isScanning}
          onAutoLayout={handleAutoLayout}
          onZenMode={toggleZenMode}
          isZenMode={zenMode}
        />
      </div>

      {/* Inspector Panel - slides over canvas */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full z-20 transition-all duration-300 ease-out",
          zenMode && "!w-0 !opacity-0 !overflow-hidden",
          inspectorOpen ? "w-96" : "w-0"
        )}
      >
        {inspectorOpen && !zenMode && (
          <div className="h-full w-96 bg-[#0a0f16]/95 backdrop-blur-xl border-l border-white/5">
            <InspectorPanel
              open={true}
              onClose={() => setInspectorOpen(false)}
              selectedNodeId={selectedNodeId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ArchitectureVisualizerProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

export function ArchitectureVisualizer({ onNodeSelect }: ArchitectureVisualizerProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureVisualizerInner onNodeSelect={onNodeSelect} />
    </ReactFlowProvider>
  );
}
