export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value: string): string {
  if (!value) return "";
  // Date-only strings (YYYY-MM-DD) are treated as local dates.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function getExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i < 0 ? "" : fileName.slice(i + 1).toLowerCase();
}

export function formatTypeList(types: string[]): string {
  return types.map((t) => t.toUpperCase()).join(", ");
}

/** Whole days from an ISO date (YYYY-MM-DD or full ISO) to `now`; never negative. */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}

/** Checklists transcribed from official pages are re-checked after this many days. */
export const RECHECK_AFTER_DAYS = 90;

/**
 * How a form reference reads on a tile: "J294" and "CoR14.1" become "Form J294" and "Form CoR14.1"; references that
 * already say what they are ("Form 06 · J480", "Annexure B", "Affidavit") are left alone.
 */
export function formLabel(ref: string): string {
  return /^(?:J|JM|MBU|CoR|CK|CM|CR|TM|RF|P|D)\s?\d/i.test(ref) ? `Form ${ref}` : ref;
}

