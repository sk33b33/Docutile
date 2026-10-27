import type { ChecklistStatus, Template } from "@/types";

export const CATEGORY_NOTES: Record<string, string> = {
  "General business": "Everyday document packs for suppliers, clients, compliance reviews and general submissions.",
  "South African DOJ":
    "Department of Justice and Constitutional Development: services of the Master of the High Court. Checklists are transcribed from justice.gov.za; this is a preparation aid, not legal advice.",
  "Master of the High Court: other services":
    "The Master's other divisions: the Guardian's Fund, curators and tutors, and insolvent estates. Checklists are transcribed from justice.gov.za; where the DOJ publishes only a form, the service says so. This is a preparation aid, not legal advice.",
  CIPC:
    "The Companies and Intellectual Property Commission: registering and changing companies and close corporations, names, conversions, winding up and business rescue. Checklists are transcribed from cipc.co.za; this is a preparation aid, not legal advice. Intellectual property filings and annual returns are not included yet.",
  "South African Courts":
    "Services applied for at magistrate's courts. Checklists are transcribed from justice.gov.za; this is a preparation aid, not legal advice.",
};

export const CHECKLIST_LABEL: Record<ChecklistStatus, { label: string; help: string }> = {
  published: { label: "Official list", help: "The source publishes a document list for this service." },
  partial: { label: "Partly published", help: "The source describes the process or part of the list. The rest follows standard practice: confirm with the office." },
  "form-only": { label: "Form only", help: "The source names the form but not the supporting documents: confirm with the office." },
};

export interface TemplateSubgroup {
  name?: string;
  templates: Template[];
}

export interface TemplateGroup {
  category: string;
  note?: string;
  subgroups: TemplateSubgroup[];
  count: number;
}

/** Groups templates by category, then subcategory, keeping first-seen order. */
export function groupByCategory(templates: Template[]): TemplateGroup[] {
  const cats = new Map<string, Map<string, Template[]>>();
  for (const t of templates) {
    const cat = t.category?.trim() || "Other";
    const sub = t.subcategory?.trim() ?? "";
    const subs = cats.get(cat) ?? new Map<string, Template[]>();
    subs.set(sub, [...(subs.get(sub) ?? []), t]);
    cats.set(cat, subs);
  }
  return [...cats].map(([category, subs]) => ({
    category,
    note: CATEGORY_NOTES[category],
    subgroups: [...subs].map(([name, list]) => ({ name: name || undefined, templates: list })),
    count: [...subs.values()].reduce((n, l) => n + l.length, 0),
  }));
}
