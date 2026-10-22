"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { PackStatusBadge } from "@/components/packs/PackStatusBadge";
import { computeCompleteness } from "@/lib/validation/pack";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Pack } from "@/types";

export default function DashboardPage() {
  const { packs, deletePack, log } = useApp();
  const { notify } = useToast();
  const [toDelete, setToDelete] = useState<Pack | null>(null);

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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Recent packs saved in this browser."
        actions={<LinkButton href="/packs/new" variant="primary">Create new pack</LinkButton>}
      />
      {packs.length === 0 ? (
        <EmptyState
          title="No packs yet"
          action={<LinkButton href="/packs/new" variant="primary">Create your first pack</LinkButton>}
        >
          A pack is a checklist of documents for one client or submission. Choose a template, add files to each
          tile, then export a combined PDF once every required document is in.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {packs.map((p) => {
            const c = computeCompleteness(p.slots);
            return (
              <li key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                      <Link href={`/packs/${p.id}`} className="text-blue-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">{p.name}</Link>
                    </h2>
                    <p className="truncate text-sm text-slate-600">{p.organisationName}{p.referenceNumber && ` · Ref ${p.referenceNumber}`}</p>
                  </div>
                  <PackStatusBadge status={p.status} />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{c.requiredComplete} of {c.requiredTotal} required documents</span>
                    <span>{c.percent}%</span>
                  </div>
                  <ProgressBar percent={c.percent} label={`${p.name} required documents complete`} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Updated {formatDateTime(p.updatedAt)}{p.dueDate && ` · Due ${formatDate(p.dueDate)}`}</span>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(p)} aria-label={`Delete pack ${p.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden /> Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
