import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid3X3, 
  MousePointer2,
  Move,
  Sparkles,
  LayoutGrid,
  ArrowRightLeft,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface VisualizerToolbarProps {
  tool: 'select' | 'pan';
  onToolChange: (tool: 'select' | 'pan') => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAIScan: () => void;
  isScanning: boolean;
  onAutoLayout: (direction: 'horizontal' | 'vertical') => void;
}

export function VisualizerToolbar({
  tool,
  onToolChange,
  showGrid,
  onToggleGrid,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAIScan,
  isScanning,
  onAutoLayout,
}: VisualizerToolbarProps) {
  return (
    <div className="h-10 px-3 flex items-center gap-2 border-b border-border bg-card/50 shrink-0">
      {/* Tool Selection */}
      <div className="flex items-center bg-muted/50 rounded-md p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", tool === 'select' && "bg-background shadow-sm")}
              onClick={() => onToolChange('select')}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select (V)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", tool === 'pan' && "bg-background shadow-sm")}
              onClick={() => onToolChange('pan')}
            >
              <Move className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pan (H)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Grid Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", showGrid && "bg-muted")}
            onClick={onToggleGrid}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle Grid</TooltipContent>
      </Tooltip>

      {/* Auto Layout */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Auto Layout</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onAutoLayout('horizontal')}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Horizontal Layout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout('vertical')}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Vertical Layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* AI Scan Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isScanning ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-7 gap-2 font-medium",
              isScanning && "animate-pulse"
            )}
            onClick={onAIScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isScanning ? 'Scanning...' : 'AI Scan'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Discover Assets with AI</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onZoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>
        <span className="text-xs font-mono text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onZoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onFitView}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to View</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
