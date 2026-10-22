"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChecklistBadge } from "@/components/templates/ChecklistBadge";
import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { PackMetaForm } from "@/components/packs/PackMetaForm";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import type { ChecklistStatus } from "@/types";
import { createPack, type PackMetaInput } from "@/lib/packs";
import { groupByCategory } from "@/lib/templates/categories";
import { SourceNote } from "@/components/templates/SourceNote";

const CUSTOM = "__custom__";
const EMPTY: PackMetaInput = { name: "", organisationName: "", submissionType: "", referenceNumber: "", dueDate: "", notes: "" };

const slug = (v: string) => v.replace(/\W+/g, "-").toLowerCase();

export default function NewPackPage() {
  return (
    <Suspense fallback={null}>
      <NewPackForm />
    </Suspense>
  );
}

function NewPackForm() {
  const router = useRouter();
  const { templates, savePack, log } = useApp();
  const { notify } = useToast();
  const params = useSearchParams();
  const wanted = params.get("template");
  const [choice, setChoice] = useState<string>(templates.some((t) => t.id === wanted) ? (wanted as string) : (templates[0]?.id ?? CUSTOM));
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
      <div className="rounded-lg border border-white/10 glass p-5">
        <PackMetaForm initial={EMPTY} submitLabel="Create pack" onSubmit={submit}>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-100">Document checklist</legend>
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.category} role="group" aria-labelledby={`cat-${slug(g.category)}`}>
                  <h2 id={`cat-${slug(g.category)}`} className="text-base font-semibold text-slate-50">{g.category}</h2>
                  {g.note && <p className="mb-2 text-xs text-slate-300">{g.note}</p>}
                  {g.subgroups.map((sg) => (
                    <div key={sg.name ?? "all"} role="group" aria-labelledby={sg.name ? `sub-${slug(g.category)}-${slug(sg.name)}` : undefined} className="mt-3">
                      {sg.name && <h3 id={`sub-${slug(g.category)}-${slug(sg.name)}`} className="mb-2 text-sm font-semibold text-cyan-200">{sg.name}</h3>}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {sg.templates.map((t) => (
                          <Option key={t.id} id={t.id} name={t.name} checked={choice === t.id} onSelect={setChoice} status={t.checklist}
                            desc={`${t.slots.filter((s) => s.required).length} required, ${t.slots.filter((s) => !s.required).length} optional documents.`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div role="group" aria-labelledby="cat-custom">
                <h2 id="cat-custom" className="text-base font-semibold text-slate-50">Custom</h2>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Option id={CUSTOM} name="Custom checklist" checked={choice === CUSTOM} onSelect={setChoice} desc="Start empty and add your own document slots in the pack builder." />
                </div>
              </div>
            </div>
            {chosen && <p className="mt-3 text-sm text-slate-200">{chosen.description}</p>}
            {chosen?.checklistNote && <p className="mt-1 text-xs text-amber-200">{chosen.checklistNote}</p>}
            {chosen?.source && <SourceNote source={chosen.source} className="mt-3" />}
            <p className="mt-2 text-xs text-slate-400">Accepted files are set per slot and can be changed in the pack builder.</p>
          </fieldset>
        </PackMetaForm>
      </div>
    </>
  );
}

function Option({ id, name, desc, checked, onSelect, status }: { id: string; name: string; desc: string; checked: boolean; onSelect: (id: string) => void; status?: ChecklistStatus }) {
  return (
    <label className={`option-card flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${checked ? "option-card-on" : ""}`}>
      <input type="radio" name="template" value={id} checked={checked} onChange={() => onSelect(id)} className="mt-1" />
      <span className="min-w-0">
        <span className="block font-medium text-slate-50">{name}</span>
        <span className="block text-slate-300">{desc}</span>
        {status && <span className="mt-1 inline-block"><ChecklistBadge status={status} /></span>}
      </span>
    </label>
  );
}
