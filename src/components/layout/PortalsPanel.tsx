import { ShieldCheck } from "lucide-react";
import { PORTAL_NOTE, PortalLinks } from "./PortalLinks";

/** Side panel on the dashboard: the official online portals for each main category. */
export function PortalsPanel() {
  return (
    <aside aria-labelledby="portals-title" className="glass rounded-xl p-4">
      <h2 id="portals-title" className="text-base font-semibold">Official portals</h2>
      <p className="mt-1 flex items-start gap-2 text-xs text-slate-300">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {PORTAL_NOTE}
      </p>
      <div className="mt-3"><PortalLinks /></div>
    </aside>
  );
}
