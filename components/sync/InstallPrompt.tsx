"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const INSTALL_PROMPT_DISMISSED_KEY = "pwa-install-prompt-dismissed";
const INSTALL_PROMPT_SHOWN_KEY = "pwa-install-prompt-shown-count";
const MAX_PROMPT_SHOWS = 3;
const HEURISTIC_DELAY = 30000; // 30 seconds

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "true";
    const shownCount = parseInt(localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY) || "0", 10);
    
    if (isDismissed || shownCount >= MAX_PROMPT_SHOWS) {
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);

      const heuristicTimer = setTimeout(() => {
        if (!isDismissed && shownCount < MAX_PROMPT_SHOWS) {
          setIsVisible(true);
          localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, String(shownCount + 1));
        }
      }, HEURISTIC_DELAY);

      return () => clearTimeout(heuristicTimer);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
      }

      setIsVisible(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Install prompt failed", error);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
  }, []);

  const handleLater = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-2 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-2xl">📱</span>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold text-sm">Install App</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Install this app on your device for a better experience and offline access.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInstall} className="flex-1">
                  Install
                </Button>
                <Button size="sm" variant="outline" onClick={handleLater} className="flex-1">
                  Later
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  ✕
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
