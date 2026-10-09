import { Button } from '@/components/ui/button';
import { FolderPlus, FileText, BookOpen } from 'lucide-react';

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <FolderPlus className="w-12 h-12 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Start your first Threat Analysis & Risk Assessment project to identify and manage 
        cybersecurity risks in your automotive systems.
      </p>
      
      <Button size="lg" onClick={onCreateProject} className="gap-2 mb-8">
        <FolderPlus className="w-5 h-5" />
        Create Your First Project
      </Button>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-card/50">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">ISO 21434 Compliant</p>
            <p className="text-xs text-muted-foreground">
              Built-in templates and workflows for automotive cybersecurity
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-card/50">
          <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Guided Assessment</p>
            <p className="text-xs text-muted-foreground">
              AI-assisted or manual workflows for your needs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
