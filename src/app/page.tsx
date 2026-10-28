"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackupPasswordRequired } from "@/lib/backup-crypto";
import { ImportPasswordDialog } from "@/components/packs/BackupDialogs";
import { CalendarClock, Copy, FolderOpen, Pencil, Search, Trash2, Upload } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { inputClass } from "@/components/ui/Field";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { ServiceExplorer } from "@/components/explorer/ServiceExplorer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BackupReminder } from "@/components/packs/BackupReminder";
import { PackStatusBadge } from "@/components/packs/PackStatusBadge";
import { dueStatus, sortPacks, type PackSort } from "@/lib/due";
import { formatDate, formatDateTime } from "@/lib/format";
import { searchPacks } from "@/lib/search";
import { computeCompleteness } from "@/lib/validation/pack";
import type { Pack } from "@/types";

export default function DashboardPage() {
  const { packs, deletePack, importBackup, duplicatePack, log } = useApp();
  const { notify } = useToast();
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<Pack | null>(null);
  const [protectedFile, setProtectedFile] = useState<File | null>(null);
  const [toDuplicate, setToDuplicate] = useState<Pack | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PackSort>("updated");

  const shown = useMemo(() => sortPacks(searchPacks(packs, query), sort), [packs, query, sort]);
  const now = new Date();

  async function confirmDelete() {
    const pack = toDelete;
    setToDelete(null);
    if (!pack) return;
    try {
      await deletePack(pack.id);
      await log("pack_deleted", `Deleted pack "${pack.name}"`);
      notify("success", `Deleted "${pack.name}" and its files from this browser.`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "The pack could not be deleted.");
    }
  }

  async function duplicate(withFiles: boolean) {
    const pack = toDuplicate;
    setToDuplicate(null);
    if (!pack) return;
    try {
      const copy = await duplicatePack(pack.id, withFiles);
      notify("success", `Created "${copy.name}" ${withFiles ? "with a copy of every file" : "with empty tiles"}.`);
      router.push(`/packs/${copy.id}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "The pack could not be copied.");
    }
  }

  async function finishImport(file: File, password?: string) {
    const pack = await importBackup(file, password);
    notify("success", `Imported "${pack.name}" as a new draft with ${pack.slots.reduce((n, s) => n + s.files.length, 0)} file(s).`);
    router.push(`/packs/${pack.id}`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await finishImport(file);
    } catch (err) {
      if (err instanceof BackupPasswordRequired) setProtectedFile(file);
      else notify("error", err instanceof Error ? err.message : "The backup could not be imported.");
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Recent packs saved in this browser."
        actions={
          <>
            <ThemeToggle />
            <Button onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" aria-hidden /> Import backup</Button>
            <LinkButton href="/packs/new" variant="primary">Create new pack</LinkButton>
          </>
        }
      />
      <BackupReminder />
      <ServiceExplorer />
      <input ref={importRef} type="file" accept=".docutile" className="sr-only" tabIndex={-1} aria-hidden onChange={onImport} />
      {packs.length === 0 ? (
        <EmptyState
          title="No packs yet"
          action={<LinkButton href="/packs/new" variant="primary">Create your first pack</LinkButton>}
        >
          A pack is a checklist of documents for one client or submission. Choose a template, add files to each
          tile, then export a combined PDF once every required document is in.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-60">
              <label htmlFor="pack-search" className="mb-1 block text-sm font-medium text-slate-100">Search packs</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input id="pack-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, client, reference, file or document" className={`${inputClass} pl-9`} autoComplete="off" />
              </div>
            </div>
            <div>
              <label htmlFor="pack-sort" className="mb-1 block text-sm font-medium text-slate-100">Sort by</label>
              <select id="pack-sort" value={sort} onChange={(e) => setSort(e.target.value as PackSort)} className={inputClass}>
                <option value="updated">Recently updated</option>
                <option value="due">Due date</option>
              </select>
            </div>
          </div>
          <p role="status" className="mb-3 text-sm text-slate-300">{query ? `${shown.length} of ${packs.length} packs match.` : `${packs.length} pack${packs.length === 1 ? "" : "s"}.`}</p>
          {shown.length === 0 ? (
            <EmptyState title="No packs match your search">Try a different word, or clear the search box.</EmptyState>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {shown.map((p) => {
                const c = computeCompleteness(p.slots);
                const due = dueStatus(p.dueDate, now);
                const waiting = p.slots.filter((s) => s.files.length === 0 && s.waiting).length;
                return (
                  <li key={p.id} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">
                          <Link href={`/packs/${p.id}`} className="text-cyan-200 hover:text-cyan-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{p.name}</Link>
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-100">
                          <span className="text-slate-300">Applying for: </span>
                          <span className="font-medium" data-testid="applying-for">{p.templateName}</span>
                        </p>
                        <p className="truncate text-sm text-slate-300">{p.organisationName}{p.referenceNumber && ` · Ref ${p.referenceNumber}`}</p>
                      </div>
                      <PackStatusBadge status={p.status} />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-slate-300">
                        <span>{c.requiredComplete} of {c.requiredTotal} required documents</span>
                        <span>{c.percent}%</span>
                      </div>
                      <ProgressBar percent={c.percent} label={`${p.name} required documents complete`} />
                    </div>
                    {(due.kind !== "none" || waiting > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {due.kind !== "none" && (
                          <Badge tone={due.kind === "overdue" ? "danger" : due.kind === "today" || due.kind === "soon" ? "required" : "neutral"} icon={<CalendarClock className="h-3 w-3" aria-hidden />}>
                            {due.label} · {formatDate(p.dueDate)}
                          </Badge>
                        )}
                        {waiting > 0 && <Badge tone="info">{waiting} document{waiting === 1 ? "" : "s"} waiting</Badge>}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Updated {formatDateTime(p.updatedAt)}</span>
                      <span className="flex flex-wrap gap-1">
                        {p.status === "draft"
                          ? <LinkButton href={`/packs/${p.id}`} size="sm" variant="primary" aria-label={`Continue editing ${p.name}`}><Pencil className="h-4 w-4" aria-hidden /> Continue editing</LinkButton>
                          : <LinkButton href={`/packs/${p.id}`} size="sm" aria-label={`Open ${p.name}`}><FolderOpen className="h-4 w-4" aria-hidden /> Open</LinkButton>}
                        <Button size="sm" variant="ghost" onClick={() => setToDuplicate(p)} aria-label={`Duplicate pack ${p.name}`}><Copy className="h-4 w-4" aria-hidden /> Duplicate</Button>
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(p)} aria-label={`Delete pack ${p.name}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <ImportPasswordDialog
        file={protectedFile}
        onClose={() => setProtectedFile(null)}
        onSubmit={async (pw) => {
          if (!protectedFile) return;
          await finishImport(protectedFile, pw); // wrong password throws, and the dialog shows it
          setProtectedFile(null);
        }}
      />
      <Dialog
        open={!!toDuplicate}
        title="Duplicate this pack"
        onClose={() => setToDuplicate(null)}
        footer={
          <>
            <Button onClick={() => setToDuplicate(null)}>Cancel</Button>
            <Button onClick={() => duplicate(false)}>Empty tiles only</Button>
            <Button variant="primary" onClick={() => duplicate(true)}>Copy with files</Button>
          </>
        }
      >
        Create a new draft from “{toDuplicate?.name}”. Copy the files too for a recurring submission that reuses the same documents, or start with empty tiles. The original is not changed.
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Delete this pack?"
        confirmLabel="Delete pack"
        message={<>“{toDelete?.name}” and all of its attached files will be permanently removed from this browser. This cannot be undone.</>}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
