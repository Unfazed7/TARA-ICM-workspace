import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Project } from '@/types/tara';

interface StatsCardsProps {
  projects: Project[];
}

export function StatsCards({ projects }: StatsCardsProps) {
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalThreats = projects.reduce((sum, p) => sum + (p.threatCount || 0), 0);
  const pendingReviews = projects.filter(p => (p.completionPercentage || 0) < 100).length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const stats = [
    {
      label: 'Total Projects',
      value: projects.length,
      icon: FolderOpen,
      description: `${activeProjects} active`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderAccent: 'border-b-primary',
    },
    {
      label: 'Identified Threats',
      value: totalThreats,
      icon: AlertTriangle,
      description: 'Across all projects',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderAccent: 'border-b-destructive',
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews,
      icon: Clock,
      description: 'Awaiting completion',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderAccent: 'border-b-amber',
    },
    {
      label: 'Completed',
      value: completedProjects,
      icon: CheckCircle2,
      description: 'Fully assessed',
      color: 'text-emerald',
      bgColor: 'bg-emerald/10',
      borderAccent: 'border-b-emerald',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={`bg-white/5 backdrop-blur-md border border-white/10 border-b-2 ${stat.borderAccent}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
