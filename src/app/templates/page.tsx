"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { newId } from "@/lib/id";
import { packsUsingTemplate } from "@/lib/packs";
import { cloneTemplateSlots } from "@/lib/templates";
import { groupByCategory } from "@/lib/templates/categories";
import { ChecklistBadge } from "@/components/templates/ChecklistBadge";
import { SourceNote } from "@/components/templates/SourceNote";
import type { Template } from "@/types";

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, packs, customisedTemplateIds, saveTemplate, deleteTemplate, log } = useApp();
  const { notify } = useToast();
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const [toReset, setToReset] = useState<Template | null>(null);
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

  async function confirmReset() {
    const t = toReset;
    setToReset(null);
    if (!t) return;
    try { await deleteTemplate(t.id); await log("template_deleted", `Reset template "${t.name}" to default`); notify("success", `"${t.name}" was reset to its default.`); }
    catch (e) { notify("error", e instanceof Error ? e.message : "Template could not be reset."); }
  }

  const groups = groupByCategory(templates);
  const slug = (v: string) => v.replace(/\W+/g, "-").toLowerCase();

  return (
    <>
      <PageHeader
        title="Services & templates"
        description="Every service Docutile can build a pack for, grouped by category, with the document tiles each one needs. Changing a template never alters packs already created from it."
        actions={<LinkButton href="/templates/new" variant="primary"><Plus className="h-4 w-4" aria-hidden /> New template</LinkButton>}
      />
      <nav aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a key={g.category} href={`#cat-${slug(g.category)}`} className="chip">{g.category} <span className="text-slate-400">({g.count})</span></a>
        ))}
      </nav>
      {groups.map((g) => (
        <section key={g.category} id={`cat-${slug(g.category)}`} aria-labelledby={`h-${slug(g.category)}`} className="mb-10 scroll-mt-6">
          <h2 id={`h-${slug(g.category)}`} className="text-xl font-semibold text-slate-50">{g.category} <span className="text-base font-normal text-slate-400">· {g.count} service{g.count === 1 ? "" : "s"}</span></h2>
          {g.note && <p className="mb-3 max-w-3xl text-sm text-slate-300">{g.note}</p>}
          {g.subgroups.map((sg) => (
            <div key={sg.name ?? "all"} className="mt-5">
              {sg.name && <h3 className="mb-3 text-base font-semibold text-cyan-200">{sg.name} <span className="font-normal text-slate-400">· {sg.templates.length} service{sg.templates.length === 1 ? "" : "s"}</span></h3>}
              <ul className="grid gap-4 md:grid-cols-2">
                {sg.templates.map((t) => (
                  <li key={t.id} className="glass rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {sg.name ? <h4 className="min-w-0 flex-1 basis-40 break-words text-base font-semibold text-slate-50">{t.name}</h4> : <h3 className="min-w-0 flex-1 basis-40 break-words text-base font-semibold text-slate-50">{t.name}</h3>}
                      <div className="flex flex-wrap justify-end gap-1">
                        <ChecklistBadge status={t.checklist} />
                        <Badge tone={t.builtIn ? "info" : "neutral"}>{t.builtIn ? (customisedTemplateIds.includes(t.id) ? "Built-in (customised)" : "Built-in") : "Custom"}</Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{t.description}</p>
                    <p className="mt-2 text-xs text-slate-300">{t.slots.filter((s) => s.required).length} required · {t.slots.filter((s) => !s.required).length} optional · Used by {packsUsingTemplate(packs, t.id).length} pack(s)</p>
                    {t.checklistNote && <p className="mt-2 text-xs text-amber-200">{t.checklistNote}</p>}
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-sm font-medium text-cyan-200 hover:text-cyan-100">Document tiles ({t.slots.length})</summary>
                      <ol className="mt-2 space-y-1 text-xs text-slate-200">
                        {t.slots.map((s, i) => (
                          <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-slate-400">{i + 1}.</span>
                            <span className="font-medium">{s.name}</span>
                            {s.formRef && <span className="text-cyan-200">[{s.formRef}]</span>}
                            <span className={s.required ? "text-amber-200" : "text-slate-400"}>{s.required ? "Required" : "Optional"}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                    {t.source && <SourceNote source={t.source} className="mt-2" />}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <LinkButton size="sm" variant="primary" href={`/packs/new?template=${t.id}`}>Create pack</LinkButton>
                      <LinkButton size="sm" href={`/templates/${t.id}`}><Pencil className="h-4 w-4" aria-hidden /> Edit</LinkButton>
                      <Button size="sm" onClick={() => duplicate(t)}><Copy className="h-4 w-4" aria-hidden /> Duplicate</Button>
                      {t.builtIn && customisedTemplateIds.includes(t.id) && (
                        <Button size="sm" variant="ghost" onClick={() => setToReset(t)} aria-label={`Reset ${t.name} to default`}><RotateCcw className="h-4 w-4" aria-hidden /> Reset to default</Button>
                      )}
                      {!t.builtIn && (
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(t)} aria-label={`Delete template ${t.name}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <ConfirmDialog
        open={!!toReset} title="Reset to default?" confirmLabel="Reset template"
        message={<>Discard your changes to “{toReset?.name}” and restore the original built-in slots? Existing packs are not affected.</>}
        onCancel={() => setToReset(null)} onConfirm={confirmReset}
      />
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
