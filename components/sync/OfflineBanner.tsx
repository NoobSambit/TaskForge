"use client";

import { useEffect, useState, useCallback } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BANNER_DISMISS_KEY = "offline-banner-dismissed";
const AUTO_HIDE_DELAY = 5000;

export function OfflineBanner() {
  const { isOnline, connectionStatus, wasOffline } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISS_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  useEffect(() => {
    if (!isOnline && !isDismissed) {
      setIsVisible(true);
      setJustReconnected(false);
    } else if (isOnline && wasOffline && isVisible) {
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setJustReconnected(false);
      }, AUTO_HIDE_DELAY);
      return () => clearTimeout(timer);
    } else if (isOnline && !wasOffline) {
      setIsVisible(false);
    }
  }, [isOnline, wasOffline, isDismissed, isVisible]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(BANNER_DISMISS_KEY, "true");
  }, []);

  const handleUndo = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(BANNER_DISMISS_KEY);
    if (!isOnline) {
      setIsVisible(true);
    }
  }, [isOnline]);

  if (!isVisible) {
    return null;
  }

  const config = justReconnected
    ? {
        bgColor: "bg-green-600",
        textColor: "text-white",
        icon: "✓",
        title: "Back Online",
        message: "Your connection has been restored. Changes will sync automatically.",
      }
    : {
        bgColor: "bg-orange-600",
        textColor: "text-white",
        icon: "⚠",
        title: "You're Offline",
        message: "Changes will be saved locally and synced when you're back online.",
      };

  return (
    <div className={cn("w-full border-b", config.bgColor)}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn("text-lg", config.textColor)}>{config.icon}</span>
          <div className="flex flex-col">
            <span className={cn("font-semibold", config.textColor)}>{config.title}</span>
            <span className={cn("text-sm", config.textColor, "opacity-90")}>
              {config.message}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className={cn("shrink-0", config.textColor, "hover:bg-white/10")}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
