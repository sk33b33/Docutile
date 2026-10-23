"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogoMark } from "./Logo";

/** Set once the user has entered, so the splash shows once per browser session (tab), not on every reload. */
export const SPLASH_KEY = "docutile:entered";

const listeners = new Set<() => void>();
let entered: boolean | null = null; // null = not read from storage yet

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
function readStored(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === "1";
  } catch {
    return false; // storage blocked: the splash simply shows once per page load
  }
}
const getSnapshot = () => (entered ??= readStored());
const getServerSnapshot = () => false;

/** Remember the tap right away, so a reload during the fade-out does not show the splash again. */
function rememberEntered() {
  try {
    sessionStorage.setItem(SPLASH_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Unmount the splash (called once the fade-out has finished). */
function finishEntering() {
  entered = true;
  listeners.forEach((l) => l());
}

/** True until the user has tapped through the splash screen. */
export function useSplashEntered(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Full-screen "tap to enter" splash with the logo centred. The whole screen is one real button, so tap, click,
 * Enter and Space all work, and it takes focus on load. The app behind it is made inert by the Shell.
 */
export function Splash({ onEntered }: { onEntered: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => buttonRef.current?.focus(), []);

  function enter() {
    if (leaving) return;
    rememberEntered();
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finishEntering();
      onEntered();
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      finishEntering();
      onEntered();
    }, 450);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={enter}
      aria-label="Tap to enter Docutile"
      data-leaving={leaving || undefined}
      className="splash no-print fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-6 px-6 text-center focus-visible:outline-offset-[-8px] focus-visible:outline-cyan-300"
    >
      <span className="splash-logo-wrap" aria-hidden>
        <LogoMark className="splash-logo h-28 w-28 sm:h-36 sm:w-36" />
      </span>
      <span className="title-glow text-4xl font-semibold tracking-tight sm:text-5xl" aria-hidden>
        Docutile
      </span>
      <span className="splash-hint text-sm tracking-[0.3em] text-cyan-100 uppercase" aria-hidden>
        Tap to enter
      </span>
      <span className="absolute bottom-6 px-6 text-xs text-slate-300" aria-hidden>
        Local-first: your files stay in this browser.
      </span>
    </button>
  );
}
