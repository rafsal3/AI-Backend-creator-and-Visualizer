import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { WindowType, Model, ApiCollection, Controller, Route, Middleware, Project, ProjectState, Api, HistoryEntry } from './types';
import * as projectService from './services/projectService';
import { useDebouncedEffect } from './hooks/useDebouncedEffect';

import { ICONS, FRAMEWORKS } from './constants';
import ModelsWindow from './components/ModelsWindow';
import ApisWindow from './components/ApisWindow';
import ControllersWindow from './components/ControllersWindow';
import RoutesWindow from './components/RoutesWindow';
import MiddlewaresWindow from './components/MiddlewaresWindow';
import Visualizer from './components/Visualizer';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/Toast';
import { generateControllers, generateRoutes, generateMiddlewares } from './services/geminiService';

// This is to satisfy TypeScript since the JSZip script is loaded in index.html
declare var JSZip: any;

const smartUpdate = <T extends { id: string; name: string; code: string; history: HistoryEntry<Omit<T, 'id' | 'history'>>[] }>(
  existingItems: T[],
  newItems: Omit<T, 'id' | 'history'>[]
): T[] => {
  const newItemsMap = new Map(newItems.map(item => [item.name, item]));
  const existingItemsMap = new Map(existingItems.map(item => [item.name, item]));
  const finalItems: T[] = [];

  // Update existing, add history
  existingItems.forEach(existingItem => {
    const newItemData = newItemsMap.get(existingItem.name);
    if (newItemData) {
      if (existingItem.code !== newItemData.code) {
        // Add current state to history before updating
        const { id, history, ...rest } = existingItem;
        const newHistoryEntry: HistoryEntry<Omit<T, 'id' | 'history'>> = {
          timestamp: Date.now(),
          data: rest,
          message: 'Auto-saved on generation'
        };
        finalItems.push({
          ...existingItem,
          ...newItemData,
          history: [newHistoryEntry, ...existingItem.history],
        });
      } else {
        // No changes, keep as is
        finalItems.push(existingItem);
      }
      newItemsMap.delete(existingItem.name); // Handled
    }
    // If not in newItemsMap, it will be implicitly removed
  });

  // Add brand new items
  newItemsMap.forEach(newItemData => {
    finalItems.push({
      ...(newItemData as T), // Cast is okay because we're adding missing fields
      id: `${newItemData.name}-${Date.now()}`,
      history: [],
    });
  });

  return finalItems;
};

interface AppProps {
  projectId: string;
  onExit: () => void;
  onResetApiKey: () => void;
}

function App({ projectId, onExit, onResetApiKey }: AppProps) {
  // Project-level state
  const [projectName, setProjectName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ProjectState state
  const [visibleWindows, setVisibleWindows] = useState<WindowType[]>([WindowType.Models]);
  const [activeFramework, setActiveFramework] = useState('Node.js');
  const [models, setModels] = useState<Model[]>([]);
  const [apiCollections, setApiCollections] = useState<ApiCollection[]>([]);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [middlewares, setMiddlewares] = useState<Middleware[]>([]);
  const [isLoading, setIsLoading] = useState({ controllers: false, routes: false, middlewares: false });

  // UI state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'visualizer'>('grid');
  const { toasts, addToast } = useToast();

  const allApis = useMemo(() => apiCollections.flatMap(c => c.apis), [apiCollections]);

  // Load project data on initial render
  useEffect(() => {
    const project = projectService.getProject(projectId);
    if (project) {
        setProjectName(project.name);
        const { state } = project;
        setModels(state.models || []);
        setApiCollections(state.apiCollections || []);
        setControllers(state.controllers || []);
        setRoutes(state.routes || []);
        setMiddlewares(state.middlewares || []);
        setVisibleWindows(state.visibleWindows || [WindowType.Models]);
        setActiveFramework(state.activeFramework || 'Node.js');
    } else {
        addToast('Project not found. It might have been deleted.', 'error');
        onExit();
    }
    setIsLoaded(true);
  }, [projectId, onExit]);


  // Debounced auto-save
  const projectState: ProjectState = useMemo(() => ({
    models,
    apiCollections,
    controllers,
    routes,
    middlewares,
    visibleWindows,
    activeFramework,
  }), [models, apiCollections, controllers, routes, middlewares, visibleWindows, activeFramework]);

  useDebouncedEffect(() => {
    if (!isLoaded) return;
    const projectToSave: Project = {
        id: projectId,
        name: projectName,
        lastModified: Date.now(),
        state: projectState,
    };
    projectService.saveProject(projectToSave);
  }, [projectState, projectName, isLoaded, projectId], 1500);
  

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };
  
  const closeDropdowns = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, [closeDropdowns]);


  const toggleWindow = (window: WindowType) => {
    setVisibleWindows(prev =>
      prev.includes(window)
        ? prev.filter(w => w !== window)
        : [...prev, window].sort((a,b) => Object.values(WindowType).indexOf(a) - Object.values(WindowType).indexOf(b))
    );
     setOpenDropdown(null);
  };

  const availableWindowsToAdd = useMemo(() => {
    const allWindows = Object.values(WindowType);
    return allWindows.filter(w => !visibleWindows.includes(w));
  }, [visibleWindows]);

  const handleDownload = (code: string, fileName: string) => {
    const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`${fileName} downloaded!`, 'success');
  };
  
  const handleDownloadAll = async () => {
    setOpenDropdown(null);
    if ([models, controllers, routes, middlewares].every(arr => arr.length === 0)) {
        addToast('Nothing to download!', 'error');
        return;
    }

    const zip = new JSZip();
    const backendFolder = zip.folder(projectName.replace(/\s+/g, '_') || 'backend-project');

    if (middlewares.length > 0) {
        const middlewaresFolder = backendFolder.folder('middleware');
        middlewares.forEach(m => middlewaresFolder.file(m.name, m.code));
    }
    if (models.length > 0) {
        const modelsFolder = backendFolder.folder('models');
        models.forEach(m => modelsFolder.file(`${m.name}.js`, m.code));
    }
    if (controllers.length > 0) {
        const controllersFolder = backendFolder.folder('controllers');
        controllers.forEach(c => controllersFolder.file(c.name, c.code));
    }
    if (routes.length > 0) {
        const routesFolder = backendFolder.folder('routes');
        routes.forEach(r => routesFolder.file(r.name, r.code));
    }
    
    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectName.replace(/\s+/g, '_') || 'backend-project'}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Project downloaded as zip!', 'success');
    } catch(e) {
        console.error(e);
        addToast('Failed to create zip file.', 'error');
    }
  };

    const handleExportProject = () => {
        setOpenDropdown(null);
        const jsonString = JSON.stringify(projectState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectName.replace(/\s+/g, '_') || 'project'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Project exported!', 'success');
    };

  const handleGenerateControllers = useCallback(async () => {
    setOpenDropdown(null);
    if(allApis.length === 0) {
        addToast('Create some APIs first!', 'error');
        return;
    }
    setIsLoading(prev => ({ ...prev, controllers: true }));
    if (!visibleWindows.includes(WindowType.Controllers)) {
      setVisibleWindows(prev => [...prev, WindowType.Controllers].sort());
    }
    try {
        const newControllersData = await generateControllers(models, allApis);
        if(newControllersData) {
            setControllers(prev => smartUpdate(prev, newControllersData));
            addToast('Controllers updated!', 'success');
        } else {
            addToast('Failed to generate controllers', 'error');
        }
    } catch (e) {
        addToast('Error generating controllers', 'error');
    } finally {
        setIsLoading(prev => ({ ...prev, controllers: false }));
    }
  }, [allApis, models, visibleWindows]);

  const handleGenerateRoutes = useCallback(async () => {
    setOpenDropdown(null);
    if(controllers.length === 0) {
        addToast('Generate controllers first!', 'error');
        return;
    }
    setIsLoading(prev => ({ ...prev, routes: true }));
     if (!visibleWindows.includes(WindowType.Routes)) {
      setVisibleWindows(prev => [...prev, WindowType.Routes].sort());
    }
    try {
        const newRoutesData = await generateRoutes(controllers, allApis);
        if(newRoutesData) {
            setRoutes(prev => smartUpdate(prev, newRoutesData));
            addToast('Routes updated!', 'success');
        } else {
            addToast('Failed to generate routes', 'error');
        }
    } catch (e) {
        addToast('Error generating routes', 'error');
    } finally {
        setIsLoading(prev => ({ ...prev, routes: false }));
    }
  }, [controllers, allApis, visibleWindows]);

  const handleGenerateMiddlewares = useCallback(async () => {
    setOpenDropdown(null);
    if (models.length === 0 && allApis.length === 0) {
      addToast('Create some Models or APIs first for context!', 'error');
      return;
    }
    setIsLoading(prev => ({ ...prev, middlewares: true }));
    if (!visibleWindows.includes(WindowType.Middleware)) {
      setVisibleWindows(prev => [...prev, WindowType.Middleware].sort());
    }
    try {
      const newMiddlewaresData = await generateMiddlewares(models, allApis);
      if (newMiddlewaresData) {
        setMiddlewares(prev => smartUpdate(prev, newMiddlewaresData));
        addToast('Middleware updated!', 'success');
      } else {
        addToast('Failed to generate middleware', 'error');
      }
    } catch (e) {
      addToast('Error generating middleware', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, middlewares: false }));
    }
  }, [models, allApis, visibleWindows]);

  // --- Versioning Handlers ---
  
  const updateModel = useCallback((updatedModel: Model) => {
    setModels(prevModels => prevModels.map(m => m.id === updatedModel.id ? updatedModel : m));
  }, []);
  
  const handleCommit = <T extends {id: string, history: any[]}>(
    message: string,
    items: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
      if (items.length === 0) {
          addToast('Nothing to commit.', 'error');
          return;
      }
      const timestamp = Date.now();
      const updatedItems = items.map(item => {
          const { id, history, ...rest } = item;
          
          if (history.length > 0 && JSON.stringify(history[0].data) === JSON.stringify(rest)) {
            return item; // Avoid creating duplicate history entries if nothing has changed
          }
          
          const newHistoryEntry: HistoryEntry<Omit<T, 'id' | 'history'>> = {
              timestamp,
              data: rest,
              message: message || undefined,
          };

          return {
              ...item,
              history: [newHistoryEntry, ...item.history],
          };
      });
      setter(updatedItems);
      addToast(`Committed ${items.length} item(s).`, 'success');
  };

  const handleCommitModels = (message: string) => handleCommit(message, models, setModels);
  const handleCommitControllers = (message: string) => handleCommit(message, controllers, setControllers);
  const handleCommitRoutes = (message: string) => handleCommit(message, routes, setRoutes);
  const handleCommitMiddlewares = (message: string) => handleCommit(message, middlewares, setMiddlewares);

  const handleCommitApis = (message: string) => {
      if (apiCollections.flatMap(c => c.apis).length === 0) {
          addToast('Nothing to commit.', 'error');
          return;
      }

      const timestamp = Date.now();
      const updatedCollections = apiCollections.map(collection => ({
          ...collection,
          apis: collection.apis.map(api => {
              const { id, history, ...rest } = api;
              if (history.length > 0 && JSON.stringify(history[0].data) === JSON.stringify(rest)) {
                return api;
              }
              const newHistoryEntry: HistoryEntry<Omit<Api, 'id' | 'history'>> = {
                  timestamp,
                  data: rest,
                  message: message || undefined
              };
              return {
                  ...api,
                  history: [newHistoryEntry, ...api.history]
              };
          })
      }));
      setApiCollections(updatedCollections);
      addToast('Committed APIs.', 'success');
  };


  const revertItem = <T extends {id: string, history: any[]}>(
      id: string, 
      timestamp: number, 
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      setter(prevItems => prevItems.map(item => {
        if (item.id === id) {
          const historyEntry = item.history.find(h => h.timestamp === timestamp);
          if (!historyEntry) return item;

          const { id: currentId, history: currentHistory, ...currentData } = item;
          const newHistoryEntry = { timestamp: Date.now(), data: currentData, message: 'Reverted' };
          
          const newHistory = item.history.filter(h => h.timestamp !== timestamp);

          return {
            ...item,
            ...historyEntry.data,
            history: [newHistoryEntry, ...newHistory],
          };
        }
        return item;
      }));
      addToast('Item reverted successfully!', 'success');
  };

  const revertModel = (id: string, timestamp: number) => revertItem(id, timestamp, setModels);
  const revertController = (id: string, timestamp: number) => revertItem(id, timestamp, setControllers);
  const revertRoute = (id: string, timestamp: number) => revertItem(id, timestamp, setRoutes);
  const revertMiddleware = (id: string, timestamp: number) => revertItem(id, timestamp, setMiddlewares);

  const revertApi = (collectionId: string, apiId: string, timestamp: number) => {
      setApiCollections(prevCollections => prevCollections.map(collection => {
        if (collection.id === collectionId) {
            const updatedApis = collection.apis.map(api => {
                if(api.id === apiId) {
                    const historyEntry = api.history.find(h => h.timestamp === timestamp);
                    if (!historyEntry) return api;

                    const { id, history, ...currentData } = api;
                    const newHistoryEntry = { timestamp: Date.now(), data: currentData, message: 'Reverted' };
                    const newHistory = api.history.filter(h => h.timestamp !== timestamp);

                    return {
                        ...api,
                        ...historyEntry.data,
                        history: [newHistoryEntry, ...newHistory]
                    };
                }
                return api;
            });
            return { ...collection, apis: updatedApis };
        }
        return collection;
      }));
      addToast('API reverted successfully!', 'success');
  };
  
  const gridLayoutClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  };
  const gridCount = Math.max(1, Math.min(visibleWindows.length, 3));
  const gridClass = `h-full grid gap-4 ${gridLayoutClasses[gridCount] || gridLayoutClasses[3]}`;


  if (!isLoaded) {
    return (
        <div className="bg-gray-900 h-screen flex justify-center items-center text-white">
            {ICONS.SPINNER} <span className="ml-3">Loading Project...</span>
        </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white h-screen flex flex-col font-sans">
      <ToastContainer toasts={toasts} />
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-2 flex justify-between items-center z-30">
        <div className="flex items-center space-x-4">
          <button onClick={onExit} className="flex items-center space-x-2 text-gray-300 hover:text-white">
             {ICONS.LOGO}
            <span className="font-semibold">Projects</span>
          </button>
          <span className="text-gray-600">/</span>
           <div className="flex items-center group">
             {isRenaming ? (
               <input
                 type="text"
                 value={projectName}
                 onChange={(e) => setProjectName(e.target.value)}
                 onBlur={() => setIsRenaming(false)}
                 onKeyDown={(e) => { if (e.key === 'Enter') setIsRenaming(false); }}
                 className="bg-gray-700 text-lg font-bold rounded-md px-2 -ml-2"
                 autoFocus
                />
             ) : (
                <h1 className="font-bold text-lg">{projectName || 'Untitled Project'}</h1>
             )}
             <button onClick={() => setIsRenaming(!isRenaming)} className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                {ICONS.EDIT}
             </button>
           </div>
        </div>

        <div className="flex items-center space-x-2">
            <button
                onClick={() => setViewMode(prev => prev === 'grid' ? 'visualizer' : 'grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'visualizer' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={viewMode === 'grid' ? 'Switch to Visualizer View' : 'Switch to Grid View'}
            >
                {ICONS.VISUALIZE}
            </button>
            <div className="relative dropdown-container">
            <button onClick={() => toggleDropdown('frameworks')} className="px-3 py-1.5 bg-gray-700 rounded-md text-sm font-semibold flex items-center hover:bg-gray-600">
              {activeFramework}
              {ICONS.CHEVRON_DOWN}
            </button>
            {openDropdown === 'frameworks' && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-40">
                {FRAMEWORKS.map(fw => (
                  <button
                    key={fw.name}
                    disabled={!fw.enabled}
                    onClick={() => { setActiveFramework(fw.name); setOpenDropdown(null); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fw.name} {fw.name === activeFramework && '✔'}
                  </button>
                ))}
              </div>
            )}
          </div>
           <div className="relative dropdown-container">
            <button onClick={() => toggleDropdown('file')} className="px-3 py-1.5 bg-gray-700 rounded-md text-sm font-semibold flex items-center hover:bg-gray-600">
              File
              {ICONS.CHEVRON_DOWN}
            </button>
            {openDropdown === 'file' && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-gray-700 rounded-md shadow-lg py-1 z-40">
                 <button onClick={handleExportProject} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Export Project (.json)</button>
              </div>
            )}
          </div>
          <div className="relative dropdown-container">
            <button onClick={() => toggleDropdown('generate')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center">
              Generate
              {ICONS.CHEVRON_DOWN}
            </button>
            {openDropdown === 'generate' && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-gray-700 rounded-md shadow-lg py-1 z-40">
                <button onClick={handleGenerateControllers} disabled={allApis.length === 0 || isLoading.controllers} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50 flex items-center">
                  {isLoading.controllers && ICONS.SPINNER} <span className="ml-2">Controllers</span>
                </button>
                 <button onClick={handleGenerateRoutes} disabled={controllers.length === 0 || isLoading.routes} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50 flex items-center">
                  {isLoading.routes && ICONS.SPINNER} <span className="ml-2">Routes</span>
                </button>
                 <button onClick={handleGenerateMiddlewares} disabled={isLoading.middlewares} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-50 flex items-center">
                  {isLoading.middlewares && ICONS.SPINNER} <span className="ml-2">Middleware</span>
                </button>
              </div>
            )}
          </div>
          <div className="relative dropdown-container">
            <button onClick={() => toggleDropdown('add_window')} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">
              {ICONS.PLUS}
            </button>
            {openDropdown === 'add_window' && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-40">
                {availableWindowsToAdd.length > 0 ? availableWindowsToAdd.map(w => (
                  <button key={w} onClick={() => toggleWindow(w)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600">{w}</button>
                )) : <p className="px-4 py-2 text-sm text-gray-400">All windows open</p>}
              </div>
            )}
          </div>
          <div className="relative dropdown-container">
            <button onClick={() => toggleDropdown('settings')} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600" title="Settings">
              {ICONS.SETTINGS}
            </button>
            {openDropdown === 'settings' && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-gray-700 rounded-md shadow-lg py-1 z-40">
                <button onClick={onResetApiKey} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-600">
                  Change API Key
                </button>
              </div>
            )}
          </div>
          <button onClick={handleDownloadAll} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold flex items-center" title="Download all code as a zip file">
            {ICONS.DOWNLOAD}
            <span className="ml-2">Download All</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4">
        {viewMode === 'grid' ? (
          <div className={gridClass}>
              {visibleWindows.map(windowType => {
                  switch (windowType) {
                  case WindowType.Models:
                      return <ModelsWindow
                          key={WindowType.Models}
                          models={models}
                          updateModel={updateModel}
                          revertModel={revertModel}
                          setModels={setModels}
                          onCommit={handleCommitModels}
                          onClose={toggleWindow}
                          addToast={addToast}
                          handleDownload={handleDownload}
                      />;
                  case WindowType.APIs:
                      return <ApisWindow
                          key={WindowType.APIs}
                          apiCollections={apiCollections}
                          setApiCollections={setApiCollections}
                          revertApi={revertApi}
                          onCommit={handleCommitApis}
                          models={models}
                          onClose={toggleWindow}
                          addToast={addToast}
                          handleDownload={handleDownload}
                      />;
                  case WindowType.Controllers:
                      return <ControllersWindow
                          key={WindowType.Controllers}
                          controllers={controllers}
                          revertController={revertController}
                          onCommit={handleCommitControllers}
                          onClose={toggleWindow}
                          addToast={addToast}
                          handleDownload={handleDownload}
                          isLoading={isLoading.controllers}
                      />;
                  case WindowType.Routes:
                      return <RoutesWindow
                          key={WindowType.Routes}
                          routes={routes}
                          revertRoute={revertRoute}
                          onCommit={handleCommitRoutes}
                          onClose={toggleWindow}
                          addToast={addToast}
                          handleDownload={handleDownload}
                          isLoading={isLoading.routes}
                      />;
                  case WindowType.Middleware:
                      return <MiddlewaresWindow
                          key={WindowType.Middleware}
                          middlewares={middlewares}
                          revertMiddleware={revertMiddleware}
                          onCommit={handleCommitMiddlewares}
                          onClose={toggleWindow}
                          addToast={addToast}
                          handleDownload={handleDownload}
                          isLoading={isLoading.middlewares}
                      />;
                  default:
                      return null;
                  }
              })}
          </div>
        ) : (
          <Visualizer
            models={models}
            apiCollections={apiCollections}
            controllers={controllers}
            routes={routes}
            middlewares={middlewares}
          />
        )}
      </main>
    </div>
  );
}

export default App;