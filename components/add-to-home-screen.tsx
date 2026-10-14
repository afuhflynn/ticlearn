"use client";

import { Plus, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddToHomeScreenProps {
  children?: React.ReactNode;
}

export function AddToHomeScreen({ children }: AddToHomeScreenProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show prompt after user has visited enough pages (simulated with localStorage)
    const visitedPages = localStorage.getItem("ticlearn_pages_visited");
    const pageCount = parseInt(visitedPages || "0");

    if (pageCount >= 2 && !localStorage.getItem("ticlearn_pwa_dismissed")) {
      // Delay showing the prompt
      const timer = setTimeout(() => {
        if (deferredPrompt) {
          setShowDialog(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [deferredPrompt]);

  // Track page visits
  useEffect(() => {
    if (!isMounted) return;

    const visited = localStorage.getItem("ticlearn_pages_visited");
    const count = (parseInt(visited || "0") + 1).toString();
    localStorage.setItem("ticlearn_pages_visited", count);
  }, [isMounted]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    (deferredPrompt as any).prompt();

    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowDialog(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("ticlearn_pwa_dismissed", "true");
    setShowDialog(false);
  };

  // If already installed, don't show anything
  if (isInstalled) {
    return null;
  }

  // Show the guided dialog
  if (!showDialog || !isMounted) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Add TiCLearn to Home Screen
          </DialogTitle>
          <DialogDescription>
            Get quick access to TiCLearn right from your home screen. It works
            just like an app!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Why add TiCLearn?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• One tap to open</li>
              <li>• Works offline (once loaded)</li>
              <li>• No browser bar</li>
              <li>• Faster access</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            Works on Android phones and iPhones (Safari)
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Maybe Later
          </Button>
          <Button onClick={handleInstall} className="flex-1 gap-2">
            <Plus className="h-4 w-4" />
            Add to Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simpler inline component for settings or dashboard
export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-green-500" />
        App installed!
      </p>
    );
  }

  if (!showButton || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className="gap-2"
    >
      <Plus className="h-4 w-4" />
      Add to Home
    </Button>
  );
}
