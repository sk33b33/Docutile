"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { inputClass } from "@/components/ui/Field";
import { LIBRARY_SORTS, libraryRows, searchLibrary, sortLibraryRows, type LibrarySort } from "@/lib/search";
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const all = useMemo(() => libraryRows(packs), [packs]);
  const rows = useMemo(() => sortLibraryRows(searchLibrary(all, query), sort), [all, query, sort]);

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
      {all.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 max-w-md flex-1 basis-60">
              <label htmlFor="lib-search" className="mb-1 block text-sm font-medium text-slate-100">Search documents</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input id="lib-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="File name, document, pack or client" className={`${inputClass} pl-9`} autoComplete="off" />
              </div>
            </div>
            <div>
              <label htmlFor="lib-sort" className="mb-1 block text-sm font-medium text-slate-100">Sort by</label>
              <select id="lib-sort" value={sort} onChange={(e) => setSort(e.target.value as LibrarySort)} className={inputClass}>
                {LIBRARY_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <p role="status" className="mt-1 text-xs text-slate-300">{query ? `${rows.length} of ${all.length} documents match.` : `${all.length} document${all.length === 1 ? "" : "s"}.`}</p>
        </div>
      )}
      {all.length === 0 ? (
        <EmptyState title="No documents yet">Files you attach to packs will be listed here.</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="No documents match your search">Try a different word, or clear the search box.</EmptyState>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-white/10 glass">
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
