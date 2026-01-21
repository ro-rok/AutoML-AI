import { create } from 'zustand';
import type { Toast, ToastType } from '../components/ErrorToast';

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, action?: { label: string; onClick: () => void }) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (type, message, action) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, action }],
    }));
  },
  
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  
  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for common toast types
export const toast = {
  error: (message: string, action?: { label: string; onClick: () => void }) => {
    useToastStore.getState().addToast('error', message, action);
  },
  
  success: (message: string) => {
    useToastStore.getState().addToast('success', message);
  },
  
  info: (message: string) => {
    useToastStore.getState().addToast('info', message);
  },
};
