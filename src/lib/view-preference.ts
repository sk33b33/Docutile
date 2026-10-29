"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "carousel" | "list";

const EVENT = "docutile:view-preference";

function read(key: string): ViewMode {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "carousel" || saved === "list") return saved;
  } catch { /* storage may be blocked: use the default */ }
  // Reduced motion defaults to the plain list; everyone else to the carousel.
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "list" : "carousel";
}

/** Carousel or list, remembered in this browser under `key`. The server and first paint use the carousel. */
export function useViewPreference(key: string): [ViewMode, (v: ViewMode) => void] {
  const view = useSyncExternalStore(
    (cb) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); },
    () => read(key),
    () => "carousel" as ViewMode,
  );
  const set = (v: ViewMode) => {
    try { localStorage.setItem(key, v); } catch { /* a remembered choice is only a convenience */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return [view, set];
}
