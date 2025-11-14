"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AchievementRarity } from "@/types/gamification";

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  rarity?: AchievementRarity;
  duration?: number;
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
}

const rarityStyles: Record<AchievementRarity, string> = {
  common: "border-gray-400 bg-gray-50 dark:bg-gray-900",
  rare: "border-blue-400 bg-blue-50 dark:bg-blue-950",
  epic: "border-purple-400 bg-purple-50 dark:bg-purple-950",
  legendary: "border-amber-400 bg-amber-50 dark:bg-amber-950",
};

const rarityGradients: Record<AchievementRarity, string> = {
  common: "from-gray-400/20 to-transparent",
  rare: "from-blue-400/20 to-transparent",
  epic: "from-purple-400/20 to-transparent",
  legendary: "from-amber-400/20 to-transparent",
};

export function Toast({
  id,
  title,
  description,
  icon,
  rarity = "common",
  duration = 5000,
  onClose,
}: ToastProps) {
  const shouldAnimate =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const toastVariants = shouldAnimate
    ? {
        initial: { opacity: 0, y: -20, scale: 0.95 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 30,
          },
        },
        exit: {
          opacity: 0,
          scale: 0.95,
          transition: {
            duration: 0.2,
          },
        },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      };

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout={shouldAnimate}
      className={`
        relative overflow-hidden rounded-lg border-2 shadow-lg
        max-w-sm w-full pointer-events-auto
        ${rarityStyles[rarity]}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-r ${rarityGradients[rarity]}`}
      />
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 text-2xl" aria-hidden="true">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => onClose(id)}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close notification"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
      role="region"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
