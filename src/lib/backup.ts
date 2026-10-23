import { MIME_BY_EXTENSION } from "./constants";
import { getExtension } from "./format";
import { newId } from "./id";
import { blobKeysOf } from "./packs";
import { signatureMatchesExtension } from "./validation/files";
import type { AttachedFile, DocumentSlot, Pack } from "@/types";

/**
 * Single-file pack backup, so work is not tied to one browser.
 *
 *   "DOCUTILE-BACKUP\n"  16 bytes magic
 *   uint32 big-endian    length of the JSON header
 *   JSON header          { version, exportedAt, pack, files: [{ blobKey, size }] }
 *   file bytes           each file in `files` order, back to back
 *
 * Blobs are concatenated as Blob parts (no base64, no full read into memory).
 * Backups are NOT encrypted: anyone with the file can read the documents.
 */
export const BACKUP_MAGIC = "DOCUTILE-BACKUP\n";
export const BACKUP_VERSION = 1;
export const BACKUP_EXTENSION = "docutile";
const MAX_HEADER_BYTES = 8 * 1024 * 1024;

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

interface BackupHeader {
  version: number;
  exportedAt: string;
  pack: Pack;
  files: { blobKey: string; size: number }[];
}

export type BlobSource = (blobKey: string) => Promise<Blob | null>;

export async function createBackup(pack: Pack, getBlob: BlobSource, now = new Date()): Promise<Blob> {
  const keys = blobKeysOf(pack.slots);
  const blobs: Blob[] = [];
  for (const key of keys) {
    const blob = await getBlob(key);
    if (!blob) throw new BackupError("A stored file is missing from this browser, so the backup would be incomplete. Re-attach it and try again.");
    blobs.push(blob);
  }
  const header: BackupHeader = {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    pack,
    files: keys.map((blobKey, i) => ({ blobKey, size: blobs[i].size })),
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, json.length, false);
  return new Blob([BACKUP_MAGIC, len, json, ...blobs], { type: "application/octet-stream" });
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function validateFile(f: unknown): AttachedFile {
  const o = f as Record<string, unknown>;
  if (!o || !isStr(o.id) || !isStr(o.originalName) || !isStr(o.displayName) || !isStr(o.blobKey) || !isNum(o.sizeBytes) || !isStr(o.uploadedAt)) {
    throw new BackupError("The backup contains a malformed file entry.");
  }
  return {
    id: o.id, originalName: o.originalName, displayName: o.displayName, blobKey: o.blobKey, sizeBytes: o.sizeBytes,
    uploadedAt: o.uploadedAt, lastModified: isNum(o.lastModified) ? o.lastModified : 0,
    mimeType: isStr(o.mimeType) ? o.mimeType : "application/octet-stream",
  };
}

function validateWaiting(w: unknown): DocumentSlot["waiting"] {
  const o = w as Record<string, unknown> | undefined;
  if (!o || !isStr(o.note)) return undefined;
  return { note: o.note, expectedBy: isStr(o.expectedBy) ? o.expectedBy : "", since: isStr(o.since) ? o.since : "" };
}

function validateSlot(s: unknown): DocumentSlot {
  const o = s as Record<string, unknown>;
  if (!o || !isStr(o.id) || !isStr(o.name) || typeof o.required !== "boolean" || !isStrArr(o.acceptedTypes) || !isNum(o.maxFileSizeBytes) || !Array.isArray(o.files)) {
    throw new BackupError("The backup contains a malformed document slot.");
  }
  return {
    id: o.id, templateSlotId: isStr(o.templateSlotId) ? o.templateSlotId : null, name: o.name,
    description: isStr(o.description) ? o.description : "", required: o.required, acceptedTypes: o.acceptedTypes,
    maxFileSizeBytes: o.maxFileSizeBytes, allowMultiple: o.allowMultiple === true,
    formRef: isStr(o.formRef) ? o.formRef : undefined, files: o.files.map(validateFile),
    waiting: validateWaiting(o.waiting),
  };
}

/** Rebuilds a Pack from untrusted JSON, keeping only known fields. */
function validatePack(p: unknown): Pack {
  const o = p as Record<string, unknown>;
  if (!o || !isStr(o.name) || !isStr(o.organisationName) || !Array.isArray(o.slots)) {
    throw new BackupError("The backup does not contain a valid pack.");
  }
  const str = (v: unknown) => (isStr(v) ? v : "");
  return {
    id: str(o.id), name: o.name, organisationName: o.organisationName, submissionType: str(o.submissionType),
    referenceNumber: str(o.referenceNumber), dueDate: str(o.dueDate), notes: str(o.notes),
    templateId: isStr(o.templateId) ? o.templateId : null, templateName: str(o.templateName) || "Custom checklist",
    templateSource: o.templateSource as Pack["templateSource"],
    templateChecklist: o.templateChecklist as Pack["templateChecklist"],
    templateNote: isStr(o.templateNote) ? o.templateNote : undefined,
    templateNextSteps: Array.isArray(o.templateNextSteps) && o.templateNextSteps.every(isStr) ? (o.templateNextSteps as string[]) : undefined,
    status: "draft", createdAt: str(o.createdAt), updatedAt: str(o.updatedAt), exportedAt: null,
    slots: o.slots.map(validateSlot),
  };
}

export interface ParsedBackup {
  pack: Pack;
  /** Blobs keyed by the key used in `pack`. */
  blobs: Map<string, Blob>;
}

/** Reads and strictly validates a backup. Throws BackupError with a user-readable message. */
export async function parseBackup(file: Blob): Promise<ParsedBackup> {
  const magicLen = BACKUP_MAGIC.length;
  if (file.size < magicLen + 4) throw new BackupError("This is not a Docutile backup file.");
  const magic = await file.slice(0, magicLen).text();
  if (magic !== BACKUP_MAGIC) throw new BackupError("This is not a Docutile backup file.");
  const headerLen = new DataView(await file.slice(magicLen, magicLen + 4).arrayBuffer()).getUint32(0, false);
  if (headerLen === 0 || headerLen > MAX_HEADER_BYTES || magicLen + 4 + headerLen > file.size) {
    throw new BackupError("The backup file is damaged (its header is invalid).");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await file.slice(magicLen + 4, magicLen + 4 + headerLen).text());
  } catch {
    throw new BackupError("The backup file is damaged (its header cannot be read).");
  }
  const h = raw as Partial<BackupHeader>;
  if (!h || h.version !== BACKUP_VERSION) {
    throw new BackupError(`This backup uses an unsupported version (${String(h?.version)}). Update Docutile and try again.`);
  }
  if (!Array.isArray(h.files)) throw new BackupError("The backup file is damaged (no file list).");
  const pack = validatePack(h.pack);

  const entries = h.files.map((f) => {
    if (!f || !isStr(f.blobKey) || !isNum(f.size) || f.size < 0) throw new BackupError("The backup file is damaged (bad file list).");
    return f;
  });
  const total = entries.reduce((n, f) => n + f.size, 0);
  if (magicLen + 4 + headerLen + total !== file.size) {
    throw new BackupError("The backup file is damaged or incomplete (its size does not match its contents).");
  }

  const blobs = new Map<string, Blob>();
  let offset = magicLen + 4 + headerLen;
  for (const f of entries) {
    blobs.set(f.blobKey, file.slice(offset, offset + f.size));
    offset += f.size;
  }

  // Every referenced file must be present, plausible and match its claimed type (files are untrusted input).
  for (const slot of pack.slots) {
    for (const f of slot.files) {
      const blob = blobs.get(f.blobKey);
      if (!blob) throw new BackupError(`The backup is missing the data for "${f.displayName}".`);
      const ext = getExtension(f.originalName);
      if (!(ext in MIME_BY_EXTENSION)) throw new BackupError(`"${f.originalName}" has a file type Docutile does not handle, so the backup was not imported.`);
      const head = new Uint8Array(await blob.slice(0, 1024).arrayBuffer());
      if (!signatureMatchesExtension(ext, head)) {
        throw new BackupError(`"${f.originalName}" does not look like a valid .${ext} file, so the backup was not imported.`);
      }
    }
  }
  return { pack, blobs };
}

/** Gives an imported pack fresh ids so it can never collide with or overwrite an existing pack. */
export function remapForImport(parsed: ParsedBackup, now = new Date()): { pack: Pack; blobs: Map<string, Blob> } {
  const keyMap = new Map<string, string>();
  for (const key of parsed.blobs.keys()) keyMap.set(key, newId("blob"));
  const blobs = new Map<string, Blob>();
  for (const [oldKey, blob] of parsed.blobs) blobs.set(keyMap.get(oldKey)!, blob);
  const ts = now.toISOString();
  const pack: Pack = {
    ...parsed.pack,
    id: newId("pack"),
    status: "draft",
    updatedAt: ts,
    exportedAt: null,
    createdAt: parsed.pack.createdAt || ts,
    slots: parsed.pack.slots.map((s) => ({
      ...s,
      files: s.files.map((f) => ({ ...f, id: newId("file"), blobKey: keyMap.get(f.blobKey) ?? f.blobKey })),
    })),
  };
  return { pack, blobs };
}

export function backupFileName(packName: string, date = new Date()): string {
  const safe = packName.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Pack";
  return `${safe.slice(0, 60)}_Backup_${date.toISOString().slice(0, 10)}.${BACKUP_EXTENSION}`;
}
