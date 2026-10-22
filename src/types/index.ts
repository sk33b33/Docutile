/** Serialisable domain models. Blob data is never stored in these objects. */

export type PackStatus = "draft" | "ready" | "exported";

export interface TemplateSlot {
  id: string;
  name: string;
  description: string;
  required: boolean;
  /** Lower-case extensions without dot, e.g. "pdf". */
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  allowMultiple: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  slots: TemplateSlot[];
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttachedFile {
  id: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  lastModified: number;
  /** Key of the Blob in the blob store. */
  blobKey: string;
  uploadedAt: string;
}

export interface DocumentSlot {
  id: string;
  templateSlotId: string | null;
  name: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  allowMultiple: boolean;
  files: AttachedFile[];
}

/** Slot order is the array order of `Pack.slots`. */
export interface Pack {
  id: string;
  name: string;
  organisationName: string;
  submissionType: string;
  referenceNumber: string;
  dueDate: string;
  notes: string;
  templateId: string | null;
  templateName: string;
  status: PackStatus;
  createdAt: string;
  updatedAt: string;
  exportedAt: string | null;
  slots: DocumentSlot[];
}

export type ActivityType =
  | "pack_created"
  | "pack_updated"
  | "pack_deleted"
  | "file_attached"
  | "file_replaced"
  | "file_removed"
  | "file_renamed"
  | "slot_reordered"
  | "slot_added"
  | "slot_removed"
  | "slot_updated"
  | "draft_saved"
  | "pack_exported"
  | "template_saved"
  | "template_deleted"
  | "data_cleared";

export interface ActivityEvent {
  id: string;
  packId: string | null;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export interface Settings {
  defaultMaxFileSizeBytes: number;
}
