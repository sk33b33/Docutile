"use client";

import { useEffect, useState } from "react";
import { Clock, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { useApp } from "@/components/providers/AppProvider";
import { sessionStatus, type SessionStatus } from "@/lib/auth/session";
import { SPLASH_KEY } from "./Splash";

/** Signed-in account and a sign-out button. Renders nothing when sign-in is not configured. */
export function UserMenu() {
  const { user } = useApp();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const expires = user?.expires;

  // Computed after mount (it depends on the clock) and refreshed every minute.
  useEffect(() => {
    const update = () => setStatus(sessionStatus(expires));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [expires]);

  if (!user) return null;
  const label = user.name || user.email;

  async function signOut() {
    setBusy(true);
    try {
      // Forget this session on the device: saved page copies and the "already entered" splash flag.
      for (const key of await caches.keys()) if (key.startsWith("docutile-pages-")) await caches.delete(key);
      sessionStorage.removeItem(SPLASH_KEY);
    } catch {
      /* storage or cache APIs may be unavailable: signing out still proceeds */
    }
    await signOutAction();
  }

  return (
    <div className="no-print mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/40">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-100">{label}</span>
          {user.name && <span className="block truncate text-xs text-slate-400">{user.email}</span>}
        </span>
      </div>
      {status && (
        <p
          role={status.state === "ok" ? undefined : "status"}
          className={`mt-3 flex items-start gap-2 text-xs ${status.state === "ok" ? "text-slate-400" : "text-amber-200"}`}
        >
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {status.label}.
            {status.state !== "ok" && " Sign out and back in to keep working. Packs saved in this browser are not lost."}
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/20 text-slate-100 hover:border-cyan-300/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden /> {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
