"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { AttachedFile } from "@/types";

export default function LibraryPage() {
  const { packs, repo } = useApp();
  const { notify } = useToast();
  const rows = packs.flatMap((p) => p.slots.flatMap((s) => s.files.map((f) => ({ pack: p, slot: s, file: f }))));

  async function save(f: AttachedFile) {
    try {
      const blob = await repo.getBlob(f.blobKey);
      if (!blob) return notify("error", `"${f.displayName}" is missing from browser storage.`);
      downloadBlob(blob, f.originalName);
    } catch (e) { notify("error", e instanceof Error ? e.message : "Download failed."); }
  }

  return (
    <>
      <PageHeader title="Document library" description="Every file attached to a pack in this browser. This is a read-only index, not shared storage." />
      {rows.length === 0 ? (
        <EmptyState title="No documents yet">Files you attach to packs will be listed here.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 glass">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Attached documents</caption>
            <thead className="bg-white/5 text-xs uppercase text-slate-300">
              <tr><th scope="col" className="p-3">File</th><th scope="col" className="p-3">Pack / slot</th><th scope="col" className="p-3">Size</th><th scope="col" className="p-3">Added</th><th scope="col" className="p-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map(({ pack, slot, file }) => (
                <tr key={file.id}>
                  <td className="p-3 break-all font-medium">{file.displayName}</td>
                  <td className="p-3"><Link className="text-cyan-200 underline" href={`/packs/${pack.id}`}>{pack.name}</Link> · {slot.name}</td>
                  <td className="p-3 whitespace-nowrap">{formatBytes(file.sizeBytes)}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(file.uploadedAt)}</td>
                  <td className="p-3"><Button size="sm" onClick={() => save(file)} aria-label={`Download ${file.displayName}`}><Download className="h-4 w-4" aria-hidden /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
