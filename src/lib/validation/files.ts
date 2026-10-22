import { getExtension } from "../format";
import { formatBytes, formatTypeList } from "../format";
import type { DocumentSlot } from "@/types";

export type FileCheck =
  | { ok: true; warnings: string[] }
  | { ok: false; error: string };

type SlotRules = Pick<DocumentSlot, "acceptedTypes" | "maxFileSizeBytes">;

/** Checks name/extension and size. Synchronous and content-free. */
export function validateFileMeta(
  file: { name: string; size: number },
  rules: SlotRules,
  existingNames: string[] = [],
): FileCheck {
  const ext = getExtension(file.name);
  if (!ext || !rules.acceptedTypes.includes(ext)) {
    return {
      ok: false,
      error: `"${file.name}" is not an accepted file type for this document. Accepted: ${formatTypeList(rules.acceptedTypes)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" is empty (0 bytes).` };
  }
  if (file.size > rules.maxFileSizeBytes) {
    return {
      ok: false,
      error: `"${file.name}" is ${formatBytes(file.size)}, which exceeds the ${formatBytes(rules.maxFileSizeBytes)} limit.`,
    };
  }
  const warnings: string[] = [];
  if (existingNames.some((n) => n.toLowerCase() === file.name.toLowerCase())) {
    warnings.push(`A file named "${file.name}" is already attached in this pack.`);
  }
  return { ok: true, warnings };
}

const startsWith = (bytes: Uint8Array, sig: number[]) => sig.every((b, i) => bytes[i] === b);

/**
 * Verifies that the leading bytes match the claimed extension for formats we can
 * recognise. Guards against renamed files; it is not a malware scan.
 */
export function signatureMatchesExtension(ext: string, head: Uint8Array): boolean {
  switch (ext) {
    case "pdf":
      // "%PDF-" may be preceded by a few bytes of junk per the PDF spec; allow up to 1024.
      return new TextDecoder("latin1").decode(head.subarray(0, 1024)).includes("%PDF-");
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "docx":
    case "xlsx":
    case "pptx":
      return startsWith(head, [0x50, 0x4b]); // ZIP container
    case "doc":
    case "xls":
    case "ppt":
      return startsWith(head, [0xd0, 0xcf, 0x11, 0xe0]); // OLE2 container
    default:
      return true;
  }
}

/** Full validation including content-signature sniffing. */
export async function validateFile(
  file: File,
  rules: SlotRules,
  existingNames: string[] = [],
): Promise<FileCheck> {
  const meta = validateFileMeta(file, rules, existingNames);
  if (!meta.ok) return meta;
  try {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    if (!signatureMatchesExtension(getExtension(file.name), head)) {
      return {
        ok: false,
        error: `"${file.name}" does not look like a valid .${getExtension(file.name)} file (its contents do not match its extension).`,
      };
    }
  } catch {
    return { ok: false, error: `"${file.name}" could not be read. Please try again.` };
  }
  return meta;
}
