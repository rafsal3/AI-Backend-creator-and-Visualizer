import React from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
}

const ToastContainer: React.FC<ToastProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg text-white animate-fade-in-up ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;