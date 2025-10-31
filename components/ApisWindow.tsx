import React, { useState, useEffect, useRef } from 'react';
import { Api, ApiCollection, Model, WindowType } from '../types';
import { generateApis } from '../services/geminiService';
import Window from './Window';
import ChatBox from './ChatBox';
import CodeBlock from './CodeBlock';
import { ICONS } from '../constants';
import HistoryDropdown from './HistoryDropdown';
import CommitBar from './CommitBar';
import ConfirmationModal from './ConfirmationModal';

const UNCATEGORIZED_COLLECTION_NAME = 'Uncategorized';
const CLOSE_ICON_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const formatJsonString = (jsonString: string | undefined | null): string | null => {
    if (!jsonString) return null;
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch (e) {
        return jsonString; // Return raw string if not valid JSON
    }
};

interface ApisWindowProps {
  apiCollections: ApiCollection[];
  setApiCollections: React.Dispatch<React.SetStateAction<ApiCollection[]>>;
  revertApi: (collectionId: string, apiId: string, timestamp: number) => void;
  onCommit: (message: string) => void;
  models: Model[];
  onClose: (window: WindowType) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  handleDownload: (code: string, fileName: string) => void;
}

const ApisWindow: React.FC<ApisWindowProps> = ({ apiCollections, setApiCollections, revertApi, onCommit, models, onClose, addToast, handleDownload }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedApis, setExpandedApis] = useState<Record<string, boolean>>({});
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [movingApi, setMovingApi] = useState<{apiId: string, collectionId: string} | null>(null);
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [collectionConfirmationState, setCollectionConfirmationState] = useState<{
    isOpen: boolean;
    collectionId: string | null;
    collectionName: string | null;
  }>({
    isOpen: false,
    collectionId: null,
    collectionName: null,
  });
  const [apiConfirmationState, setApiConfirmationState] = useState<{
    isOpen: boolean;
    apiId: string | null;
    collectionId: string | null;
    apiName: string | null;
  }>({
    isOpen: false,
    apiId: null,
    collectionId: null,
    apiName: null,
  });

  // Create uncategorized collection if it doesn't exist
  const ensureUncategorizedCollection = () => {
    const hasUncategorized = apiCollections.some(c => c.name === UNCATEGORIZED_COLLECTION_NAME);
    if (!hasUncategorized) {
      const uncategorizedCollection: ApiCollection = {
        id: `coll-uncategorized-${Date.now()}`,
        name: UNCATEGORIZED_COLLECTION_NAME,
        apis: []
      };
      setApiCollections(prev => [...prev, uncategorizedCollection]);
      return uncategorizedCollection.id;
    }
    return apiCollections.find(c => c.name === UNCATEGORIZED_COLLECTION_NAME)?.id || null;
  };

  useEffect(() => {
    // Ensure uncategorized collection exists on mount
    if (apiCollections.length === 0) {
      ensureUncategorizedCollection();
    }
  }, []);

  useEffect(() => {
    if (!activeCollectionId && apiCollections.length > 0) {
      setActiveCollectionId(apiCollections[0].id);
    } else if (activeCollectionId && !apiCollections.some(c => c.id === activeCollectionId)) {
      setActiveCollectionId(apiCollections.length > 0 ? apiCollections[0].id : null);
    }
  }, [apiCollections, activeCollectionId]);

  useEffect(() => {
    if (renamingCollectionId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingCollectionId]);

  const handleSendMessage = async (message: string) => {
    if (models.length === 0) {
      addToast('Please create at least one model before generating APIs.', 'error');
      return;
    }
    
    // Ensure uncategorized collection exists before generating APIs
    ensureUncategorizedCollection();
    
    setIsLoading(true);
    setMovingApi(null);
    try {
      const newCollections = await generateApis(message, models);
      if (newCollections) {
        setApiCollections(prev => {
          const updated = [...prev];
          const collectionMap = new Map(updated.map(c => [c.name, c]));
          
          newCollections.forEach(newCollection => {
            const existing = collectionMap.get(newCollection.name);
            if (existing) {
              existing.apis.push(...newCollection.apis);
            } else {
              updated.push(newCollection);
            }
          });
          return updated;
        });

        addToast(`APIs generated successfully!`, 'success');
        // New APIs are collapsed by default.
      } else {
        addToast('Failed to generate APIs. Check console for errors.', 'error');
      }
    } catch (error) {
      addToast('An unexpected error occurred.', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  const activeCollection = apiCollections.find(c => c.id === activeCollectionId);

  // Collection Handlers
  const handleAddCollection = () => {
    const newName = `Collection ${apiCollections.length + 1}`;
    const newCollection: ApiCollection = {
      id: `coll-${Date.now()}`,
      name: newName,
      apis: []
    };
    setApiCollections(prev => [...prev, newCollection]);
    setActiveCollectionId(newCollection.id);
  };

  const handleRenameCollection = (id: string, newName: string) => {
    setApiCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName || "Untitled" } : c));
    setRenamingCollectionId(null);
  }

  const requestDeleteCollection = (collectionId: string) => {
    const collectionToDelete = apiCollections.find(c => c.id === collectionId);
    if (!collectionToDelete || collectionToDelete.name === UNCATEGORIZED_COLLECTION_NAME) {
      return;
    }
    setCollectionConfirmationState({
      isOpen: true,
      collectionId: collectionId,
      collectionName: collectionToDelete.name,
    });
  };

  const handleCancelCollectionDelete = () => {
    setCollectionConfirmationState({ isOpen: false, collectionId: null, collectionName: null });
  };

  const handleConfirmCollectionDelete = () => {
    const collectionIdToDelete = collectionConfirmationState.collectionId;
    if (!collectionIdToDelete) return;

    setApiCollections(prev => {
      const collectionToDelete = prev.find(c => c.id === collectionIdToDelete);
      if (!collectionToDelete) return prev;

      const apisToMove = [...collectionToDelete.apis];
      const remainingCollections = prev.filter(c => c.id !== collectionIdToDelete);

      let uncategorizedCollection = remainingCollections.find(c => c.name === UNCATEGORIZED_COLLECTION_NAME);
      let updatedCollections;

      if (uncategorizedCollection) {
        updatedCollections = remainingCollections.map(c =>
          c.id === uncategorizedCollection!.id
            ? { ...c, apis: [...c.apis, ...apisToMove] }
            : c
        );
      } else {
        const newUncategorizedCollection: ApiCollection = {
          id: `coll-uncategorized-${Date.now()}`,
          name: UNCATEGORIZED_COLLECTION_NAME,
          apis: apisToMove,
        };
        updatedCollections = [...remainingCollections, newUncategorizedCollection];
      }

      if (activeCollectionId === collectionIdToDelete) {
        const uncategorizedId = updatedCollections.find(c => c.name === UNCATEGORIZED_COLLECTION_NAME)?.id;
        const newActiveId = uncategorizedId || (updatedCollections.length > 0 ? updatedCollections[0].id : null);
        setActiveCollectionId(newActiveId);
      }

      addToast(
        `Collection "${collectionToDelete.name}" deleted. ${apisToMove.length > 0 ? `APIs moved to "${UNCATEGORIZED_COLLECTION_NAME}".` : ''}`,
        'success'
      );
      return updatedCollections;
    });

    handleCancelCollectionDelete();
  };


  // API Handlers
  const toggleExpand = (id: string) => setExpandedApis(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteApi = (apiId: string, fromCollectionId: string) => {
    setApiCollections(prev => prev.map(c => 
      c.id === fromCollectionId 
        ? { ...c, apis: c.apis.filter(a => a.id !== apiId) } 
        : c
    ));
    addToast('API deleted.', 'success');
  };

  const requestDeleteApi = (apiId: string, collectionId: string) => {
    const collection = apiCollections.find(c => c.id === collectionId);
    const apiToDelete = collection?.apis.find(a => a.id === apiId);
    if (!apiToDelete) return;
    setApiConfirmationState({
      isOpen: true,
      apiId,
      collectionId,
      apiName: apiToDelete.name,
    });
  };

  const handleCancelApiDelete = () => {
    setApiConfirmationState({ isOpen: false, apiId: null, collectionId: null, apiName: null });
  };

  const handleConfirmApiDelete = () => {
    if (apiConfirmationState.apiId && apiConfirmationState.collectionId) {
      handleDeleteApi(apiConfirmationState.apiId, apiConfirmationState.collectionId);
    }
    handleCancelApiDelete();
  };

  const handleMoveApi = (apiId: string, fromCollectionId: string, toCollectionId: string) => {
    let apiToMove: Api | undefined;
    
    setApiCollections(prev => {
      // Remove from source collection
      const updatedCollections = prev.map(c => {
        if (c.id === fromCollectionId) {
          apiToMove = c.apis.find(a => a.id === apiId);
          return { ...c, apis: c.apis.filter(a => a.id !== apiId) };
        }
        return c;
      });
      
      // Add to destination collection
      if (apiToMove) {
        return updatedCollections.map(c => {
          if (c.id === toCollectionId) {
            return { ...c, apis: [...c.apis, apiToMove!] };
          }
          return c;
        });
      }
      
      return updatedCollections;
    });

    if (apiToMove) {
      addToast('API moved successfully.', 'success');
    }
    setMovingApi(null);
  };

  const getMethodClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-400';
      case 'POST': return 'text-blue-400';
      case 'PUT': return 'text-yellow-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Window title="APIs" onClose={onClose} windowType={WindowType.APIs}>
      <div className="flex flex-col h-full">
        {/* Collections Tab Bar */}
        <div className="flex-shrink-0 border-b border-gray-700 px-2 pt-2">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar">
            {apiCollections.map(collection => (
              <div key={collection.id} className="relative group flex-shrink-0">
                {renamingCollectionId === collection.id ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    defaultValue={collection.name}
                    onBlur={(e) => handleRenameCollection(collection.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCollection(collection.id, e.currentTarget.value) }}
                    className="bg-gray-900 text-white px-3 py-1.5 rounded-t-md text-sm outline-none ring-2 ring-indigo-500"
                  />
                ) : (
                  <button
                    onClick={() => setActiveCollectionId(collection.id)}
                    onDoubleClick={() => {
                       if (collection.name !== UNCATEGORIZED_COLLECTION_NAME) {
                           setRenamingCollectionId(collection.id)
                       }
                    }}
                    className={`px-3 py-1.5 rounded-t-md text-sm font-semibold transition-colors ${
                      activeCollectionId === collection.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'
                    }`}
                     title={collection.name === UNCATEGORIZED_COLLECTION_NAME ? "This collection cannot be renamed or deleted." : "Double-click to rename"}
                  >
                    {collection.name}
                  </button>
                )}
                 {collection.name !== UNCATEGORIZED_COLLECTION_NAME && renamingCollectionId !== collection.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteCollection(collection.id);
                      }}
                      className="absolute top-0 right-0 p-1 bg-gray-700 rounded-full text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                      style={{ transform: 'translate(40%, -40%)' }}
                      title="Delete collection"
                    >
                      {CLOSE_ICON_SVG}
                    </button>
                )}
              </div>
            ))}
            <button onClick={handleAddCollection} className="flex-shrink-0 text-gray-400 hover:bg-gray-700 rounded-full p-1.5" title="Add Collection">+</button>
          </div>
        </div>

        {/* ChatBox under tabs */}
        <div className="shrink-0 border-b border-gray-700">
           <ChatBox
                onSendMessage={handleSendMessage}
                placeholder="e.g., CRUD endpoints for the user model"
                isLoading={isLoading}
            />
        </div>

        {/* API List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {(!activeCollection && !isLoading) && (
            <div className="text-center text-gray-400 py-10">
              <p>No API collections yet.</p>
              <p className="text-sm">Use "Add Collection" or generate APIs with the chat.</p>
            </div>
          )}
          {(activeCollection && activeCollection.apis.length === 0 && !isLoading) && (
             <div className="text-center text-gray-400 py-10">
              <p>This collection is empty.</p>
              <p className="text-sm">Use the chat to create APIs for this collection.</p>
            </div>
          )}

          {activeCollection?.apis.map(api => {
            const formattedRequest = formatJsonString(api.requestBodyExample);
            const formattedResponse = formatJsonString(api.responseBodyExample);
            const isMoving = movingApi?.apiId === api.id;

            return (
              <div key={api.id} className="bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center p-3 cursor-pointer" onClick={() => toggleExpand(api.id)}>
                  <div>
                    <h3 className="font-semibold">{api.name}</h3>
                    <p className="text-sm text-gray-400">
                      <span className={`font-mono font-bold ${getMethodClass(api.method)}`}>{api.method}</span>
                      <span className="ml-2">{api.endpoint}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setHistoryMenuId(historyMenuId === api.id ? null : api.id);
                            }}
                            className="text-gray-400 hover:text-white p-1 hover:bg-gray-600 rounded-full"
                            title="View History"
                        >
                            {ICONS.HISTORY}
                        </button>
                        {historyMenuId === api.id && (
                            <HistoryDropdown
                                history={api.history}
                                onRevert={(timestamp) => revertApi(activeCollection.id, api.id, timestamp)}
                                onClose={() => setHistoryMenuId(null)}
                            />
                        )}
                    </div>
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setMovingApi(isMoving ? null : {apiId: api.id, collectionId: activeCollection.id}) }} className="text-gray-400 hover:text-white p-1 hover:bg-gray-600 rounded-full">{ICONS.MORE_VERTICAL}</button>
                        {isMoving && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-600 rounded-md shadow-lg z-20">
                                {apiCollections.filter(c => c.id !== activeCollection.id).map(targetColl => (
                                    <button key={targetColl.id} onClick={() => handleMoveApi(api.id, activeCollection.id, targetColl.id)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-500">
                                        Move to "{targetColl.name}"
                                    </button>
                                ))}
                                {apiCollections.length <= 1 && <div className="px-4 py-2 text-sm text-gray-400">No other collections</div>}
                            </div>
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); requestDeleteApi(api.id, activeCollection.id); }} className="text-gray-400 hover:text-red-400 p-1 hover:bg-gray-600 rounded-full" title="Delete API">{ICONS.TRASH}</button>
                    <span className={`transform transition-transform ${expandedApis[api.id] ? 'rotate-180' : ''}`}>{ICONS.CHEVRON_DOWN}</span>
                  </div>
                </div>
                {expandedApis[api.id] && (
                  <div className="px-3 pb-3">
                    <p className="text-sm text-gray-300 mb-2">{api.description}</p>
                    {(formattedRequest || formattedResponse) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
                        {formattedRequest && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1 text-gray-300">Request Example</h4>
                            <CodeBlock code={formattedRequest} fileName="request.json" onCopy={handleCopy} onDownload={handleDownload} />
                          </div>
                        )}
                        {formattedResponse && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1 text-gray-300">Response Example</h4>
                            <CodeBlock code={formattedResponse} fileName="response.json" onCopy={handleCopy} onDownload={handleDownload} />
                          </div>
                        )}
                      </div>
                    )}
                    <h4 className="text-sm font-semibold mt-4 mb-1 text-gray-300">Handler Code</h4>
                    <CodeBlock code={api.code} fileName={`${api.name}.js`} onCopy={handleCopy} onDownload={handleDownload} />
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              {ICONS.SPINNER}
              <p className="ml-3">Generating APIs...</p>
            </div>
          )}
        </div>
        <div className="shrink-0">
            <CommitBar onCommit={onCommit} disabled={apiCollections.flatMap(c => c.apis).length === 0 || isLoading} />
        </div>
      </div>
      <ConfirmationModal
        isOpen={collectionConfirmationState.isOpen}
        title="Confirm Collection Deletion"
        message={
          <>
            <p>Are you sure you want to delete the "<strong>{collectionConfirmationState.collectionName}</strong>" collection?</p>
            <p className="mt-2 text-sm text-gray-400">
              Any APIs within this collection will be moved to the "{UNCATEGORIZED_COLLECTION_NAME}" collection. This action cannot be undone.
            </p>
          </>
        }
        onConfirm={handleConfirmCollectionDelete}
        onCancel={handleCancelCollectionDelete}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
       <ConfirmationModal
        isOpen={apiConfirmationState.isOpen}
        title="Confirm API Deletion"
        message={`Are you sure you want to delete the "${apiConfirmationState.apiName}" API? This action cannot be undone.`}
        onConfirm={handleConfirmApiDelete}
        onCancel={handleCancelApiDelete}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </Window>
  );
};

export default ApisWindow;
