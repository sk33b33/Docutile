import type { AttachedFile, DocumentSlot, Pack } from "@/types";

export function file(name: string, over: Partial<AttachedFile> = {}): AttachedFile {
  return { id: `f_${name}`, originalName: name, displayName: name, mimeType: "application/pdf", sizeBytes: 100, lastModified: 0, blobKey: `b_${name}`, uploadedAt: "2025-01-01T00:00:00.000Z", ...over };
}

export function slot(id: string, required: boolean, files: AttachedFile[] = [], over: Partial<DocumentSlot> = {}): DocumentSlot {
  return { id, templateSlotId: null, name: `Slot ${id}`, description: "", required, acceptedTypes: ["pdf"], maxFileSizeBytes: 1000, allowMultiple: false, files, ...over };
}

export function pack(slots: DocumentSlot[]): Pack {
  return { id: "p1", name: "Test pack", organisationName: "Acme Ltd", submissionType: "", referenceNumber: "R-1", dueDate: "", notes: "", templateId: null, templateName: "Custom checklist", status: "draft", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", exportedAt: null, slots };
}
