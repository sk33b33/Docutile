import { PDFDocument, PDFFont, PDFHexString, PDFName, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { getExtension } from "../format";
import { formatDate } from "../format";
import { MERGEABLE_IMAGE_TYPES, MERGEABLE_PDF_TYPES } from "../constants";
import { orderedEntries, type OrderedEntry } from "../packs";
import type { Pack } from "@/types";

export interface ExportOptions {
  /** "Page X of Y" in the footer of every page. */
  pageNumbers: boolean;
  /** PDF bookmarks (outline) for the cover sheet and each document. */
  bookmarks: boolean;
  /** Make each line of the contents on the cover sheet a link to that document. */
  links: boolean;
  /** Insert a title page before each document. */
  dividers: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = { pageNumbers: true, bookmarks: true, links: true, dividers: false };

export type BlobLoader = (blobKey: string) => Promise<Blob | null>;

export interface MergeFailure {
  entry: OrderedEntry;
  reason: string;
}

export interface MergedItem {
  entry: OrderedEntry;
  firstPage: number; // 1-based, in the final document (cover included)
  pageCount: number;
}

export interface MergeResult {
  /** Present only when there were no failures and at least one mergeable file. */
  bytes: Uint8Array | null;
  merged: MergedItem[];
  /** Files that cannot be placed into a PDF in the browser. They are listed on the cover sheet. */
  separate: OrderedEntry[];
  failures: MergeFailure[];
  coverPages: number;
}

export function canMerge(fileName: string): boolean {
  const ext = getExtension(fileName);
  return MERGEABLE_PDF_TYPES.includes(ext) || MERGEABLE_IMAGE_TYPES.includes(ext);
}

/** Helvetica (WinAnsi) cannot encode arbitrary Unicode; replace what it cannot draw. */
export function safePdfText(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

const A4: [number, number] = [595.28, 841.89];

async function appendImage(doc: PDFDocument, bytes: Uint8Array, ext: string): Promise<number> {
  const img = ext === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const margin = 36;
  const [pw, ph] = A4;
  const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height, 1);
  const w = img.width * scale;
  const h = img.height * scale;
  const page = doc.addPage(A4);
  page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  return 1;
}

async function appendPdf(doc: PDFDocument, bytes: Uint8Array): Promise<number> {
  const src = await PDFDocument.load(bytes); // throws for encrypted / malformed files
  const pages = await doc.copyPages(src, src.getPageIndices());
  pages.forEach((p) => doc.addPage(p));
  return pages.length;
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/encrypt/i.test(msg)) return "The PDF is password-protected or encrypted. Remove the protection and re-attach it.";
  return "The file could not be read as a valid document. It may be corrupt. Re-save or re-export it and re-attach it.";
}

interface CoverRow { n: number; label: string; detail: string; pages: string; /** 1-based final page this row points to. */ target?: number }

/** Where a contents row sits on the cover sheet, for building link annotations. */
export interface CoverHit { coverPage: number; rect: [number, number, number, number]; target: number }

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safePdfText(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders the cover sheet into `doc` (appended) and returns how many pages it used. */
export async function drawCoverSheet(
  doc: PDFDocument,
  pack: Pack,
  rows: CoverRow[],
  separateRows: CoverRow[],
  generatedAt: Date,
): Promise<{ pages: number; hits: CoverHit[] }> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [pw, ph] = A4;
  const m = 56;
  const navy = rgb(0.06, 0.13, 0.27);
  const grey = rgb(0.35, 0.4, 0.47);
  let pages = 0;
  const hits: CoverHit[] = [];
  let page: PDFPage;
  let y = 0;

  const newPage = () => { page = doc.addPage(A4); pages++; y = ph - m; };
  const ensure = (h: number) => { if (y - h < m) newPage(); };
  const text = (t: string, x: number, size: number, f = font, color = navy) => {
    page.drawText(safePdfText(t), { x, y, size, font: f, color });
  };

  newPage();
  text(pack.name, m, 22, bold);
  y -= 28;
  text(`Prepared for ${pack.organisationName}`, m, 12, font, grey);
  y -= 26;

  const meta: [string, string][] = [
    ["Submission type", pack.submissionType],
    ["Reference", pack.referenceNumber],
    ["Due date", formatDate(pack.dueDate)],
    ["Generated", generatedAt.toLocaleString()],
  ];
  for (const [k, v] of meta) {
    if (!v) continue;
    text(k, m, 10, bold, grey);
    text(v, m + 110, 10);
    y -= 16;
  }
  y -= 14;
  page!.drawLine({ start: { x: m, y }, end: { x: pw - m, y }, thickness: 0.7, color: rgb(0.8, 0.83, 0.87) });
  y -= 22;

  const section = (title: string, list: CoverRow[], showPages: boolean) => {
    ensure(40);
    text(title, m, 13, bold);
    y -= 20;
    for (const r of list) {
      const lines = wrap(r.label, font, 10, pw - m * 2 - 90);
      const detailLines = r.detail ? wrap(r.detail, font, 8.5, pw - m * 2 - 90) : [];
      ensure(lines.length * 13 + detailLines.length * 11 + 8);
      const firstBaseline = y;
      text(`${r.n}.`, m, 10, bold);
      lines.forEach((l, i) => { text(l, m + 24, 10); if (i < lines.length - 1) y -= 13; });
      if (showPages && r.target) hits.push({ coverPage: pages - 1, rect: [m, y - 3, pw - m, firstBaseline + 11], target: r.target });
      if (showPages) {
        const wd = font.widthOfTextAtSize(r.pages, 10);
        page.drawText(safePdfText(r.pages), { x: pw - m - wd, y: y + (lines.length - 1) * 0, size: 10, font, color: navy });
      }
      y -= 13;
      for (const d of detailLines) { text(d, m + 24, 8.5, font, grey); y -= 11; }
      y -= 5;
    }
    y -= 6;
  };

  if (rows.length) section("Contents", rows, true);
  if (separateRows.length) {
    section("Supplied separately (not included in this PDF)", separateRows, false);
  }
  return { pages, hits };
}

export interface MergeProgress {
  done: number;
  total: number;
  /** Display name of the file just processed, or a stage label. */
  label: string;
}

async function drawDivider(doc: PDFDocument, entry: OrderedEntry, index: number, total: number, pack: Pack) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  const [pw, ph] = A4;
  const navy = rgb(0.06, 0.13, 0.27);
  const grey = rgb(0.35, 0.4, 0.47);
  const centred = (t: string, y: number, size: number, f: PDFFont, color = navy) => {
    for (const [i, line] of wrap(t, f, size, pw - 120).entries()) {
      const w = f.widthOfTextAtSize(line, size);
      page.drawText(line, { x: (pw - w) / 2, y: y - i * (size + 6), size, font: f, color });
    }
  };
  centred(`Document ${index} of ${total}`, ph / 2 + 70, 12, font, grey);
  centred(entry.file.displayName, ph / 2 + 30, 24, bold);
  centred(`${entry.slot.name}${entry.slot.required ? "" : " (optional)"}`, ph / 2 - 30, 13, font, grey);
  centred(pack.name, 70, 10, font, grey);
}

/** Flat PDF outline (bookmarks). Titles are hex strings so any text is safe. */
function addOutline(doc: PDFDocument, items: { title: string; pageIndex: number }[]) {
  if (items.length === 0) return;
  const ctx = doc.context;
  const rootRef = ctx.nextRef();
  const refs = items.map(() => ctx.nextRef());
  items.forEach((it, i) => {
    const dict = ctx.obj({
      Title: PDFHexString.fromText(it.title),
      Parent: rootRef,
      ...(i > 0 ? { Prev: refs[i - 1] } : {}),
      ...(i < items.length - 1 ? { Next: refs[i + 1] } : {}),
      Dest: [doc.getPage(it.pageIndex).ref, PDFName.of("Fit")],
    });
    ctx.assign(refs[i], dict);
  });
  ctx.assign(rootRef, ctx.obj({ Type: "Outlines", First: refs[0], Last: refs[refs.length - 1], Count: items.length }));
  doc.catalog.set(PDFName.of("Outlines"), rootRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

function addLinks(doc: PDFDocument, hits: CoverHit[]) {
  for (const h of hits) {
    const target = doc.getPage(h.target - 1);
    const annot = doc.context.register(
      doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: h.rect, Border: [0, 0, 0], Dest: [target.ref, PDFName.of("Fit")] }),
    );
    doc.getPage(h.coverPage).node.addAnnot(annot);
  }
}

async function addPageNumbers(doc: PDFDocument) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  doc.getPages().forEach((page, i) => {
    const text = `Page ${i + 1} of ${total}`;
    const { width } = page.getSize();
    const w = font.widthOfTextAtSize(text, 8);
    page.drawText(text, { x: (width - w) / 2, y: 12, size: 8, font, color: rgb(0.4, 0.45, 0.52) });
  });
}

export async function mergePack(
  pack: Pack,
  loadBlob: BlobLoader,
  now = new Date(),
  onProgress?: (p: MergeProgress) => void,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<MergeResult> {
  const entries = orderedEntries(pack.slots);
  const mergeable = entries.filter((e) => canMerge(e.file.originalName));
  const separate = entries.filter((e) => !canMerge(e.file.originalName));

  const body = await PDFDocument.create();
  const failures: MergeFailure[] = [];
  const bodyItems: { entry: OrderedEntry; first: number; count: number }[] = [];

  for (const [i, entry] of mergeable.entries()) {
    onProgress?.({ done: i, total: mergeable.length, label: entry.file.displayName });
    const blob = await loadBlob(entry.file.blobKey);
    if (!blob) {
      failures.push({ entry, reason: "The stored file could not be found in this browser. Re-attach it." });
      continue;
    }
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const ext = getExtension(entry.file.originalName);
      const first = body.getPageCount() + 1;
      if (options.dividers) await drawDivider(body, entry, i + 1, mergeable.length, pack);
      const count = (options.dividers ? 1 : 0) + await (MERGEABLE_PDF_TYPES.includes(ext) ? await appendPdf(body, bytes) : await appendImage(body, bytes, ext));
      bodyItems.push({ entry, first, count });
    } catch (err) {
      failures.push({ entry, reason: describeError(err) });
    }
  }

  if (failures.length || bodyItems.length === 0) {
    return { bytes: null, merged: [], separate, failures, coverPages: 0 };
  }

  onProgress?.({ done: mergeable.length, total: mergeable.length, label: "Building cover sheet and saving" });
  const label = (e: OrderedEntry) => e.file.displayName;
  const detail = (e: OrderedEntry) => `${e.slot.name}${e.slot.required ? "" : " (optional)"}`;
  const separateRows: CoverRow[] = separate.map((e, i) => ({
    n: bodyItems.length + i + 1, label: label(e), detail: detail(e), pages: "",
  }));

  // First pass counts cover pages; second pass writes real page numbers.
  const rowsFor = (offset: number): CoverRow[] =>
    bodyItems.map((b, i) => {
      const from = b.first + offset;
      const to = from + b.count - 1;
      return { n: i + 1, label: label(b.entry), detail: detail(b.entry), pages: from === to ? `p. ${from}` : `pp. ${from}-${to}`, target: from };
    });
  const probe = await PDFDocument.create();
  const { pages: coverPages } = await drawCoverSheet(probe, pack, rowsFor(0), separateRows, now);

  const final = await PDFDocument.create();
  const { hits } = await drawCoverSheet(final, pack, rowsFor(coverPages), separateRows, now);
  const copied = await final.copyPages(body, body.getPageIndices());
  copied.forEach((p) => final.addPage(p));
  if (options.links) addLinks(final, hits);
  if (options.bookmarks) {
    addOutline(final, [
      { title: "Cover sheet and contents", pageIndex: 0 },
      ...bodyItems.map((b, i) => ({ title: `${i + 1}. ${b.entry.file.displayName} (${b.entry.slot.name})`, pageIndex: b.first + coverPages - 1 })),
    ]);
  }
  if (options.pageNumbers) await addPageNumbers(final);
  final.setTitle(safePdfText(pack.name));
  final.setProducer("Docutile");
  final.setCreator("Docutile");

  return {
    bytes: await final.save(),
    merged: bodyItems.map((b) => ({ entry: b.entry, firstPage: b.first + coverPages, pageCount: b.count })),
    separate,
    failures: [],
    coverPages,
  };
}

/** Plain-text manifest, for packs with files that cannot be merged. */
export function buildManifest(pack: Pack, generatedAt = new Date()): string {
  const header: (string | false)[] = [
    `PACK MANIFEST: ${pack.name}`,
    `Client / organisation: ${pack.organisationName}`,
    pack.referenceNumber && `Reference: ${pack.referenceNumber}`,
    pack.submissionType && `Submission type: ${pack.submissionType}`,
    pack.dueDate && `Due date: ${formatDate(pack.dueDate)}`,
    `Generated: ${generatedAt.toLocaleString()}`,
    "",
    "CONTENTS (in pack order)",
  ];
  const lines = header.filter((l): l is string => l !== false);
  const entries = orderedEntries(pack.slots);
  entries.forEach((e) => {
    lines.push(`${e.position}. ${e.file.displayName}  [${e.slot.name}${e.slot.required ? "" : ", optional"}]  (${e.file.originalName})`);
  });
  return lines.join("\n") + "\n";
}
