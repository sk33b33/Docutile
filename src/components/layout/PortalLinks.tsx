import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { glowForCategory } from "@/lib/carousel/glow";
import { portalCategories, portalsFor } from "@/lib/portals";

/**
 * The official portals, grouped by category, each under that category's colour. They open the official site in a new
 * tab: the sign-in happens there, never in Docutile.
 */
export function PortalLinks({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <div className="space-y-4">
      {portalCategories().map((category) => (
        <section key={category} style={{ "--glow": glowForCategory(category, 0) } as CSSProperties}>
          <Heading className="flex items-start gap-2 text-sm font-semibold text-slate-50">
            <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "rgb(var(--glow))", boxShadow: "0 0 8px rgb(var(--glow) / 0.8)" }} />
            {category}
          </Heading>
          <ul className="mt-1.5 space-y-1.5 pl-4">
            {portalsFor(category).map((p) => (
              <li key={p.id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="group block rounded-md border border-white/10 bg-white/5 p-2 hover:border-cyan-300/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-cyan-200 group-hover:underline">
                    {p.name}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">(opens the official site in a new tab)</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-300">{p.what}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export const PORTAL_NOTE = "These open the official sites in a new tab. You sign in there: Docutile never sees your password, and nothing is sent from Docutile to them.";
