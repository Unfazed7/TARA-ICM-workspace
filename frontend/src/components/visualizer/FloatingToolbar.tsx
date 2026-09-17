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
  Loader2,
  Maximize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
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
  onZenMode: () => void;
  isZenMode: boolean;
}

export function FloatingToolbar({
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
  onZenMode,
  isZenMode,
}: FloatingToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Tool Selection */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-full text-muted-foreground hover:text-foreground", tool === 'select' && "bg-white/10 text-foreground")}
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
              className={cn("h-8 w-8 rounded-full text-muted-foreground hover:text-foreground", tool === 'pan' && "bg-white/10 text-foreground")}
              onClick={() => onToolChange('pan')}
            >
              <Move className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pan (H)</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* Grid & Layout */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full text-muted-foreground hover:text-foreground", showGrid && "bg-white/10 text-foreground")}
            onClick={onToggleGrid}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle Grid</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Auto Layout</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center" side="top" className="mb-2">
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

      <div className="w-px h-5 bg-white/10" />

      {/* AI Scan */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 rounded-full font-medium text-muted-foreground hover:text-foreground px-3",
              isScanning && "bg-white/10 text-foreground animate-pulse"
            )}
            onClick={onAIScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span className="text-xs hidden sm:inline">
              {isScanning ? 'Scanning' : 'AI Scan'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Discover Assets with AI</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-white/10" />

      {/* Zoom Controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={onZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>
      <span className="text-[11px] font-mono text-muted-foreground w-10 text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={onZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={onFitView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to View</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-white/10" />

      {/* Zen Mode */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full text-muted-foreground hover:text-foreground", isZenMode && "bg-white/10 text-foreground")}
            onClick={onZenMode}
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
