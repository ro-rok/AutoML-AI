import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { useEffect } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_DURATION = {
  error: 5000,
  success: 3000,
  info: 2000,
};

const TOAST_ICONS = {
  error: FiAlertCircle,
  success: FiCheckCircle,
  info: FiInfo,
};

const TOAST_COLORS = {
  error: 'bg-red-900/90 border-red-700',
  success: 'bg-green-900/90 border-green-700',
  info: 'bg-blue-900/90 border-blue-700',
};

export function ErrorToast({ toast, onDismiss }: ErrorToastProps) {
  const Icon = TOAST_ICONS[toast.type];
  const colorClass = TOAST_COLORS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_DURATION[toast.type]);

    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${colorClass} border backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[320px] max-w-md`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white break-words">{toast.message}</p>
          
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-xs font-medium text-white hover:text-gray-200 underline flex items-center gap-1"
            >
              <FiRefreshCw className="w-3 h-3" />
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="text-white/70 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ErrorToast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
