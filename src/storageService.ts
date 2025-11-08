import { Project, Theme } from './types';

const STORAGE_KEYS = {
  PROJECTS: 'room-planner-projects',
  CURRENT_PROJECT: 'room-planner-current-project',
  THEME: 'room-planner-theme',
} as const;

export const StorageService = {
  saveProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  loadProjects(): Project[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!data) return [];

    const projects = JSON.parse(data);
    return projects.map((p: Project) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      labelFontSize: p.labelFontSize || 12,
      viewTransform: p.viewTransform || { scale: 1, offsetX: 0, offsetY: 0 },
      elements: p.elements.map((e: any) => ({
        ...e,
        fillColor: e.fillColor || e.color || '#ffffff',
      })),
    }));
  },

  saveCurrentProjectId(projectId: string | null): void {
    if (projectId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, projectId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    }
  },

  loadCurrentProjectId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
  },

  saveTheme(theme: Theme): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  loadTheme(): Theme {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  exportProject(project: Project): string {
    return JSON.stringify(project, null, 2);
  },

  importProject(jsonString: string): Project {
    const project = JSON.parse(jsonString);
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      labelFontSize: project.labelFontSize || 12,
      viewTransform: project.viewTransform || { scale: 1, offsetX: 0, offsetY: 0 },
      elements: project.elements.map((e: any) => ({
        ...e,
        fillColor: e.fillColor || e.color || '#ffffff',
      })),
    };
  },

  downloadProject(project: Project): void {
    const json = this.exportProject(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
