/** Serialisable domain models. Blob data is never stored in these objects. */

export type PackStatus = "draft" | "ready" | "exported";

/** Where a template's checklist came from, so users can verify it. */
export interface TemplateSource {
  label: string;
  url: string;
  /** ISO date the checklist was read from the source. */
  retrievedOn: string;
  /** The source page's own "last updated" note, when it shows one. */
  pageUpdated?: string;
}

/**
 * How much of a service's document list the source actually publishes:
 * - published: the source gives a document list for this service
 * - partial: the source describes the process or part of the list; the rest follows standard practice
 * - form-only: the source names the form but not the supporting documents
 */
export type ChecklistStatus = "published" | "partial" | "form-only";

export interface TemplateSlot {
  id: string;
  name: string;
  description: string;
  required: boolean;
  /** Lower-case extensions without dot, e.g. "pdf". */
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  allowMultiple: boolean;
  /** Official form number shown on the tile, e.g. "J294". */
  formRef?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Optional second level under `category`, e.g. "Estates" under "South African DOJ". */
  subcategory?: string;
  checklist?: ChecklistStatus;
  /** What is and is not covered by the checklist, shown to users. */
  checklistNote?: string;
  /** What happens after the pack is assembled, as the source describes it. Shown on the pack as a short list. */
  nextSteps?: string[];
  slots: TemplateSlot[];
  builtIn: boolean;
  source?: TemplateSource;
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
  formRef?: string;
  /** Set when a missing document has been applied for and is on its way. Does NOT count as present. */
  waiting?: WaitingNote;
  files: AttachedFile[];
}

export interface WaitingNote {
  note: string;
  /** YYYY-MM-DD, optional. */
  expectedBy: string;
  /** ISO timestamp when the note was set. */
  since: string;
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
  templateSource?: TemplateSource;
  templateChecklist?: ChecklistStatus;
  templateNote?: string;
  templateNextSteps?: string[];
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
  /** When each pack was last exported as a backup file (pack id to ISO time). */
  lastBackups?: Record<string, string>;
  /** Hide the backup reminder until this ISO time. */
  backupSnoozedUntil?: string;
}
