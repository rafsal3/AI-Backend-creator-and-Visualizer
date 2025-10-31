import React from 'react';
import { ICONS } from '../constants';

interface CodeBlockProps {
  code: string;
  fileName: string;
  onCopy: (code: string) => void;
  onDownload: (code: string, fileName: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, fileName, onCopy, onDownload }) => {
  return (
    <div className="bg-gray-900 rounded-lg my-2 relative group">
      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCopy(code)}
          className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"
          title="Copy code"
        >
          {ICONS.COPY}
        </button>
        <button
          onClick={() => onDownload(code, fileName)}
          className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"
          title={`Download ${fileName}`}
        >
          {ICONS.DOWNLOAD}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto text-cyan-300">
        <code className="language-javascript">{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;