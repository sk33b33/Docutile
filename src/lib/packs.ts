import { newId } from "./id";
import { cloneTemplateSlots } from "./templates";
import type { AttachedFile, DocumentSlot, Pack, Template, TemplateSlot } from "@/types";

export function slotFromTemplateSlot(t: TemplateSlot): DocumentSlot {
  return {
    id: newId("slot"),
    templateSlotId: t.id,
    name: t.name,
    description: t.description,
    required: t.required,
    acceptedTypes: [...t.acceptedTypes],
    maxFileSizeBytes: t.maxFileSizeBytes,
    allowMultiple: t.allowMultiple,
    formRef: t.formRef,
    files: [],
  };
}

export interface PackMetaInput {
  name: string;
  organisationName: string;
  submissionType: string;
  referenceNumber: string;
  dueDate: string;
  notes: string;
}

export function createPack(meta: PackMetaInput, template: Template | null, now = new Date()): Pack {
  const ts = now.toISOString();
  return {
    id: newId("pack"),
    ...trimMeta(meta),
    templateId: template?.id ?? null,
    templateName: template?.name ?? "Custom checklist",
    templateSource: template?.source ? { ...template.source } : undefined,
    templateChecklist: template?.checklist,
    templateNote: template?.checklistNote,
    templateNextSteps: template?.nextSteps ? [...template.nextSteps] : undefined,
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
    exportedAt: null,
    slots: template ? cloneTemplateSlots(template.slots).map(slotFromTemplateSlot) : [],
  };
}

export function trimMeta(m: PackMetaInput): PackMetaInput {
  return {
    name: m.name.trim(),
    organisationName: m.organisationName.trim(),
    submissionType: m.submissionType.trim(),
    referenceNumber: m.referenceNumber.trim(),
    dueDate: m.dueDate,
    notes: m.notes.trim(),
  };
}

export function newCustomSlot(overrides: Partial<DocumentSlot> & { acceptedTypes: string[]; maxFileSizeBytes: number }): DocumentSlot {
  return {
    id: newId("slot"),
    templateSlotId: null,
    name: "New document",
    description: "",
    required: true,
    allowMultiple: false,
    files: [],
    ...overrides,
  };
}

/** One row of the final pack: files in slot order, then in-slot order. */
export interface OrderedEntry {
  position: number;
  slot: DocumentSlot;
  file: AttachedFile;
}

export function orderedEntries(slots: DocumentSlot[]): OrderedEntry[] {
  const out: OrderedEntry[] = [];
  for (const slot of slots) for (const file of slot.files) out.push({ position: out.length + 1, slot, file });
  return out;
}

/** Every blob key referenced by a pack. */
export function blobKeysOf(slots: DocumentSlot[]): string[] {
  return slots.flatMap((s) => s.files.map((f) => f.blobKey));
}

/** Packs that were created from the given template. */
export function packsUsingTemplate(packs: Pack[], templateId: string): Pack[] {
  return packs.filter((p) => p.templateId === templateId);
}

/** Content changes invalidate a previous export: status follows readiness. */
export function statusFor(ready: boolean): Pack["status"] {
  return ready ? "ready" : "draft";
}
