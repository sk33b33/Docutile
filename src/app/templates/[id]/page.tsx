"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SlotEditorDialog, type SlotDraft } from "@/components/templates/SlotEditorDialog";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput, describedBy } from "@/components/ui/Field";
import { EmptyState, PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_ACCEPTED_TYPES } from "@/lib/constants";
import { newId } from "@/lib/id";
import { moveItem } from "@/lib/ordering";
import { packsUsingTemplate } from "@/lib/packs";
import { cloneTemplateSlots } from "@/lib/templates";
import type { Template, TemplateSlot } from "@/types";

function blank(): Template {
  const now = new Date().toISOString();
  return { id: newId("tpl"), name: "", description: "", category: "Custom", slots: [], builtIn: false, createdAt: now, updatedAt: now };
}

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { templates, packs } = useApp();
  const existing = id === "new" ? null : templates.find((t) => t.id === id) ?? null;

  if (id !== "new" && (!existing || existing.builtIn)) {
    return (
      <EmptyState title={existing?.builtIn ? "Built-in templates are read-only" : "Template not found"} action={<LinkButton href="/templates">Back to templates</LinkButton>}>
        {existing?.builtIn ? "Duplicate it from the Templates page to make an editable copy." : "It may have been deleted."}
      </EmptyState>
    );
  }
  // Remount when the template identity changes so local draft state resets.
  return <Editor key={id} initial={existing ?? blank()} isNew={!existing} usedBy={existing ? packsUsingTemplate(packs, existing.id).length : 0} />;
}

function Editor({ initial, isNew, usedBy }: { initial: Template; isNew: boolean; usedBy: number }) {
  const router = useRouter();
  const { saveTemplate, log } = useApp();
  const { notify } = useToast();
  const [t, setT] = useState<Template>({ ...initial, slots: cloneTemplateSlots(initial.slots) });
  const [nameError, setNameError] = useState<string>();
  const [dialog, setDialog] = useState<{ index: number | null } | null>(null);
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);

  const toDraft = (s?: TemplateSlot): SlotDraft => ({
    name: s?.name ?? "", description: s?.description ?? "", required: s?.required ?? true,
    acceptedTypes: s?.acceptedTypes ?? DEFAULT_ACCEPTED_TYPES, maxFileSizeBytes: s?.maxFileSizeBytes ?? 25 * 1024 * 1024, allowMultiple: s?.allowMultiple ?? false,
  });

  async function save() {
    if (!t.name.trim()) { setNameError("Template name is required."); document.getElementById("tpl-name")?.focus(); return; }
    if (t.slots.length === 0) { notify("error", "Add at least one document slot before saving."); return; }
    try {
      await saveTemplate({ ...t, name: t.name.trim(), description: t.description.trim(), updatedAt: new Date().toISOString() });
      await log("template_saved", `Saved template "${t.name.trim()}"`);
      notify("success", "Template saved.");
      router.push("/templates");
    } catch (e) { notify("error", e instanceof Error ? e.message : "Template could not be saved."); }
  }

  const editing = dialog?.index != null ? t.slots[dialog.index] : undefined;

  return (
    <>
      <PageHeader title={isNew ? "New template" : `Edit template`} description={usedBy > 0 ? `${usedBy} existing pack(s) use this template. They keep their own copy of the slots, so edits here only affect new packs.` : undefined}
        actions={<><LinkButton href="/templates">Cancel</LinkButton><Button variant="primary" onClick={save}>Save template</Button></>} />
      <div className="space-y-4">
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <Field label="Template name" htmlFor="tpl-name" required error={nameError}>
            <TextInput id="tpl-name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} aria-invalid={!!nameError} aria-describedby={describedBy("tpl-name", nameError)} />
          </Field>
          <Field label="Category" htmlFor="tpl-cat"><TextInput id="tpl-cat" value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description" htmlFor="tpl-desc"><TextArea id="tpl-desc" rows={2} value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} /></Field></div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Document slots (in order)</h2>
            <Button size="sm" onClick={() => setDialog({ index: null })}><Plus className="h-4 w-4" aria-hidden /> Add slot</Button>
          </div>
          {t.slots.length === 0 ? <p className="text-sm text-slate-600">No slots yet.</p> : (
            <ol className="divide-y divide-slate-100">
              {t.slots.map((s, i) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="w-6 text-slate-500">{i + 1}.</span>
                  <span className="min-w-0 flex-1 break-words font-medium">{s.name}</span>
                  <Badge tone={s.required ? "required" : "neutral"}>{s.required ? "Required" : "Optional"}</Badge>
                  <div className="flex">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => setT({ ...t, slots: moveItem(t.slots, i, i - 1) })} aria-label={`Move ${s.name} up`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
                    <Button size="sm" variant="ghost" disabled={i === t.slots.length - 1} onClick={() => setT({ ...t, slots: moveItem(t.slots, i, i + 1) })} aria-label={`Move ${s.name} down`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ index: i })} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" aria-hidden /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoveIdx(i)} aria-label={`Delete ${s.name}`}><Trash2 className="h-4 w-4" aria-hidden /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <SlotEditorDialog
        open={!!dialog} title={editing ? "Edit slot" : "Add slot"} initial={toDraft(editing)}
        onClose={() => setDialog(null)}
        onSave={(d) => {
          setT((cur) => dialog?.index != null
            ? { ...cur, slots: cur.slots.map((s, i) => (i === dialog.index ? { ...s, ...d } : s)) }
            : { ...cur, slots: [...cur.slots, { id: newId("tslot"), ...d }] });
          setDialog(null);
        }}
      />
      <ConfirmDialog open={removeIdx !== null} danger title="Delete this slot?" confirmLabel="Delete slot"
        message={<>Remove “{removeIdx !== null ? t.slots[removeIdx]?.name : ""}” from this template? You still need to save the template for this to apply.</>}
        onCancel={() => setRemoveIdx(null)}
        onConfirm={() => { setT({ ...t, slots: t.slots.filter((_, i) => i !== removeIdx) }); setRemoveIdx(null); }} />
    </>
  );
}
