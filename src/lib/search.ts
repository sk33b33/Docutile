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
