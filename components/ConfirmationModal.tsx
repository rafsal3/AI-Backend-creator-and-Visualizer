import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-up"
      style={{ animationDuration: '0.15s' }}
      onClick={onCancel} // Close on backdrop click
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="text-gray-300 mb-6">{message}</div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md font-semibold text-sm text-white transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
