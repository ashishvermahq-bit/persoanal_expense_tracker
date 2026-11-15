"use client";

import { useEffect } from "react";

export function PWAInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker for offline support and caching
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }

    // Install prompt handling (for "Add to Home Screen")
    let deferredPrompt: Event | null = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Show install button/prompt to user
      // (could dispatch to a button component or show a banner)
    });

    window.addEventListener("appinstalled", () => {
      console.log("App installed");
      deferredPrompt = null;
    });
  }, []);

  return null; // No UI, just initialization
}
