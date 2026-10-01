import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types/tara';
import { api } from '@/lib/api';
import { assessmentToProject } from '@/lib/mappers';
import type { CreateAssessmentBody } from '@/types/api';

interface CreateProjectData {
  name: string;
  description?: string;
  vehicleType: string;
  catalogVersion?: string;
  domains: string[];
  scope?: string;
  workflowMode?: string;
  objectives?: string;
  directory?: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.assessments.list(),
  });

  const projects = assessments.map(assessmentToProject);

  const createMutation = useMutation({
    mutationFn: (body: CreateAssessmentBody) => api.assessments.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });

  const createProject = async (data: CreateProjectData): Promise<Project> => {
    const assessment = await createMutation.mutateAsync({
      name: data.name,
      description: data.description,
      vehicle_type: data.vehicleType,
      domains: data.domains,
    });
    return assessmentToProject(assessment);
  };

  // Stub — backend update not yet wired; no-op to keep workspace compiling
  const updateProject = (_id: string, _data: Partial<Project>) => {};

  // Stub — backend delete not yet wired; no-op
  const deleteProject = (_id: string) => {};

  const setActiveProject = (id: string | null) => setActiveProjectId(id);

  const getProject = (id: string) => projects.find(p => p.id === id);

  const activeProject = activeProjectId ? getProject(activeProjectId) ?? null : null;

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      isLoading,
      createProject,
      updateProject,
      deleteProject,
      setActiveProject,
      getProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
