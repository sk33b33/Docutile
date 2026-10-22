import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/States";
import type { Completeness } from "@/lib/validation/pack";

export function CompletenessSummary({ c, linkMissing = true }: { c: Completeness; linkMissing?: boolean }) {
  return (
    <section aria-label="Pack completeness" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Completeness</h2>
      <p className="mt-2 text-2xl font-semibold text-slate-900" aria-live="polite">{c.percent}%</p>
      <p className="text-xs text-slate-600">{c.requiredComplete} of {c.requiredTotal} required documents · {c.optionalComplete} of {c.optionalTotal} optional</p>
      <div className="mt-2"><ProgressBar percent={c.percent} label="Required documents complete" /></div>

      {c.ready ? (
        <p className="mt-3 flex items-center gap-2 rounded bg-green-50 p-2 text-sm font-medium text-green-900">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Ready: all required documents are attached.
        </p>
      ) : (
        <div className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-900">
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
