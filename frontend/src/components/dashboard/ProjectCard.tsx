import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MoreHorizontal, 
  Trash2, 
  Archive, 
  ExternalLink,
  Car,
  Truck,
  Bike,
  Zap,
  Bus,
  CircleDot
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project, VehicleType } from '@/types/tara';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

const vehicleIcons: Record<VehicleType, typeof Car> = {
  sedan: Car,
  suv: Car,
  truck: Truck,
  electric: Zap,
  commercial: Bus,
  motorcycle: Bike,
  other: CircleDot,
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-500/10 text-emerald-500',
  archived: 'bg-muted text-muted-foreground',
};

export function ProjectCard({ project, onOpen, onDelete, onArchive }: ProjectCardProps) {
  const VehicleIcon = vehicleIcons[project.vehicleType] || Car;
  const completion = project.completionPercentage || 0;
  
  return (
    <Card 
      className="group border-border/50 hover:border-primary/40 transition-all duration-300 cursor-pointer card-elevated bg-card/80 backdrop-blur-sm"
      onClick={() => onOpen(project.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <VehicleIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(project.id); }}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(project.id); }}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {project.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={statusColors[project.status]}>
            {project.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {project.scope}
          </Badge>
          {project.domains.slice(0, 2).map(domain => (
            <Badge key={domain} variant="secondary" className="text-xs">
              {domain}
            </Badge>
          ))}
          {project.domains.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{project.domains.length - 2}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completion}%</span>
          </div>
          <Progress value={completion} className="h-1.5" />
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span>{project.threatCount || 0} threats</span>
          <span>{project.catalogVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}
