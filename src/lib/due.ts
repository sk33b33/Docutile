import type { Pack } from "@/types";

export type DueKind = "none" | "overdue" | "today" | "soon" | "later";

export interface DueStatus {
  kind: DueKind;
  /** Whole days until the due date (negative when overdue). */
  days: number;
  label: string;
}

export const SOON_DAYS = 7;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Days from `now` to a YYYY-MM-DD due date, using local calendar days. */
export function dueStatus(dueDate: string, now: Date = new Date()): DueStatus {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { kind: "none", days: 0, label: "" };
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return { kind: "none", days: 0, label: "" };
  const days = Math.round((due.getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days < 0) return { kind: "overdue", days, label: `Overdue by ${-days} day${days === -1 ? "" : "s"}` };
  if (days === 0) return { kind: "today", days, label: "Due today" };
  if (days === 1) return { kind: "soon", days, label: "Due tomorrow" };
  if (days <= SOON_DAYS) return { kind: "soon", days, label: `Due in ${days} days` };
  return { kind: "later", days, label: `Due in ${days} days` };
}

export type PackSort = "updated" | "due";

/** "due": packs with a due date first, soonest (and overdue) first; ties and undated packs by last update. */
export function sortPacks(packs: Pack[], mode: PackSort): Pack[] {
  const byUpdated = (a: Pack, b: Pack) => b.updatedAt.localeCompare(a.updatedAt);
  if (mode === "updated") return [...packs].sort(byUpdated);
  return [...packs].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || byUpdated(a, b);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return byUpdated(a, b);
  });
}
