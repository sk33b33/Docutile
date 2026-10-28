import { getExtension } from "./format";
import type { AttachedFile, DocumentSlot, Pack } from "@/types";

/** Lower-case, accent-free text for matching. */
export function normalize(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const tokens = (query: string) => normalize(query).split(/\s+/).filter(Boolean);

function packHaystack(p: Pack): string {
  const parts = [p.name, p.organisationName, p.referenceNumber, p.submissionType, p.notes, p.templateName];
  for (const s of p.slots) {
    parts.push(s.name, s.formRef ?? "", s.waiting?.note ?? "");
    for (const f of s.files) parts.push(f.displayName, f.originalName);
  }
  return normalize(parts.join(" \n "));
}

/** Packs matching every word of the query (in any field, file name or slot name). Empty query returns all. */
export function searchPacks(packs: Pack[], query: string): Pack[] {
  const t = tokens(query);
  if (t.length === 0) return packs;
  return packs.filter((p) => {
    const hay = packHaystack(p);
    return t.every((w) => hay.includes(w));
  });
}

export interface LibraryRow {
  pack: Pack;
  slot: DocumentSlot;
  file: AttachedFile;
}

export function libraryRows(packs: Pack[]): LibraryRow[] {
  return packs.flatMap((pack) => pack.slots.flatMap((slot) => slot.files.map((file) => ({ pack, slot, file }))));
}

/** Files whose name, slot or pack matches every word of the query. */
export function searchLibrary(rows: LibraryRow[], query: string): LibraryRow[] {
  const t = tokens(query);
  if (t.length === 0) return rows;
  return rows.filter((r) => {
    const hay = normalize([r.file.displayName, r.file.originalName, r.slot.name, r.pack.name, r.pack.organisationName, r.pack.referenceNumber].join(" "));
    return t.every((w) => hay.includes(w));
  });
}

export type LibrarySort = "newest" | "oldest" | "name-asc" | "name-desc" | "pack-asc" | "pack-desc" | "size-desc" | "size-asc" | "type";

export const LIBRARY_SORTS: { value: LibrarySort; label: string }[] = [
  { value: "newest", label: "Date added: newest first" },
  { value: "oldest", label: "Date added: oldest first" },
  { value: "name-asc", label: "File name: A to Z" },
  { value: "name-desc", label: "File name: Z to A" },
  { value: "pack-asc", label: "Pack name: A to Z" },
  { value: "pack-desc", label: "Pack name: Z to A" },
  { value: "size-desc", label: "Size: largest first" },
  { value: "size-asc", label: "Size: smallest first" },
  { value: "type", label: "File type" },
];

/** Natural, accent- and case-insensitive ordering, so "doc2" comes before "doc10". */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** A sorted copy. Equal rows fall back to file name, then pack name, so the order is always the same. */
export function sortLibraryRows(rows: LibraryRow[], sort: LibrarySort): LibraryRow[] {
  const byName = (a: LibraryRow, b: LibraryRow) => collator.compare(a.file.displayName, b.file.displayName);
  const byPack = (a: LibraryRow, b: LibraryRow) => collator.compare(a.pack.name, b.pack.name);
  const date = (r: LibraryRow) => Date.parse(r.file.uploadedAt) || 0;
  const primary: Record<LibrarySort, (a: LibraryRow, b: LibraryRow) => number> = {
    newest: (a, b) => date(b) - date(a),
    oldest: (a, b) => date(a) - date(b),
    "name-asc": byName,
    "name-desc": (a, b) => byName(b, a),
    "pack-asc": byPack,
    "pack-desc": (a, b) => byPack(b, a),
    "size-desc": (a, b) => b.file.sizeBytes - a.file.sizeBytes,
    "size-asc": (a, b) => a.file.sizeBytes - b.file.sizeBytes,
    type: (a, b) => collator.compare(getExtension(a.file.originalName), getExtension(b.file.originalName)),
  };
  return [...rows].sort((a, b) => primary[sort](a, b) || byName(a, b) || byPack(a, b));
}

