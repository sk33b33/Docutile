import { groupByCategory } from "@/lib/templates/categories";
import type { Template } from "@/types";

export interface ExplorerSub {
  id: string;
  /** Undefined when the category has no named subcategory. */
  title?: string;
  templates: Template[];
}

export interface ExplorerCategory {
  id: string;
  title: string;
  note?: string;
  count: number;
  subs: ExplorerSub[];
}

const slug = (v: string) => v.replace(/\W+/g, "-").toLowerCase();

/** Category, then subcategory, then service: the levels the carousel steps through. */
export function buildExplorerTree(templates: Template[]): ExplorerCategory[] {
  return groupByCategory(templates).map((g) => ({
    id: slug(g.category),
    title: g.category,
    note: g.note,
    count: g.count,
    subs: g.subgroups.map((sg, i) => ({ id: `${slug(g.category)}-${sg.name ? slug(sg.name) : `all${i}`}`, title: sg.name, templates: sg.templates })),
  }));
}

/** A category with a single group has no subcategory step: its services are shown straight away. */
export const hasSubLevel = (c: ExplorerCategory) => c.subs.length > 1;
