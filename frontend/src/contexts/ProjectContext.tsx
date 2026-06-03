import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Project, ProjectDomain, ProjectScope, ProjectStatus, VehicleType, WorkflowMode } from '@/types/tara';
import { loadProjectsFromDB, saveProjectToDB, deleteProjectFromDB, saveAllProjectsToDB } from '@/lib/database';

interface CreateProjectData {
  name: string;
  description?: string;
  vehicleType: VehicleType;
  catalogVersion: string;
  domains: ProjectDomain[];
  scope: ProjectScope;
  workflowMode: WorkflowMode;
  objectives?: string;
  directory?: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  createProject: (data: CreateProjectData) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const ACTIVE_PROJECT_KEY = 'autotara-active-project';
const LEGACY_STORAGE_KEY = 'autotara-projects';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from IndexedDB on mount (with localStorage migration)
  useEffect(() => {
    async function loadProjects() {
      try {
        let dbProjects = await loadProjectsFromDB();

        // Migrate from localStorage if IndexedDB is empty but localStorage has data
        if (dbProjects.length === 0) {
          const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Project[];
              if (parsed.length > 0) {
                await saveAllProjectsToDB(parsed);
                dbProjects = parsed;
              }
            } catch (e) {
              console.error('Failed to parse legacy localStorage projects:', e);
            }
          }
        }

        setProjects(dbProjects);
      } catch (e) {
        console.error('Failed to load projects from DB:', e);
        // Fallback to localStorage
        const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) {
          try {
            setProjects(JSON.parse(stored));
          } catch { /* ignore */ }
        }
      }

      const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (activeId) {
        setActiveProjectId(activeId);
      }
      setIsLoading(false);
    }

    loadProjects();
  }, []);

  // Also keep localStorage in sync (backup)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects, isLoading]);

  // Persist active project ID
  useEffect(() => {
    if (!isLoading) {
      if (activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    }
  }, [activeProjectId, isLoading]);

  const createProject = useCallback((data: CreateProjectData): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...data,
      status: 'active' as ProjectStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      threatCount: 0,
      riskCount: 0,
      completionPercentage: 0,
    };

    setProjects(prev => [...prev, newProject]);

    // Save to IndexedDB
    saveProjectToDB(newProject).catch(e => console.error('Failed to save project to DB:', e));

    return newProject;
  }, []);

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p
      );
      // Save updated project to IndexedDB
      const updatedProject = updated.find(p => p.id === id);
      if (updatedProject) {
        saveProjectToDB(updatedProject).catch(e => console.error('Failed to update project in DB:', e));
      }
      return updated;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));

    // Delete from IndexedDB
    deleteProjectFromDB(id).catch(e => console.error('Failed to delete project from DB:', e));

    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  }, [activeProjectId]);

  const setActiveProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
  }, []);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const activeProject = activeProjectId
    ? projects.find(p => p.id === activeProjectId) ?? null
    : null;

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
