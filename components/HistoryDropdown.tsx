import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryDropdownProps<T> {
  history: HistoryEntry<T>[];
  onRevert: (timestamp: number) => void;
  onClose: () => void;
}

const HistoryDropdown = <T,>({ history, onRevert, onClose }: HistoryDropdownProps<T>) => {
  if (history.length === 0) {
    return (
       <div className="absolute right-0 mt-2 w-56 bg-gray-600 rounded-md shadow-lg z-20 p-4 text-sm text-center">
        No history for this item yet.
      </div>
    )
  }

  return (
    <div className="absolute right-0 mt-2 w-64 bg-gray-600 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
      <ul className="divide-y divide-gray-500">
        {history.map(entry => (
          <li key={entry.timestamp} className="p-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <button
                onClick={() => {
                  onRevert(entry.timestamp);
                  onClose();
                }}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded"
              >
                Revert
              </button>
            </div>
            {entry.message && (
                <p className="text-sm mt-1 italic text-gray-200 truncate" title={entry.message}>"{entry.message}"</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryDropdown;
