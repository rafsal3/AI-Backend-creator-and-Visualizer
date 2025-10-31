import React from 'react';
import { ICONS } from '../constants';

interface ApiKeySetupPageProps {
  onApiKeySelected: () => void;
}

const ApiKeySetupPage: React.FC<ApiKeySetupPageProps> = ({ onApiKeySelected }) => {

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // As per guidelines, assume success after triggering the dialog.
        onApiKeySelected();
      } catch (error) {
        console.error("Error opening API key selection:", error);
        // You might want to show an error message to the user here.
      }
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
          This tool leverages the Google Gemini API to help you generate backend code. To get started, you'll need to select your own Gemini API key.
        </p>
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleSelectKey}
            className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-transform transform hover:scale-105"
          >
            Select Your API Key
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-indigo-400 underline"
          >
            Learn more about API keys and billing
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetupPage;
