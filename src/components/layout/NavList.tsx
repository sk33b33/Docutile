"use client";

import Link from "next/link";
import { Activity, FolderOpen, LayoutDashboard, LayoutTemplate, PlusCircle, Settings } from "lucide-react";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/packs/new", label: "New Pack", icon: PlusCircle },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/library", label: "Document Library", icon: FolderOpen },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The app's pages, as a list of links. Used by the permanent sidebar and by the pop-out menu. */
export function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
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
