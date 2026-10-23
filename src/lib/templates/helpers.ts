import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants";
import type { ChecklistStatus, Template, TemplateSlot, TemplateSource } from "@/types";

/** Scans and photos only, so every document in a pack built from these can be merged into the combined PDF. */
export const SCAN_TYPES = ["pdf", "png", "jpg", "jpeg"];
export const RETRIEVED = "2026-10-23";
const SEED_DATE = "2025-01-01T00:00:00.000Z";

export function slot(
  id: string,
  name: string,
  required: boolean,
  description: string,
  formRef?: string,
  allowMultiple = false,
  acceptedTypes: string[] = SCAN_TYPES,
): TemplateSlot {
  return { id, name, description, required, formRef, acceptedTypes, maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES, allowMultiple };
}

export interface TplOptions {
  category: string;
  subcategory?: string;
  checklist: ChecklistStatus;
  checklistNote?: string;
  nextSteps?: string[];
}

export function tpl(id: string, name: string, description: string, source: TemplateSource, opts: TplOptions, slots: TemplateSlot[]): Template {
  return { id, name, description, source, slots, builtIn: true, createdAt: SEED_DATE, updatedAt: SEED_DATE, ...opts };
}

/** Used for services where the source names the form but not the supporting documents. */
export const supportingDocs = (id: string) =>
  slot(id, "Supporting documents", false, "Any documents the Master asks for in support. The DOJ forms page does not list them: confirm with the Master's Office.", undefined, true);
