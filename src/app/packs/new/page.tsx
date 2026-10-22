"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { PackMetaForm } from "@/components/packs/PackMetaForm";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { createPack, type PackMetaInput } from "@/lib/packs";
import { groupByCategory } from "@/lib/templates/categories";
import { SourceNote } from "@/components/templates/SourceNote";

const CUSTOM = "__custom__";
const EMPTY: PackMetaInput = { name: "", organisationName: "", submissionType: "", referenceNumber: "", dueDate: "", notes: "" };

export default function NewPackPage() {
  const router = useRouter();
  const { templates, savePack, log } = useApp();
  const { notify } = useToast();
  const [choice, setChoice] = useState<string>(templates[0]?.id ?? CUSTOM);
  const groups = groupByCategory(templates);
  const chosen = templates.find((t) => t.id === choice);

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
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.category} role="group" aria-labelledby={`cat-${g.category.replace(/\W+/g, "-")}`}>
                  <h2 id={`cat-${g.category.replace(/\W+/g, "-")}`} className="text-sm font-semibold text-slate-900">{g.category}</h2>
                  {g.note && <p className="mb-2 text-xs text-slate-600">{g.note}</p>}
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {g.templates.map((t) => (
                      <Option key={t.id} id={t.id} name={t.name} checked={choice === t.id} onSelect={setChoice}
                        desc={`${t.description} ${t.slots.filter((s) => s.required).length} required, ${t.slots.filter((s) => !s.required).length} optional.`} />
                    ))}
                  </div>
                </div>
              ))}
              <div role="group" aria-labelledby="cat-custom">
                <h2 id="cat-custom" className="text-sm font-semibold text-slate-900">Custom</h2>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Option id={CUSTOM} name="Custom checklist" checked={choice === CUSTOM} onSelect={setChoice} desc="Start empty and add your own document slots in the pack builder." />
                </div>
              </div>
            </div>
            {chosen?.source && <SourceNote source={chosen.source} className="mt-3" />}
            <p className="mt-2 text-xs text-slate-500">Accepted files are set per slot and can be changed in the pack builder.</p>
          </fieldset>
        </PackMetaForm>
      </div>
    </>
  );
}

function Option({ id, name, desc, checked, onSelect }: { id: string; name: string; desc: string; checked: boolean; onSelect: (id: string) => void }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${checked ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-white hover:bg-slate-50"}`}>
      <input type="radio" name="template" value={id} checked={checked} onChange={() => onSelect(id)} className="mt-1" />
      <span><span className="block font-medium text-slate-900">{name}</span><span className="block text-slate-600">{desc}</span></span>
    </label>
  );
}
