import type { Template } from "@/types";

export const CATEGORY_NOTES: Record<string, string> = {
  "South African DOJ":
    "Department of Justice and Constitutional Development: Master's Offices (estates, trusts) and magistrate's courts (maintenance, protection orders). Checklists are transcribed from justice.gov.za; this is a preparation aid, not legal advice.",
};

export interface TemplateGroup {
  category: string;
  note?: string;
  templates: Template[];
}

/** Groups templates by category, keeping first-seen order. */
export function groupByCategory(templates: Template[]): TemplateGroup[] {
  const groups = new Map<string, Template[]>();
  for (const t of templates) {
    const key = t.category?.trim() || "Other";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups].map(([category, list]) => ({ category, note: CATEGORY_NOTES[category], templates: list }));
}
