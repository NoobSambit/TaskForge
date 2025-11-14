"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { ToastContainer, type ToastData } from "@/components/ui/Toast";

interface ToastContextType {
  addToast: (toast: Omit<ToastData, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounterRef = useRef(0);
  const toastIdsRef = useRef(new Set<string>());

  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `toast-${Date.now()}-${idCounterRef.current}`;
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = generateId();
      const newToast: ToastData = { id, ...toast };

      setToasts((prev) => {
        const updatedToasts = [...prev, newToast];
        if (updatedToasts.length > maxToasts) {
          const removedToast = updatedToasts.shift();
          if (removedToast) {
            toastIdsRef.current.delete(removedToast.id);
          }
        }
        toastIdsRef.current.add(id);
        return updatedToasts;
      });

      return id;
    },
    [generateId, maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    toastIdsRef.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
    toastIdsRef.current.clear();
  }, []);

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
