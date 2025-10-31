

import React, { useState, useEffect } from 'react';
import { Route, WindowType } from '../types';
import Window from './Window';
import CodeBlock from './CodeBlock';
import { ICONS } from '../constants';
import HistoryDropdown from './HistoryDropdown';
import CommitBar from './CommitBar';

interface RoutesWindowProps {
  routes: Route[];
  revertRoute: (id: string, timestamp: number) => void;
  onCommit: (message: string) => void;
  onClose: (window: WindowType) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  handleDownload: (code: string, fileName: string) => void;
  isLoading: boolean;
}

const RoutesWindow: React.FC<RoutesWindowProps> = ({ routes, revertRoute, onCommit, onClose, addToast, handleDownload, isLoading }) => {
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code copied to clipboard!', 'success');
  };

  const toggleExpand = (id: string) => {
    setExpandedRoutes(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <Window title="Routes" onClose={onClose} windowType={WindowType.Routes}>
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {routes.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 py-10">
              <p>No routes generated.</p>
              <p className="text-sm">Generate controllers, then use the 'Generate' menu.</p>
            </div>
          )}
          {routes.map(route => (
            <div key={route.id} className="bg-gray-700/50 rounded-lg">
               <div className="flex justify-between items-center p-3 cursor-pointer" onClick={() => toggleExpand(route.id)}>
                  <h3 className="font-semibold">{route.name}</h3>
                  <div className="flex items-center space-x-2">
                      <div className="relative">
                          <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryMenuId(historyMenuId === route.id ? null : route.id);
                              }}
                              className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700 rounded-full"
                              title="View History"
                          >
                              {ICONS.HISTORY}
                          </button>
                          {historyMenuId === route.id && (
                              <HistoryDropdown
                                  history={route.history}
                                  onRevert={(timestamp) => revertRoute(route.id, timestamp)}
                                  onClose={() => setHistoryMenuId(null)}
                              />
                          )}
                      </div>
                      <span className={`transform transition-transform ${expandedRoutes[route.id] ? 'rotate-180' : ''}`}>
                          {ICONS.CHEVRON_DOWN}
                      </span>
                  </div>
              </div>
              {expandedRoutes[route.id] && (
                  <div className="px-3 pb-3">
                      <CodeBlock
                        code={route.code}
                        fileName={route.name}
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
                <p className="ml-3">Generating routes...</p>
             </div>
          )}
        </div>
        <div className="shrink-0">
            <CommitBar onCommit={onCommit} disabled={routes.length === 0 || isLoading} />
        </div>
      </div>
    </Window>
  );
};

export default RoutesWindow;
