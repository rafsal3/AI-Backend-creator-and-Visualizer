import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ProjectSelectionPage from './components/ProjectSelectionPage';
import * as projectService from './services/projectService';

const AppManager: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // On initial load, try to set the last active project
  useEffect(() => {
    const lastId = localStorage.getItem('lastActiveProjectId');
    if (lastId && projectService.getProject(lastId)) {
      setActiveProjectId(lastId);
    }
  }, []);

  const handleSelectProject = (projectId: string) => {
    localStorage.setItem('lastActiveProjectId', projectId);
    setActiveProjectId(projectId);
  };

  const handleExitProject = () => {
    localStorage.removeItem('lastActiveProjectId');
    setActiveProjectId(null);
  };

  if (!activeProjectId) {
    return <ProjectSelectionPage onSelectProject={handleSelectProject} />;
  }

  return <App projectId={activeProjectId} onExit={handleExitProject} />;
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppManager />
  </React.StrictMode>
);
