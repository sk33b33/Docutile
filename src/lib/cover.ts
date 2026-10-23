import { formatDate } from "./format";
import type { DocumentSlot, Pack } from "@/types";

export type CoverStatus = "attached" | "waiting" | "missing" | "not-supplied";

export interface CoverRow {
  n: number;
  name: string;
  formRef?: string;
  required: boolean;
  status: CoverStatus;
  /** Human text: file names, the waiting note, or what to do. */
  detail: string;
}

function rowFor(slot: DocumentSlot, n: number): CoverRow {
  const base = { n, name: slot.name, formRef: slot.formRef, required: slot.required };
  if (slot.files.length > 0) return { ...base, status: "attached", detail: slot.files.map((f) => f.displayName).join(", ") };
  if (slot.waiting) {
    const by = slot.waiting.expectedBy ? ` (expected by ${formatDate(slot.waiting.expectedBy)})` : "";
    return { ...base, status: "waiting", detail: `Waiting: ${slot.waiting.note || "applied for"}${by}` };
  }
  return slot.required
    ? { ...base, status: "missing", detail: "Required, not yet attached" }
    : { ...base, status: "not-supplied", detail: "Optional, not supplied" };
}

/** One row per tile, in pack order, so a printed cover sheet shows exactly what the pack does and does not hold. */
export function buildCoverRows(pack: Pack): CoverRow[] {
  return pack.slots.map((s, i) => rowFor(s, i + 1));
}

export const STATUS_LABEL: Record<CoverStatus, string> = {
  attached: "Attached",
  waiting: "Waiting",
  missing: "MISSING",
  "not-supplied": "Not supplied",
};
