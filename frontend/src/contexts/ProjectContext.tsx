import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types/tara';
import { api } from '@/lib/api';
import { assessmentToProject } from '@/lib/mappers';
import type { CreateAssessmentBody } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';

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
  documentId?: string;
  templateVersion?: string;
  version?: string;
  authors?: string;
  reviewers?: string;
  confirmationReviewer?: string;
  approver?: string;
  workHistory?: Project['workHistory'];
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: Error | null;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { data: assessments = [], isLoading, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.assessments.list(),
    enabled: !authLoading && isAuthenticated,
  });

  const readMetadata = (id: string): Partial<Project> => {
    try {
      return JSON.parse(localStorage.getItem(`autotara:project:${id}`) ?? '{}') as Partial<Project>;
    } catch {
      return {};
    }
  };

  const projects = assessments.map((assessment) => ({
    ...assessmentToProject(assessment),
    ...readMetadata(assessment.assessment_id),
  }));

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
    const project = assessmentToProject(assessment);
    const metadata: Partial<Project> = {
      catalogVersion: data.catalogVersion ?? project.catalogVersion,
      scope: (data.scope as Project['scope']) ?? project.scope,
      workflowMode: (data.workflowMode as Project['workflowMode']) ?? project.workflowMode,
      objectives: data.objectives,
      directory: data.directory,
      documentId: data.documentId,
      templateVersion: data.templateVersion,
      version: data.version,
      authors: data.authors,
      reviewers: data.reviewers,
      confirmationReviewer: data.confirmationReviewer,
      approver: data.approver,
      workHistory: data.workHistory,
    };
    localStorage.setItem(`autotara:project:${project.id}`, JSON.stringify(metadata));
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    return { ...project, ...metadata };
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    const backendUpdate: { name?: string; description?: string; status?: 'active' | 'archived' } = {};
    if (data.name !== undefined) backendUpdate.name = data.name;
    if (data.description !== undefined) backendUpdate.description = data.description;
    if (data.status === 'active' || data.status === 'archived') backendUpdate.status = data.status;
    if (Object.keys(backendUpdate).length > 0) await api.assessments.update(id, backendUpdate);

    const current = readMetadata(id);
    localStorage.setItem(`autotara:project:${id}`, JSON.stringify({ ...current, ...data }));
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
  };

  const deleteProject = async (id: string) => {
    await api.assessments.delete(id);
    localStorage.removeItem(`autotara:project:${id}`);
    localStorage.removeItem(`autotara:draft:${id}`);
    if (activeProjectId === id) setActiveProjectId(null);
    queryClient.removeQueries({ queryKey: ['assessment', id] });
    queryClient.removeQueries({ queryKey: ['stage-output', id] });
    queryClient.removeQueries({ queryKey: ['stage-catalog', id] });
    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
  };

  const setActiveProject = (id: string | null) => setActiveProjectId(id);

  const getProject = (id: string) => projects.find(p => p.id === id);

  const activeProject = activeProjectId ? getProject(activeProjectId) ?? null : null;

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      isLoading,
      error: error instanceof Error ? error : null,
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
