import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { create } from 'zustand';
import { clsx } from 'clsx';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const Toast = () => {
  const { toasts, removeToast } = useToastStore();

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300',
              styles[toast.type]
            )}
          >
            <Icon className={clsx('h-5 w-5', iconStyles[toast.type])} />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
