"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, FolderOpen, LayoutDashboard, LayoutTemplate, Menu, PlusCircle, Settings, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ErrorBanner, Loading } from "@/components/ui/States";
import { LogoMark } from "./Logo";
import { Splash, useSplashEntered } from "./Splash";
import { OfflineBanner } from "./ServiceWorker";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/packs/new", label: "New Pack", icon: PlusCircle },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/library", label: "Document Library", icon: FolderOpen },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                active ? "bg-cyan-400/10 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.5),0_0_20px_rgba(34,211,238,0.25)]" : "text-slate-300 hover:bg-white/10 hover:text-white hover:shadow-[0_0_14px_rgba(139,92,246,0.35)]"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loadState, loadError } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
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
        <div className="mb-6 px-2">{brand}</div>
        <nav aria-label="Primary"><NavList pathname={pathname} /></nav>
        <p className="mt-auto px-2 text-xs text-slate-400">Local-first. Files stay in this browser.</p>
      </aside>

      <header className="no-print border-b border-white/10 bg-slate-950/60 p-3 backdrop-blur-2xl md:hidden">
        <div className="flex items-center justify-between">
          {brand}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded p-2 text-white hover:bg-white/10"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Primary" className="mt-3">
            <NavList pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </nav>
        )}
      </header>

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
