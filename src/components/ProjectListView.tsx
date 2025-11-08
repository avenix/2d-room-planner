import React from 'react';
import { Project } from '../types';

interface ProjectListViewProps {
  projects: Project[];
  onCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  theme,
  onToggleTheme,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`project-list-view ${theme}`}>
      <div className="project-list-header">
        <h1>2D Room Planner</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onToggleTheme}
            className="theme-toggle-button"
            style={{ padding: '10px 20px', minWidth: 'auto' }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="create-button" onClick={onCreateProject}>
            + New Project
          </button>
        </div>
      </div>

      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet. Create your first project!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="project-card-content">
                <h3>{project.name}</h3>
                <p className="project-date">Created: {formatDate(project.createdAt)}</p>
                <p className="project-date">Updated: {formatDate(project.updatedAt)}</p>
                <p className="project-elements">{project.elements.length} elements</p>
              </div>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete project "${project.name}"?`)) {
                    onDeleteProject(project.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
