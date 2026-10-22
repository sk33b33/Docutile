import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { TemplateSource } from "@/types";

/** Shows where a checklist came from and reminds users to verify it. */
export function SourceNote({ source, className = "" }: { source: TemplateSource; className?: string }) {
  return (
    <p className={`text-xs text-slate-600 ${className}`}>
      Source:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-800 underline">
        {source.label}<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only"> (opens in a new tab)</span>
      </a>
      . Read on {formatDate(source.retrievedOn)}
      {source.pageUpdated ? `; the page itself says it was updated ${source.pageUpdated}` : ""}. Requirements change: confirm with the receiving office before you lodge.
    </p>
  );
}
