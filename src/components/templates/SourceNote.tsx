import { ExternalLink } from "lucide-react";
import { RECHECK_AFTER_DAYS, daysSince, formatDate } from "@/lib/format";
import type { TemplateSource } from "@/types";

/** Shows where a checklist came from and reminds users to verify it. */
export function SourceNote({ source, className = "" }: { source: TemplateSource; className?: string }) {
  const age = daysSince(source.retrievedOn);
  const stale = age > RECHECK_AFTER_DAYS;
  return (
    <p className={`text-xs text-slate-300 ${className}`}>
      Source:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-200 underline">
        {source.label}<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only"> (opens in a new tab)</span>
      </a>
      . Read on {formatDate(source.retrievedOn)}
      {source.pageUpdated ? `; the page itself says it was updated ${source.pageUpdated}` : ""}. Requirements change: confirm with the receiving office before you lodge.
      {stale && (
        <strong className="mt-1 block text-amber-200">
          This checklist was read {age} days ago (over {RECHECK_AFTER_DAYS}). Check the source page for changes before relying on it.
        </strong>
      )}
    </p>
  );
}
