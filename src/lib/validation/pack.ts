import type { DocumentSlot, Pack } from "@/types";

export interface Completeness {
  requiredTotal: number;
  requiredComplete: number;
  percent: number;
  missing: DocumentSlot[];
  optionalTotal: number;
  optionalComplete: number;
  fileCount: number;
  ready: boolean;
}

/** A slot is complete when it holds at least one (already validated) file. */
export function isSlotComplete(slot: DocumentSlot): boolean {
  return slot.files.length > 0;
}

export function computeCompleteness(slots: DocumentSlot[]): Completeness {
  const required = slots.filter((s) => s.required);
  const optional = slots.filter((s) => !s.required);
  const missing = required.filter((s) => !isSlotComplete(s));
  const requiredComplete = required.length - missing.length;
  return {
    requiredTotal: required.length,
    requiredComplete,
    percent: required.length === 0 ? 0 : Math.round((requiredComplete / required.length) * 100),
    missing,
    optionalTotal: optional.length,
    optionalComplete: optional.filter(isSlotComplete).length,
    fileCount: slots.reduce((n, s) => n + s.files.length, 0),
    // Nothing to export from an empty pack, even if it has no required slots.
    ready: missing.length === 0 && slots.some((s) => s.files.length > 0),
  };
}

export type PackIssue = { field: "name" | "organisationName"; message: string };

export function validatePackMeta(input: Pick<Pack, "name" | "organisationName">): PackIssue[] {
  const issues: PackIssue[] = [];
  if (!input.name.trim()) issues.push({ field: "name", message: "Pack name is required." });
  if (!input.organisationName.trim()) {
    issues.push({ field: "organisationName", message: "Client / organisation name is required." });
  }
  return issues;
}
