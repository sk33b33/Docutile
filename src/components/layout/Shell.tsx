"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, FileStack, FolderOpen, LayoutDashboard, LayoutTemplate, Menu, PlusCircle, Settings, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ErrorBanner, Loading } from "@/components/ui/States";

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
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ${
                active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
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
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white">
      <FileStack className="h-5 w-5 text-teal-300" aria-hidden /> PackFlow
    </Link>
  );

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>

      <aside aria-label="Sidebar" className="no-print hidden w-60 shrink-0 flex-col bg-slate-900 p-4 md:flex">
        <div className="mb-6 px-2">{brand}</div>
        <nav aria-label="Primary"><NavList pathname={pathname} /></nav>
        <p className="mt-auto px-2 text-xs text-slate-400">Local-first. Files stay in this browser.</p>
      </aside>

      <header className="no-print bg-slate-900 p-3 md:hidden">
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

      <main id="main" className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          {loadState === "loading" && <Loading label="Opening local storage…" />}
          {loadState === "error" && (
            <ErrorBanner title="Local storage is unavailable">
              <p>{loadError} PackFlow keeps drafts and files in your browser, so it cannot work without it.</p>
            </ErrorBanner>
          )}
          {loadState === "ready" && children}
        </div>
      </main>
    </div>
  );
}
