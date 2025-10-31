import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ProjectSelectionPage from './components/ProjectSelectionPage';
import ApiKeySetupPage from './components/ApiKeySetupPage';
import * as projectService from './services/projectService';
import { ICONS } from './constants';

const AppManager: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);

  useEffect(() => {
    const apiKey = localStorage.getItem('geminiApiKey');
    setIsApiKeyReady(!!apiKey);
  }, []);

  // On initial load, try to set the last active project
  useEffect(() => {
    if (isApiKeyReady) {
      const lastId = localStorage.getItem('lastActiveProjectId');
      if (lastId && projectService.getProject(lastId)) {
        setActiveProjectId(lastId);
      }
    }
  }, [isApiKeyReady]);

  const handleSelectProject = (projectId: string) => {
    localStorage.setItem('lastActiveProjectId', projectId);
    setActiveProjectId(projectId);
  };

  const handleExitProject = () => {
    localStorage.removeItem('lastActiveProjectId');
    setActiveProjectId(null);
  };

  const handleApiKeySelected = () => {
    setIsApiKeyReady(true);
  };
  
  const handleResetApiKey = () => {
    localStorage.removeItem('geminiApiKey');
    setIsApiKeyReady(false);
    // Also reset project selection to provide a clean flow after re-entering key
    setActiveProjectId(null);
    localStorage.removeItem('lastActiveProjectId');
  };
  
  if (isApiKeyReady === null) {
      return (
        <div className="bg-gray-900 h-screen flex justify-center items-center text-white">
            {ICONS.SPINNER} <span className="ml-3">Initializing...</span>
        </div>
      );
  }

  if (!isApiKeyReady) {
      return <ApiKeySetupPage onApiKeySelected={handleApiKeySelected} />;
  }

  if (!activeProjectId) {
    return <ProjectSelectionPage onSelectProject={handleSelectProject} />;
  }

  return <App projectId={activeProjectId} onExit={handleExitProject} onResetApiKey={handleResetApiKey} />;
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