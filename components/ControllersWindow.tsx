

import React, { useState, useEffect } from 'react';
import { Controller, WindowType } from '../types';
import Window from './Window';
import CodeBlock from './CodeBlock';
import { ICONS } from '../constants';
import HistoryDropdown from './HistoryDropdown';
import CommitBar from './CommitBar';

interface ControllersWindowProps {
  controllers: Controller[];
  revertController: (id: string, timestamp: number) => void;
  onCommit: (message: string) => void;
  onClose: (window: WindowType) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  handleDownload: (code: string, fileName:string) => void;
  isLoading: boolean;
}

const ControllersWindow: React.FC<ControllersWindowProps> = ({ controllers, revertController, onCommit, onClose, addToast, handleDownload, isLoading }) => {
  const [expandedControllers, setExpandedControllers] = useState<Record<string, boolean>>({});
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  const toggleExpand = (id: string) => {
    setExpandedControllers(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <Window title="Controllers" onClose={onClose} windowType={WindowType.Controllers}>
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {controllers.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 py-10">
              <p>No controllers generated.</p>
              <p className="text-sm">Generate APIs, then use the 'Generate' menu in the header.</p>
            </div>
          )}
          {controllers.map(controller => (
            <div key={controller.id} className="bg-gray-700/50 rounded-lg">
              <div className="flex justify-between items-center p-3 cursor-pointer" onClick={() => toggleExpand(controller.id)}>
                <h3 className="font-semibold">{controller.name}</h3>
                <div className="flex items-center space-x-2">
                   <div className="relative">
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              setHistoryMenuId(historyMenuId === controller.id ? null : controller.id);
                          }}
                          className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full"
                          title="View History"
                      >
                          {ICONS.HISTORY}
                      </button>
                      {historyMenuId === controller.id && (
                          <HistoryDropdown
                              history={controller.history}
                              onRevert={(timestamp) => revertController(controller.id, timestamp)}
                              onClose={() => setHistoryMenuId(null)}
                          />
                      )}
                  </div>
                   <span className={`transform transition-transform ${expandedControllers[controller.id] ? 'rotate-180' : ''}`}>
                      {ICONS.CHEVRON_DOWN}
                   </span>
                </div>
              </div>

              {expandedControllers[controller.id] && (
                <div className="px-3 pb-3">
                   <CodeBlock
                    code={controller.code}
                    fileName={controller.name}
                    onCopy={handleCopy}
                    onDownload={handleDownload}
                  />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-center items-center py-10">
                {ICONS.SPINNER}
                <p className="ml-3">Generating controllers...</p>
             </div>
          )}
        </div>
        <div className="shrink-0">
            <CommitBar onCommit={onCommit} disabled={controllers.length === 0 || isLoading} />
        </div>
      </div>
    </Window>
  );
};

export default ControllersWindow;
