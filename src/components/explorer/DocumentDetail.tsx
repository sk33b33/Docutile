import type { CSSProperties } from "react";
import { ArrowLeft, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/format";
import type { Template, TemplateSlot } from "@/types";

/** A document tile opened out to full size: it stays put (no spinning) until you go back. */
export function DocumentDetail({
  slot, template, glow, onBack, onStart,
}: { slot: TemplateSlot; template: Template; glow: string; onBack: () => void; onStart: () => void }) {
  return (
    <article
      aria-label={slot.name}
      className="ring-expand rounded-2xl border p-5"
      style={{
        "--glow": glow,
        borderColor: `rgb(${glow} / 0.7)`,
        background: `linear-gradient(150deg, rgb(${glow} / 0.2), rgb(${glow} / 0.06) 60%, rgb(255 255 255 / 0.03))`,
        boxShadow: `0 0 36px rgb(${glow} / 0.45), inset 0 0 30px rgb(${glow} / 0.1)`,
      } as CSSProperties}
    >
      <Button size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden /> Back to documents</Button>
      <p className="ring-kicker mt-4">{template.name}</p>
      <h3 className="mt-1 text-xl font-semibold text-slate-50">{slot.name}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={slot.required ? "required" : "neutral"}>{slot.required ? "Required" : "Optional"}</Badge>
        {slot.formRef && <Badge tone="info">Form {slot.formRef}</Badge>}
        {slot.allowMultiple && <Badge tone="neutral">Several files allowed</Badge>}
      </div>
      <p className="mt-3 text-sm text-slate-100">{slot.description || "No description."}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-300">Accepted files</dt><dd>{slot.acceptedTypes.map((t) => t.toUpperCase()).join(", ")}</dd>
        <dt className="text-slate-300">Largest file</dt><dd>{formatBytes(slot.maxFileSizeBytes)}</dd>
      </dl>
      <p className="mt-4 text-xs text-slate-300">
        This is a preview. Files are added once you start a pack: each document gets its own tile in the pack builder.
      </p>
      <div className="mt-3"><Button variant="primary" onClick={onStart}><Rocket className="h-4 w-4" aria-hidden /> Start a pack with this checklist</Button></div>
    </article>
  );
}
