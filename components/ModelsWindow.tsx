

import React, { useState } from 'react';
import { Model, ModelField, WindowType } from '../types';
import { generateModels } from '../services/geminiService';
import Window from './Window';
import ChatBox from './ChatBox';
import CodeBlock from './CodeBlock';
import ModelEditor from './ModelEditor';
import { ICONS } from '../constants';
import HistoryDropdown from './HistoryDropdown';
import CommitBar from './CommitBar';
import ConfirmationModal from './ConfirmationModal';

/* -------------------------------------------------------------
   Utility: build mongoose model code from field list
------------------------------------------------------------- */
const generateCodeFromFields = (modelName: string, fields: ModelField[]): string => {
  if (!modelName) return '// Model name cannot be empty.';

  const schemaFields = fields
    .map(field => {
      if (!field.name || !field.type) return null;
      const sanitizedName = field.name.replace(/\s+/g, '');
      if (!sanitizedName) return null;
      return `  ${sanitizedName}: { type: ${field.type} }`;
    })
    .filter(Boolean)
    .join(',\n');

  const modelNamePascal = modelName.charAt(0).toUpperCase() + modelName.slice(1);
  const schemaName = `${modelNamePascal.charAt(0).toLowerCase()}${modelNamePascal.slice(1)}Schema`;

  return `const mongoose = require('mongoose');

const ${schemaName} = new mongoose.Schema({
${schemaFields}
}, { timestamps: true });

module.exports = mongoose.model('${modelNamePascal}', ${schemaName});`;
};

/* -------------------------------------------------------------
   Props
------------------------------------------------------------- */
interface ModelsWindowProps {
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  updateModel: (model: Model) => void;
  revertModel: (id: string, timestamp: number) => void;
  onCommit: (message: string) => void;
  onClose: (window: WindowType) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  handleDownload: (code: string, fileName: string) => void;
}

/* -------------------------------------------------------------
   Component
------------------------------------------------------------- */
const ModelsWindow: React.FC<ModelsWindowProps> = ({
  models,
  setModels,
  updateModel,
  revertModel,
  onCommit,
  onClose,
  addToast,
  handleDownload,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [viewModes, setViewModes] = useState<Record<string, 'editor' | 'code'>>({});
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    modelId: string | null;
    modelName: string | null;
  }>({
    isOpen: false,
    modelId: null,
    modelName: null,
  });

  /* ---------- Chat send ---------- */
  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    try {
      const newModels = await generateModels(message);
      if (newModels) {
        setModels(prev => [...prev, ...newModels]);
        addToast(`${newModels.length} model(s) generated successfully!`, 'success');

        // Set view mode for new models, but don't expand them
        const vm: Record<string, 'editor' | 'code'> = {};
        newModels.forEach(m => {
          vm[m.id] = 'code';
        });
        setViewModes(prev => ({ ...prev, ...vm }));
      } else {
        addToast('Failed to generate models. Check console for errors.', 'error');
      }
    } catch (err) {
      addToast('An unexpected error occurred.', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- Helpers ---------- */
  const handleAddModel = () => {
    const newModelName = `NewModel${models.length + 1}`;
    const newModel: Model = {
      id: `model-${Date.now()}-${Math.random()}`,
      name: newModelName,
      fields: [{ name: 'name', type: 'String' }],
      code: generateCodeFromFields(newModelName, [{ name: 'name', type: 'String' }]),
      history: [],
    };
    setModels(prev => [newModel, ...prev]);
    // New models are collapsed by default.
    setViewModes(prev => ({ ...prev, [newModel.id]: 'editor' }));
    addToast('New empty model added.', 'success');
  };

  const handleUpdateModel = (updated: Model) => {
    const modelWithCode = { ...updated, code: generateCodeFromFields(updated.name, updated.fields) };
    updateModel(modelWithCode);
  }
  
  const requestDeleteModel = (id: string) => {
    const modelToDelete = models.find(m => m.id === id);
    if (!modelToDelete) return;
    setConfirmationState({
      isOpen: true,
      modelId: id,
      modelName: modelToDelete.name,
    });
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
    addToast('Model deleted.', 'success');
  };
  
  const handleConfirmDelete = () => {
    if (confirmationState.modelId) {
      deleteModel(confirmationState.modelId);
    }
    handleCancelDelete();
  };
  
  const handleCancelDelete = () => {
    setConfirmationState({ isOpen: false, modelId: null, modelName: null });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  /* ---------- UI toggles ---------- */
  const toggleExpand = (id: string) => setExpandedModels(p => ({ ...p, [id]: !p[id] }));
  const toggleViewMode = (id: string) => setViewModes(p => ({ ...p, [id]: p[id] === 'editor' ? 'code' : 'editor' }));

  /* ---------- Header button ---------- */
  const headerActions = (
    <button
      onClick={handleAddModel}
      className="flex items-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md"
    >
      {ICONS.PLUS}
      Add Model
    </button>
  );

  /* -----------------------------------------------------------
     Render
  ----------------------------------------------------------- */
  return (
    <Window title="Models" onClose={onClose} windowType={WindowType.Models} headerActions={headerActions}>
      <div className="flex flex-col h-full">
        {/* ChatBox moved to top */}
        <div className="shrink-0 border-b border-gray-700">
           <ChatBox
            onSendMessage={handleSendMessage}
            placeholder="e.g., a user model with name and email"
            isLoading={isLoading}
          />
        </div>

        {/* 🌀 Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Empty state */}
          {models.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 py-10">
              <p>No models yet.</p>
              <p className="text-sm">Use the chat or “Add Model” to start.</p>
            </div>
          )}

          {/* Model cards */}
          {models.map(model => {
            const view = viewModes[model.id] || 'code';
            return (
              <div key={model.id} className="bg-gray-700/50 rounded-lg">
                {/* Card header */}
                <div
                  className="flex justify-between items-center p-3 cursor-pointer"
                  onClick={() => toggleExpand(model.id)}
                >
                  <h3 className="font-semibold">{model.name}</h3>
                  <div className="flex items-center space-x-1">
                     <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setHistoryMenuId(historyMenuId === model.id ? null : model.id);
                            }}
                            className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full"
                            title="View History"
                        >
                            {ICONS.HISTORY}
                        </button>
                        {historyMenuId === model.id && (
                            <HistoryDropdown
                                history={model.history}
                                onRevert={(timestamp) => revertModel(model.id, timestamp)}
                                onClose={() => setHistoryMenuId(null)}
                            />
                        )}
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleViewMode(model.id);
                      }}
                      className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full"
                      title={view === 'code' ? 'Switch to Editor' : 'Switch to Code View'}
                    >
                      {view === 'code' ? ICONS.EDIT : ICONS.CODE}
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        requestDeleteModel(model.id);
                      }}
                      className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-gray-700 rounded-full"
                      title="Delete Model"
                    >
                      {ICONS.TRASH}
                    </button>
                    <span className={`transform transition-transform ${expandedModels[model.id] ? 'rotate-180' : ''}`}>
                      {ICONS.CHEVRON_DOWN}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                {expandedModels[model.id] && (
                  <div className="px-3 pb-3">
                    {view === 'editor' ? (
                      <ModelEditor model={model} onModelChange={handleUpdateModel} />
                    ) : (
                      <CodeBlock
                        code={model.code}
                        fileName={`${model.name}.js`}
                        onCopy={handleCopy}
                        onDownload={handleDownload}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading spinner (initial) */}
          {isLoading && models.length === 0 && (
            <div className="flex justify-center items-center py-10">
              {ICONS.SPINNER}
              <p className="ml-3">Generating models…</p>
            </div>
          )}
        </div>

        {/* 📥 Commit bar — pinned to bottom */}
        <div className="shrink-0">
          <CommitBar onCommit={onCommit} disabled={models.length === 0 || isLoading} />
        </div>
      </div>
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        title="Confirm Model Deletion"
        message={`Are you sure you want to delete the "${confirmationState.modelName}" model? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </Window>
  );
};

export default ModelsWindow;
