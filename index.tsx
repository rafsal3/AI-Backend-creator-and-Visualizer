import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ProjectSelectionPage from './components/ProjectSelectionPage';
import ApiKeySetupPage from './components/ApiKeySetupPage';
import * as projectService from './services/projectService';
import { ICONS } from './constants';

// This is to satisfy TypeScript since this is a global provided by the environment
// FIX: Defined an interface for aistudio to resolve declaration conflicts.
interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
}
declare global {
    interface Window {
        aistudio: AIStudio;
    }
}


const AppManager: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeyReady(hasKey);
            } catch (error) {
                console.error("Error checking for API key:", error);
                // Fallback for environments where aistudio is available but fails
                setIsApiKeyReady(false);
            }
        } else {
            // Fallback for environments where aistudio is not available,
            // assuming key is in process.env from a different source.
            console.warn("window.aistudio not found. Assuming API key is configured elsewhere.");
            setIsApiKeyReady(true); 
        }
    };
    checkApiKey();
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