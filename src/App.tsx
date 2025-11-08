import React, { useState, useEffect, useCallback } from 'react';
import { ProjectListView } from './components/ProjectListView';
import { CanvasView } from './components/CanvasView';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Project, CanvasElement, Theme } from './types';
import { StorageService } from './storageService';
import './App.css';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [tool, setTool] = useState<'select' | 'line' | 'rectangle' | 'text' | 'door' | 'circle'>('select');
  const [theme, setTheme] = useState<Theme>('light');
  const [history, setHistory] = useState<Project[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const loadedProjects = StorageService.loadProjects();
    const loadedTheme = StorageService.loadTheme();
    const loadedProjectId = StorageService.loadCurrentProjectId();

    setProjects(loadedProjects);
    setTheme(loadedTheme);

    if (loadedProjectId && loadedProjects.find(p => p.id === loadedProjectId)) {
      setCurrentProjectId(loadedProjectId);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      StorageService.saveProjects(projects);
    }
  }, [projects]);

  useEffect(() => {
    StorageService.saveCurrentProjectId(currentProjectId);
  }, [currentProjectId]);

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const saveHistory = useCallback((newProjects: Project[]): void => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(projects)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setProjects(newProjects);
  }, [history, historyIndex, projects]);

  const saveCurrentStateToHistory = useCallback((): void => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(projects)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, projects]);

  const undo = useCallback((): void => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProjects(JSON.parse(JSON.stringify(previousState)));
    }
  }, [history, historyIndex]);

  const redo = useCallback((): void => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProjects(JSON.parse(JSON.stringify(nextState)));
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const createProject = useCallback((): void => {
    const newProject: Project = {
      id: generateId(),
      name: `Project ${projects.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      elements: [],
      pixelsPerCm: 10,
      labelFontSize: 12,
    };
    setProjects([...projects, newProject]);
    setCurrentProjectId(newProject.id);
  }, [projects]);

  const deleteProject = useCallback((projectId: string): void => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
    }
  }, [projects, currentProjectId]);

  const selectProject = useCallback((projectId: string): void => {
    setCurrentProjectId(projectId);
    setSelectedElementIds([]);
  }, []);

  const backToProjects = useCallback((): void => {
    setCurrentProjectId(null);
    setSelectedElementIds([]);
  }, []);

  const addElement = useCallback((element: CanvasElement): void => {
    if (!currentProjectId) return;

    const newProjects = projects.map(p =>
      p.id === currentProjectId
        ? { ...p, elements: [...p.elements, element], updatedAt: new Date() }
        : p
    );
    saveHistory(newProjects);
  }, [currentProjectId, projects, saveHistory]);

  const addMultipleElements = useCallback((elements: CanvasElement[]): void => {
    if (!currentProjectId) return;

    const newProjects = projects.map(p =>
      p.id === currentProjectId
        ? { ...p, elements: [...p.elements, ...elements], updatedAt: new Date() }
        : p
    );
    saveHistory(newProjects);
  }, [currentProjectId, projects, saveHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<CanvasElement>, skipHistory: boolean = false): void => {
    if (!currentProjectId) return;

    const updateFn = (prevProjects: Project[]) => {
      return prevProjects.map(p => {
        if (p.id !== currentProjectId) return p;

        return {
          ...p,
          elements: p.elements.map(e => {
            if (e.id !== elementId) return e;

            const updated = { ...e, ...updates } as CanvasElement;

            if (updated.type === 'line' && updated.endX !== undefined && updated.endY !== undefined) {
              const dx = updated.endX - updated.x;
              const dy = updated.endY - updated.y;
              const pixels = Math.sqrt(dx * dx + dy * dy);
              updated.lengthCm = pixels / p.pixelsPerCm;
            } else if (updated.type === 'rectangle' && updated.width !== undefined && updated.height !== undefined) {
              updated.widthCm = updated.width / p.pixelsPerCm;
              updated.heightCm = updated.height / p.pixelsPerCm;
            } else if (updated.type === 'circle' && updated.radius !== undefined) {
              updated.radiusCm = updated.radius / p.pixelsPerCm;
            }

            return updated;
          }),
          updatedAt: new Date()
        };
      });
    };

    if (skipHistory) {
      setProjects(updateFn);
    } else {
      setProjects(prevProjects => {
        const newProjects = updateFn(prevProjects);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(prevProjects))]);
        setHistoryIndex(prev => prev + 1);
        return newProjects;
      });
    }
  }, [currentProjectId, historyIndex]);

  const updateMultipleElements = useCallback((elementIds: string[], updates: Partial<CanvasElement>): void => {
    if (!currentProjectId) return;

    setProjects(prevProjects => {
      const newProjects = prevProjects.map(p => {
        if (p.id !== currentProjectId) return p;

        return {
          ...p,
          elements: p.elements.map(e => {
            if (!elementIds.includes(e.id)) return e;

            const updated = { ...e, ...updates } as CanvasElement;

            if (updated.type === 'line' && updated.endX !== undefined && updated.endY !== undefined) {
              const dx = updated.endX - updated.x;
              const dy = updated.endY - updated.y;
              const pixels = Math.sqrt(dx * dx + dy * dy);
              updated.lengthCm = pixels / p.pixelsPerCm;
            } else if (updated.type === 'rectangle' && updated.width !== undefined && updated.height !== undefined) {
              updated.widthCm = updated.width / p.pixelsPerCm;
              updated.heightCm = updated.height / p.pixelsPerCm;
            } else if (updated.type === 'circle' && updated.radius !== undefined) {
              updated.radiusCm = updated.radius / p.pixelsPerCm;
            }

            return updated;
          }),
          updatedAt: new Date()
        };
      });

      setHistory(prev => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(prevProjects))]);
      setHistoryIndex(prev => prev + 1);
      return newProjects;
    });
  }, [currentProjectId, historyIndex]);

  const deleteElement = useCallback((elementId: string): void => {
    if (!currentProjectId) return;

    const newProjects = projects.map(p =>
      p.id === currentProjectId
        ? {
            ...p,
            elements: p.elements.filter(e => e.id !== elementId),
            updatedAt: new Date()
          }
        : p
    );
    saveHistory(newProjects);
    setSelectedElementIds([]);
  }, [currentProjectId, projects, saveHistory]);

  const deleteMultipleElements = useCallback((elementIds: string[]): void => {
    if (!currentProjectId) return;

    const newProjects = projects.map(p =>
      p.id === currentProjectId
        ? {
            ...p,
            elements: p.elements.filter(e => !elementIds.includes(e.id)),
            updatedAt: new Date()
          }
        : p
    );
    saveHistory(newProjects);
    setSelectedElementIds([]);
  }, [currentProjectId, projects, saveHistory]);

  const updateProjectSettings = useCallback((settings: Partial<Project>): void => {
    if (!currentProjectId) return;

    setProjects(projects.map(p =>
      p.id === currentProjectId
        ? { ...p, ...settings, updatedAt: new Date() }
        : p
    ));
  }, [currentProjectId, projects]);

  const renameProject = useCallback((name: string): void => {
    if (!currentProjectId) return;

    setProjects(projects.map(p =>
      p.id === currentProjectId
        ? { ...p, name, updatedAt: new Date() }
        : p
    ));
  }, [currentProjectId, projects]);

  const exportProject = useCallback((): void => {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      StorageService.downloadProject(project);
    }
  }, [currentProjectId, projects]);

  const importProject = useCallback((file: File): void => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedProject = StorageService.importProject(json);
        importedProject.id = generateId();
        importedProject.updatedAt = new Date();

        setProjects([...projects, importedProject]);
        alert('Project imported successfully!');
      } catch (error) {
        alert('Error importing project. Please check the file format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }, [projects]);

  const toggleTheme = useCallback((): void => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    StorageService.saveTheme(newTheme);
  }, [theme]);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const selectedElements = currentProject?.elements.filter(e => selectedElementIds.includes(e.id)) || [];

  return (
    <div className={`app ${theme}`}>
      {!currentProjectId ? (
        <ProjectListView
          projects={projects}
          onCreateProject={createProject}
          onSelectProject={selectProject}
          onDeleteProject={deleteProject}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : currentProject ? (
        <div className="project-view">
          <CanvasView
            project={currentProject}
            selectedElementIds={selectedElementIds}
            tool={tool}
            theme={theme}
            onAddElement={addElement}
            onAddMultipleElements={addMultipleElements}
            onUpdateElement={updateElement}
            onUpdateMultipleElements={updateMultipleElements}
            onSelectElements={setSelectedElementIds}
            onDeleteElement={deleteElement}
            onDeleteMultipleElements={deleteMultipleElements}
            onSetTool={setTool}
            onBackToProjects={backToProjects}
            onExport={exportProject}
            onImport={importProject}
            onUpdateProjectSettings={updateProjectSettings}
            onRenameProject={renameProject}
            onSaveHistory={saveCurrentStateToHistory}
            onToggleTheme={toggleTheme}
          />
          <PropertiesPanel
            elements={selectedElements}
            onUpdateElement={(updates) => {
              if (selectedElementIds.length === 1) {
                updateElement(selectedElementIds[0], updates);
              } else if (selectedElementIds.length > 1) {
                updateMultipleElements(selectedElementIds, updates);
              }
            }}
            onDeleteElement={() => {
              if (selectedElementIds.length === 1) {
                deleteElement(selectedElementIds[0]);
              } else if (selectedElementIds.length > 1) {
                deleteMultipleElements(selectedElementIds);
              }
            }}
            pixelsPerCm={currentProject.pixelsPerCm}
            theme={theme}
            isCollapsed={isPropertiesPanelCollapsed}
            onToggleCollapse={() => setIsPropertiesPanelCollapsed(!isPropertiesPanelCollapsed)}
          />
        </div>
      ) : null}
      <div className="version-display">v0.1.4</div>
    </div>
  );
};
