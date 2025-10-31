import React, { useState } from 'react';
import { ICONS } from '../constants';

interface ChatBoxProps {
  onSendMessage: (message: string) => void;
  placeholder: string;
  isLoading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ onSendMessage, placeholder, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="p-2 border-t border-gray-700">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-grow bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center font-semibold text-sm"
        >
          {isLoading ? <>{ICONS.SPINNER}</> : 'Generate'}
        </button>
      </form>
    </div>
  );
};

export default ChatBox;