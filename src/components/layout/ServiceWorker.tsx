"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** True while the browser reports no connection. */
export function useOffline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);
}

/**
 * Registers the service worker (production only: it would only get in the way in development), tells it to
 * remember every route you open so it still loads offline, and offers an update when a new version arrives.
 */
export function ServiceWorkerRegister() {
  const { notify } = useToast();
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // A few seconds after loading, when the page has settled, ask the worker to save the main pages for offline use.
        setTimeout(() => {
          if (navigator.onLine) navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: "WARM" })).catch(() => undefined);
        }, 4000);
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          incoming?.addEventListener("statechange", () => {
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              notify("info", "A new version of Docutile is ready. Reload the page to use it.");
            }
          });
        });
      })
      .catch(() => undefined); // an installable app is a bonus, never a requirement
  }, [notify]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "CACHE_URL", url: pathname })).catch(() => undefined);
  }, [pathname]);

  return null;
}

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <p role="status" className="no-print mb-4 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      You are offline. Docutile keeps working: your packs and files are stored in this browser, and exporting does not need a connection.
    </p>
  );
}
