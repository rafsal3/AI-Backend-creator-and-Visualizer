import React, { useState } from 'react';
import { ICONS } from '../constants';

interface ApiKeySetupPageProps {
  onApiKeySelected: () => void;
}

const ApiKeySetupPage: React.FC<ApiKeySetupPageProps> = ({ onApiKeySelected }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('geminiApiKey', apiKey.trim());
      onApiKeySelected();
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl mx-auto text-center bg-gray-800/50 rounded-lg p-8 border border-gray-700 shadow-2xl animate-fade-in-up">
        <div className="inline-block p-4 bg-gray-700 rounded-full mb-6">
          <div className="h-16 w-16 text-indigo-400">
            {React.cloneElement(ICONS.LOGO, { className: 'h-16 w-16 text-indigo-400' })}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to AI Backend Architect
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
          To get started, please enter your Google Gemini API key. Your key will be stored locally in your browser and will not be shared.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
           <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API Key"
            className="w-full max-w-lg bg-gray-900 border border-gray-600 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
            aria-label="Gemini API Key"
            autoFocus
          />
          <button
            type="submit"
            disabled={!apiKey.trim()}
            className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Save &amp; Continue
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-indigo-400 underline pt-2"
          >
            How to get an API key
          </a>
        </form>
      </div>
    </div>
  );
};

export default ApiKeySetupPage;