import { Project, ProjectState, WindowType } from '../types';

const PROJECTS_STORAGE_KEY = 'aiBackendArchitectProjects';

const getInitialProjectState = (): ProjectState => ({
  models: [],
  apiCollections: [
    {
      id: `coll-uncategorized-${Date.now()}`,
      name: 'Uncategorized',
      apis: []
    }
  ],
  controllers: [],
  routes: [],
  middlewares: [],
  visibleWindows: [WindowType.Models],
  activeFramework: 'Node.js',
});

// Helper to get all projects as a map
const getAllProjectsMap = (): Map<string, Project> => {
  try {
    const projectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!projectsJson) return new Map();
    const projectsObject = JSON.parse(projectsJson);
    return new Map(Object.entries(projectsObject));
  } catch (e) {
    console.error("Failed to load projects from localStorage", e);
    return new Map();
  }
};

// Helper to save all projects from a map
const saveAllProjectsMap = (projectsMap: Map<string, Project>): void => {
  try {
    const projectsObject = Object.fromEntries(projectsMap);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectsObject));
  } catch (e) {
    console.error("Failed to save projects to localStorage", e);
  }
};

export const getProjects = (): Project[] => {
  const projectsMap = getAllProjectsMap();
  return Array.from(projectsMap.values()).sort((a, b) => b.lastModified - a.lastModified);
};

export const getProject = (id: string): Project | null => {
  const projectsMap = getAllProjectsMap();
  return projectsMap.get(id) || null;
};

export const saveProject = (project: Project): void => {
  const projectsMap = getAllProjectsMap();
  projectsMap.set(project.id, { ...project, lastModified: Date.now() });
  saveAllProjectsMap(projectsMap);
};

export const createProject = (name: string, state?: ProjectState): Project => {
  const newProject: Project = {
    id: `proj-${Date.now()}-${Math.random()}`,
    name,
    lastModified: Date.now(),
    state: state || getInitialProjectState(),
  };
  saveProject(newProject);
  return newProject;
};

export const deleteProject = (id: string): void => {
  const projectsMap = getAllProjectsMap();
  projectsMap.delete(id);
  saveAllProjectsMap(projectsMap);
};
