import React, { useState } from 'react';

interface CommitBarProps {
  onCommit: (message: string) => void;
  disabled?: boolean;
}

const CommitBar: React.FC<CommitBarProps> = ({ onCommit, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onCommit(message);
    setMessage('');
  };

  return (
    <div className="flex-shrink-0 p-2 border-t border-gray-700 bg-gray-800">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message (optional)"
          disabled={disabled}
          className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-semibold text-sm"
        >
          Commit
        </button>
      </form>
    </div>
  );
};

export default CommitBar;
