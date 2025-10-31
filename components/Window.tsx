import React from 'react';
import { ICONS } from '../constants';
import { WindowType } from '../types';

interface WindowProps {
  title: string;
  onClose: (window: WindowType) => void;
  windowType: WindowType;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const Window: React.FC<WindowProps> = ({ title, onClose, windowType, children, headerActions }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl flex flex-col h-full border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm rounded-t-lg">
        <h2 className="font-bold text-lg text-white">{title}</h2>
        <div className="flex items-center space-x-2">
          {headerActions}
          <button
            onClick={() => onClose(windowType)}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1"
          >
            {ICONS.CLOSE}
          </button>
        </div>
      </div>

      {/* Scrollable content container */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
};

export default Window;
