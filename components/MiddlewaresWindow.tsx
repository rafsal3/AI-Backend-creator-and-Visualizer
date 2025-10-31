


import React, { useState, useEffect } from 'react';
import { Middleware, WindowType } from '../types';
import Window from './Window';
import CodeBlock from './CodeBlock';
import { ICONS } from '../constants';
import HistoryDropdown from './HistoryDropdown';
import CommitBar from './CommitBar';

interface MiddlewaresWindowProps {
  middlewares: Middleware[];
  revertMiddleware: (id: string, timestamp: number) => void;
  onCommit: (message: string) => void;
  onClose: (window: WindowType) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  handleDownload: (code: string, fileName: string) => void;
  isLoading: boolean;
}

const MiddlewaresWindow: React.FC<MiddlewaresWindowProps> = ({ middlewares, revertMiddleware, onCommit, onClose, addToast, handleDownload, isLoading }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  const toggleExpand = (id: string) => {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <Window title="Middleware" onClose={onClose} windowType={WindowType.Middleware}>
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {middlewares.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 py-10">
              <p>No middleware generated.</p>
              <p className="text-sm">Use the 'Generate' menu in the header.</p>
            </div>
          )}
          {middlewares.map(middleware => (
            <div key={middleware.id} className="bg-gray-700/50 rounded-lg">
              <div className="flex justify-between items-center p-3 cursor-pointer" onClick={() => toggleExpand(middleware.id)}>
                <h3 className="font-semibold">{middleware.name}</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              setHistoryMenuId(historyMenuId === middleware.id ? null : middleware.id);
                          }}
                          className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full"
                          title="View History"
                      >
                          {ICONS.HISTORY}
                      </button>
                      {historyMenuId === middleware.id && (
                          <HistoryDropdown
                              history={middleware.history}
                              onRevert={(timestamp) => revertMiddleware(middleware.id, timestamp)}
                              onClose={() => setHistoryMenuId(null)}
                          />
                      )}
                  </div>
                   <span className={`transform transition-transform ${expanded[middleware.id] ? 'rotate-180' : ''}`}>
                      {ICONS.CHEVRON_DOWN}
                   </span>
                </div>
              </div>

              {expanded[middleware.id] && (
                <div className="px-3 pb-3">
                   <CodeBlock
                    code={middleware.code}
                    fileName={middleware.name}
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
                <p className="ml-3">Generating middleware...</p>
             </div>
          )}
        </div>
        <div className="shrink-0">
          <CommitBar onCommit={onCommit} disabled={middlewares.length === 0 || isLoading} />
        </div>
      </div>
    </Window>
  );
};

export default MiddlewaresWindow;
