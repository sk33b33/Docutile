"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { PackMetaForm } from "@/components/packs/PackMetaForm";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { createPack, type PackMetaInput } from "@/lib/packs";
import { formatTypeList } from "@/lib/format";

const CUSTOM = "__custom__";
const EMPTY: PackMetaInput = { name: "", organisationName: "", submissionType: "", referenceNumber: "", dueDate: "", notes: "" };

export default function NewPackPage() {
  const router = useRouter();
  const { templates, savePack, log } = useApp();
  const { notify } = useToast();
  const [choice, setChoice] = useState<string>(templates[0]?.id ?? CUSTOM);

  async function submit(meta: PackMetaInput) {
    const template = templates.find((t) => t.id === choice) ?? null;
    const pack = createPack(meta, template);
    try {
      const saved = await savePack(pack);
      await log("pack_created", `Created pack "${saved.name}" from ${saved.templateName}`, saved.id);
      router.push(`/packs/${saved.id}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "The pack could not be saved.");
    }
  }

  return (
    <>
      <PageHeader title="New pack" description="Enter the pack details and choose the document checklist to start from." />
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <PackMetaForm initial={EMPTY} submitLabel="Create pack" onSubmit={submit}>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-800">Document checklist</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...templates.map((t) => ({
                id: t.id, name: t.name,
                desc: `${t.description} ${t.slots.filter((s) => s.required).length} required, ${t.slots.filter((s) => !s.required).length} optional.`,
              })), { id: CUSTOM, name: "Custom checklist", desc: "Start empty and add your own document slots in the pack builder." }].map((o) => (
                <label key={o.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${choice === o.id ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-white hover:bg-slate-50"}`}>
                  <input type="radio" name="template" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="mt-1" />
                  <span><span className="block font-medium text-slate-900">{o.name}</span><span className="block text-slate-600">{o.desc}</span></span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Default accepted files: {formatTypeList(["pdf","docx","doc","xlsx","xls","pptx","ppt","png","jpg","jpeg","txt"])}. You can change this per slot.</p>
          </fieldset>
        </PackMetaForm>
      </div>
    </>
  );
}
