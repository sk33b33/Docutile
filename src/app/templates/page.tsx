"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { newId } from "@/lib/id";
import { packsUsingTemplate } from "@/lib/packs";
import { cloneTemplateSlots } from "@/lib/templates";
import type { Template } from "@/types";

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, packs, saveTemplate, deleteTemplate, log } = useApp();
  const { notify } = useToast();
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const usedBy = toDelete ? packsUsingTemplate(packs, toDelete.id) : [];

  async function duplicate(t: Template) {
    const now = new Date().toISOString();
    const copy: Template = {
      ...t, id: newId("tpl"), name: `${t.name} (copy)`, builtIn: false, createdAt: now, updatedAt: now,
      slots: cloneTemplateSlots(t.slots).map((s) => ({ ...s, id: newId("tslot") })),
    };
    try {
      await saveTemplate(copy);
      await log("template_saved", `Created template "${copy.name}"`);
      router.push(`/templates/${copy.id}`);
    } catch (e) { notify("error", e instanceof Error ? e.message : "Template could not be saved."); }
  }

  async function confirmDelete() {
    const t = toDelete;
    setToDelete(null);
    if (!t) return;
    try { await deleteTemplate(t.id); await log("template_deleted", `Deleted template "${t.name}"`); notify("success", `Deleted template "${t.name}".`); }
    catch (e) { notify("error", e instanceof Error ? e.message : "Template could not be deleted."); }
  }

  return (
    <>
      <PageHeader
        title="Templates"
        description="Templates define the document slots a new pack starts with. Changing a template never alters packs already created from it."
        actions={<LinkButton href="/templates/new" variant="primary"><Plus className="h-4 w-4" aria-hidden /> New template</LinkButton>}
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">{t.name}</h2>
              <Badge tone={t.builtIn ? "info" : "neutral"}>{t.builtIn ? "Built-in" : "Custom"}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{t.description}</p>
            <p className="mt-2 text-xs text-slate-600">{t.slots.filter((s) => s.required).length} required · {t.slots.filter((s) => !s.required).length} optional · Used by {packsUsingTemplate(packs, t.id).length} pack(s)</p>
            <ol className="mt-2 list-decimal pl-5 text-xs text-slate-700">
              {t.slots.map((s) => <li key={s.id}>{s.name}{!s.required && <span className="text-slate-500"> (optional)</span>}</li>)}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.builtIn ? (
                <Button size="sm" onClick={() => duplicate(t)}><Copy className="h-4 w-4" aria-hidden /> Duplicate to edit</Button>
              ) : (
                <>
                  <LinkButton size="sm" href={`/templates/${t.id}`}><Pencil className="h-4 w-4" aria-hidden /> Edit</LinkButton>
                  <Button size="sm" onClick={() => duplicate(t)}><Copy className="h-4 w-4" aria-hidden /> Duplicate</Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(t)} aria-label={`Delete template ${t.name}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!toDelete} danger title="Delete template?" confirmLabel="Delete template"
        message={<>
          Delete “{toDelete?.name}”?
          {usedBy.length > 0 && <> <strong>{usedBy.length} existing pack(s) were created from it.</strong> They keep their own copy of the slots and are not changed.</>}
        </>}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete}
      />
    </>
  );
}
