"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftOpen } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ErrorBanner, Loading } from "@/components/ui/States";
import { LogoMark } from "./Logo";
import { MenuDrawer } from "./MenuDrawer";
import { NavList } from "./NavList";
import { Splash, useSplashEntered } from "./Splash";
import { OfflineBanner } from "./ServiceWorker";
import { UserMenu } from "./UserMenu";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loadState, loadError } = useApp();
  // The pop-out menu closes by itself when the page changes (a link, or the browser Back button).
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const openMenu = () => setMenuOpenOn(pathname);
  const closeMenu = () => setMenuOpenOn(null);
  const entered = useSplashEntered();

  // Dropping a file outside a tile would make the browser navigate to it; block that globally.
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // The sign-in screen stands alone: no navigation, no splash.
  if (pathname === "/login") return <main id="main">{children}</main>;

  const brand = (
    <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
      <LogoMark className="h-6 w-6" /> Docutile
    </Link>
  );

  return (
    <>
    {/* inert: nothing behind the splash can be focused or read until the user enters */}
    <div className="min-h-screen md:flex" inert={!entered}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-slate-950 focus:p-2 focus:text-white">Skip to content</a>

      <aside aria-label="Sidebar" className="no-print hidden w-64 shrink-0 flex-col border-r border-white/10 bg-slate-950/55 p-4 backdrop-blur-2xl md:flex">
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          {brand}
          <button
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            aria-label="Open all options"
            title="All options"
            className="rounded p-2 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <PanelLeftOpen className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Primary"><NavList pathname={pathname} /></nav>
        <div className="mt-auto">
          <UserMenu />
          <p className="mt-4 px-2 text-xs text-slate-400">Local-first. Files stay in this browser.</p>
        </div>
      </aside>

      <header className="no-print border-b border-white/10 bg-slate-950/60 p-3 backdrop-blur-2xl md:hidden">
        <div className="flex items-center justify-between">
          {brand}
          <button
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            aria-label="Open menu"
            className="rounded p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <MenuDrawer open={menuOpen} pathname={pathname} onClose={closeMenu} />

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none md:p-8">
        <div className="mx-auto max-w-6xl">
          <OfflineBanner />
          {loadState === "loading" && <Loading label="Opening local storage…" />}
          {loadState === "error" && (
            <ErrorBanner title="Local storage is unavailable">
              <p>{loadError} Docutile keeps drafts and files in your browser, so it cannot work without it.</p>
            </ErrorBanner>
          )}
          {loadState === "ready" && children}
        </div>
      </main>
    </div>
    {!entered && <Splash onEntered={() => document.getElementById("main")?.focus()} />}
    </>
  );
}
