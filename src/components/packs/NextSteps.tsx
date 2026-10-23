import { ListChecks } from "lucide-react";

/** What happens after the pack is assembled, as the template's source describes it. Renders nothing without steps. */
export function NextSteps({ steps }: { steps?: string[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <section aria-labelledby="next-steps-title" className="rounded-lg border border-white/10 glass p-4 text-xs text-slate-300">
      <h2 id="next-steps-title" className="flex items-center gap-2 text-sm font-semibold text-slate-50">
        <ListChecks className="h-4 w-4" aria-hidden /> After you lodge the pack
      </h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p className="mt-2 text-slate-400">Summarised from the source below. Offices change their rules, so confirm with them.</p>
    </section>
  );
}
