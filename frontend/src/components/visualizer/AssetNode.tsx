import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

export interface AssetNodeData {
    label: string;           // editable display name
    assetCategory: string;   // read-only category/class header
    taraScope: string;       // vehicle | domain | component | ecu
}

const scopeColors: Record<string, string> = {
    vehicle: 'border-chart-4 bg-chart-4/10',
    domain: 'border-primary bg-primary/10',
    component: 'border-chart-3 bg-chart-3/10',
    ecu: 'border-amber bg-amber/10',
};

const scopeBadgeColors: Record<string, string> = {
    vehicle: 'border-chart-4/50 text-chart-4',
    domain: 'border-primary/50 text-primary',
    component: 'border-chart-3/50 text-chart-3',
    ecu: 'border-amber/50 text-amber',
};

function AssetNodeComponent({ data, selected, id }: NodeProps<AssetNodeData>) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label);
    const inputRef = useRef<HTMLInputElement>(null);
    const colorClass = scopeColors[data.taraScope] || scopeColors.ecu;
    const badgeColor = scopeBadgeColors[data.taraScope] || scopeBadgeColors.ecu;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commitEdit = useCallback(() => {
        const trimmed = editValue.trim();
        if (trimmed) {
            // Update the node data label — React Flow will pick this up via onNodesChange
            data.label = trimmed;
        } else {
            setEditValue(data.label);
        }
        setIsEditing(false);
    }, [editValue, data]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditValue(data.label);
        setIsEditing(true);
    }, [data.label]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
        }
        if (e.key === 'Escape') {
            setEditValue(data.label);
            setIsEditing(false);
        }
    }, [commitEdit, data.label]);

    return (
        <div
            className={cn(
                "relative px-4 py-3 rounded-lg border-2 min-w-[160px] max-w-[240px] transition-all duration-200",
                colorClass,
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
            />

            <div className="flex flex-col items-center gap-1.5">
                {/* Read-only category sub-label */}
                <Badge variant="outline" className={cn("text-[10px] font-medium uppercase tracking-wider pointer-events-none select-none", badgeColor)}>
                    {data.assetCategory}
                </Badge>

                {/* Icon */}
                <div className="p-1.5 rounded-md bg-background/50">
                    <Package className="w-5 h-5" />
                </div>

                {/* Editable title */}
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="text-sm font-medium text-center bg-background/80 border border-primary/40 rounded px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="text-sm font-medium text-center cursor-text hover:bg-muted/20 rounded px-1 py-0.5 transition-colors"
                        onDoubleClick={handleDoubleClick}
                        title="Double-click to rename"
                    >
                        {data.label}
                    </span>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
            />
        </div>
    );
}

export const AssetNode = memo(AssetNodeComponent);
