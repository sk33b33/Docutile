import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/States";
import type { Completeness } from "@/lib/validation/pack";

export function CompletenessSummary({ c, linkMissing = true }: { c: Completeness; linkMissing?: boolean }) {
  return (
    <section aria-label="Pack completeness" className="rounded-xl glass p-4">
      <h2 className="text-sm font-semibold text-slate-50">Completeness</h2>
      <p className="mt-2 text-2xl font-semibold text-slate-50" aria-live="polite">{c.percent}%</p>
      <p className="text-xs text-slate-300">{c.requiredComplete} of {c.requiredTotal} required documents · {c.optionalComplete} of {c.optionalTotal} optional</p>
      <div className="mt-2"><ProgressBar percent={c.percent} label="Required documents complete" /></div>

      {c.ready ? (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 p-2 text-sm font-medium text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.25)]">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Ready: all required documents are attached.
        </p>
      ) : (
        <div className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden /> Not ready</p>
          {c.missing.length > 0 ? (
            <>
              <p className="mt-1 text-xs">Missing required documents:</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {c.missing.map((s) => (
                  <li key={s.id}>{linkMissing ? <a href={`#slot-${s.id}`} className="inline-block py-1.5 underline">{s.name}</a> : s.name}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xs">Add at least one document to this pack.</p>
          )}
        </div>
      )}
    </section>
  );
}
