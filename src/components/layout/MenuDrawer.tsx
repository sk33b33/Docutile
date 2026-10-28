"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { LogoMark } from "./Logo";
import { NavList } from "./NavList";
import { PORTAL_NOTE, PortalLinks } from "./PortalLinks";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/**
 * The pop-out menu: every option in one slide-out panel (pages, official portals, theme, account). Built on the native
 * <dialog> element, so it traps focus, closes on Escape and hands focus back to the button that opened it.
 */
export function MenuDrawer({ open, pathname, onClose }: { open: boolean; pathname: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // A click on the dimmed area outside the panel lands on the dialog element itself.
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="menu-drawer no-print"
    >
      {open && (
        <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white"><LogoMark className="h-6 w-6" /> Docutile</span>
            <button type="button" onClick={onClose} aria-label="Close menu" className="rounded p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav aria-label="Primary"><NavList pathname={pathname} onNavigate={onClose} /></nav>

          <section aria-labelledby="drawer-portals">
            <h2 id="drawer-portals" className="text-base font-semibold text-slate-50">Official portals</h2>
            <p className="mt-1 text-xs text-slate-300">{PORTAL_NOTE}</p>
            <div className="mt-3"><PortalLinks /></div>
          </section>

          <section aria-labelledby="drawer-theme">
            <h2 id="drawer-theme" className="mb-2 text-base font-semibold text-slate-50">Appearance</h2>
            <ThemeToggle />
          </section>

          <div className="mt-auto">
            <UserMenu />
            <p className="mt-4 text-xs text-slate-400">Local-first. Files stay in this browser.</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
