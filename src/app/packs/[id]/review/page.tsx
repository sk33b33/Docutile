"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Eye, FileText, Loader2, Printer } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { CompletenessSummary } from "@/components/packs/CompletenessSummary";
import { PackStatusBadge } from "@/components/packs/PackStatusBadge";
import { usePackEditor } from "@/components/packs/usePackEditor";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorBanner, PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { downloadBlob, previewBlob } from "@/lib/download";
import { exportFileName } from "@/lib/filename";
import { formatBytes, formatDate } from "@/lib/format";
import { orderedEntries } from "@/lib/packs";
import { DEFAULT_EXPORT_OPTIONS, buildManifest, canMerge, type ExportOptions, type MergeFailure, type MergeProgress } from "@/lib/pdf/merge";
import { MergeCancelledError, mergePackOffThread } from "@/lib/pdf/mergeClient";
import { computeCompleteness } from "@/lib/validation/pack";
import type { AttachedFile } from "@/types";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { repo } = useApp();
  const ed = usePackEditor(id);
  const { notify } = useToast();
  const pack = ed.pack;
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<MergeFailure[]>([]);
  const [lastPdf, setLastPdf] = useState<Blob | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState<MergeProgress | null>(null);
  const [opts, setOpts] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const abortRef = useRef<AbortController | null>(null);

  if (!pack) {
    return <EmptyState title="Pack not found" action={<LinkButton href="/">Back to dashboard</LinkButton>}>This draft does not exist in this browser.</EmptyState>;
  }

  const c = computeCompleteness(pack.slots);
  const entries = orderedEntries(pack.slots);
  const mergeable = entries.filter((e) => canMerge(e.file.originalName));
  const separate = entries.filter((e) => !canMerge(e.file.originalName));

  async function generate() {
    if (!pack || !c.ready) return; // hard guard, independent of the disabled button
    setBusy(true); setFailures([]); setNote(null); setProgress(null);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const result = await mergePackOffThread(pack, (k) => repo.getBlob(k), { onProgress: setProgress, signal: abort.signal, exportOptions: opts });
      if (result.failures.length) {
        setFailures(result.failures);
        notify("error", "The PDF was not created because some files could not be merged. See details below.");
        return;
      }
      if (!result.bytes) {
        setNote("None of the attached files can be combined into a PDF (only PDF, PNG and JPG files can). Download the files individually and use the manifest.");
        return;
      }
      const name = exportFileName(pack.organisationName);
      const blob = new Blob([result.bytes as BlobPart], { type: "application/pdf" });
      setLastPdf(blob);
      downloadBlob(blob, name);
      await ed.markExported(name);
      if (result.separate.length) {
        setNote(`${result.separate.length} file(s) could not be included in the PDF and are listed on its cover sheet as supplied separately. Download them below.`);
      }
      notify("success", `Created ${name} (${result.merged.reduce((n, m) => n + m.pageCount, 0) + result.coverPages} pages). Check your downloads folder.`);
    } catch (e) {
      if (e instanceof MergeCancelledError) notify("info", "Export cancelled. No file was created.");
      else notify("error", e instanceof Error ? `Export failed: ${e.message}` : "Export failed.");
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  async function saveFile(f: AttachedFile) {
    try {
      const blob = await repo.getBlob(f.blobKey);
      if (!blob) { notify("error", `"${f.displayName}" is missing from browser storage. Re-attach it in the builder.`); return; }
      downloadBlob(blob, f.originalName);
    } catch (e) { notify("error", e instanceof Error ? e.message : "Download failed."); }
  }

  function downloadManifest() {
    if (!pack || !c.ready) return;
    downloadBlob(new Blob([buildManifest(pack)], { type: "text/plain;charset=utf-8" }), exportFileName(pack.organisationName, "txt").replace("SubmissionPack", "Manifest"));
  }

  return (
    <>
      <PageHeader
        title={`Review: ${pack.name}`}
        description={`${pack.organisationName}${pack.referenceNumber ? ` · Ref ${pack.referenceNumber}` : ""}${pack.dueDate ? ` · Due ${formatDate(pack.dueDate)}` : ""}`}
        actions={
          <>
            <PackStatusBadge status={pack.status} />
            <LinkButton href={`/packs/${pack.id}`}><ArrowLeft className="h-4 w-4" aria-hidden /> Back to builder</LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Pack contents" className="rounded-lg border border-white/10 glass p-4">
          <h2 className="text-base font-semibold">Contents in pack order</h2>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-300">No files attached yet. <Link href={`/packs/${pack.id}`} className="text-cyan-200 underline">Go to the builder</Link> to add documents.</p>
          ) : (
            <ol className="mt-3 divide-y divide-white/10">
              {entries.map((e) => (
                <li key={e.file.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="w-6 text-slate-400">{e.position}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium">{e.file.displayName}</p>
                    <p className="text-xs text-slate-300">{e.slot.name} · {formatBytes(e.file.sizeBytes)}</p>
                  </div>
                  <Badge tone={e.slot.required ? "required" : "neutral"}>{e.slot.required ? "Required" : "Optional"}</Badge>
                  {canMerge(e.file.originalName)
                    ? <Badge tone="success">In PDF</Badge>
                    : <Badge tone="info">Separate file</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => saveFile(e.file)} className="no-print" aria-label={`Download ${e.file.displayName}`}><Download className="h-4 w-4" aria-hidden /></Button>
                </li>
              ))}
            </ol>
          )}
          {c.missing.length > 0 && (
            <div className="mt-4 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
              <p className="font-medium">Missing required documents (not in the list above):</p>
              <ul className="mt-1 list-disc pl-5">{c.missing.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
            </div>
          )}
        </section>

        <aside aria-label="Completeness and export" className="space-y-4">
          <CompletenessSummary c={c} linkMissing={false} />
          <section className="no-print space-y-2 rounded-lg border border-white/10 glass p-4">
            <h2 className="text-sm font-semibold">Export</h2>
            <fieldset className="rounded-md border border-white/15 p-2">
              <legend className="px-1 text-xs font-medium text-slate-200">PDF options</legend>
              {([
                ["pageNumbers", "Page numbers (Page X of Y)"],
                ["bookmarks", "Bookmarks for each document"],
                ["links", "Clickable contents on the cover sheet"],
                ["dividers", "Title page before each document"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 py-1 text-xs text-slate-200">
                  <input type="checkbox" checked={opts[key]} onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })} disabled={busy} />
                  {label}
                </label>
              ))}
            </fieldset>
            <Button variant="primary" className="w-full" onClick={generate} disabled={!c.ready || busy} aria-describedby="export-help">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
              {busy ? "Creating PDF…" : "Create & download PDF"}
            </Button>
            {busy && (
              <div role="status" aria-live="polite" className="text-xs text-slate-200">
                <p>{progress ? `${progress.done} of ${progress.total}: ${progress.label}` : "Reading files…"}</p>
                <Button size="sm" className="mt-1" onClick={() => abortRef.current?.abort()}>Cancel export</Button>
              </div>
            )}
            {lastPdf && <Button className="w-full" onClick={() => previewBlob(lastPdf)}><Eye className="h-4 w-4" aria-hidden /> Open last PDF</Button>}
            <Button className="w-full" onClick={downloadManifest} disabled={!c.ready}><Download className="h-4 w-4" aria-hidden /> Download manifest (.txt)</Button>
            <Button className="w-full" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print this review</Button>
            <p id="export-help" className="text-xs text-slate-300">
              {c.ready
                ? `The PDF has a cover sheet followed by ${mergeable.length} PDF/image file(s) in order.${separate.length ? ` ${separate.length} Word/Excel/PowerPoint/text file(s) cannot be converted in the browser; they are listed on the cover sheet and must be sent separately.` : ""}`
                : "Export is disabled until every required document is attached."}
            </p>
            <p className="text-xs text-slate-400">Files are processed in your browser and never uploaded. Docutile does not email or submit anything.</p>
          </section>
          {note && <p role="status" className="rounded border border-cyan-400/40 bg-cyan-400/10 p-3 text-sm text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.2)]">{note}</p>}
          {failures.length > 0 && (
            <ErrorBanner title="Some files could not be merged">
              <ul className="list-disc pl-5">
                {failures.map((f) => <li key={f.entry.file.id}><strong>{f.entry.file.displayName}</strong>: {f.reason}</li>)}
              </ul>
            </ErrorBanner>
          )}
        </aside>
      </div>
    </>
  );
}
