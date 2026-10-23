import { describe, expect, it } from "vitest";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";
import { DEFAULT_EXPORT_OPTIONS, buildManifest, canMerge, mergePack, safePdfText } from "@/lib/pdf/merge";
import { file, pack, slot } from "./helpers";

const PNG_1X1 = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

async function pdfWithPages(n: number): Promise<Blob> {
  const d = await PDFDocument.create();
  for (let i = 0; i < n; i++) d.addPage([200, 200]);
  return new Blob([(await d.save()) as BlobPart]);
}

function loader(map: Record<string, Blob>) {
  return async (k: string) => map[k] ?? null;
}

describe("mergePack", () => {
  it("merges PDFs and images in slot order after a cover sheet, with correct page ranges", async () => {
    const p = pack([
      slot("a", true, [file("a.pdf")]),
      slot("b", true, [file("b.png")]),
      slot("c", true, [file("c.pdf")]),
    ]);
    const res = await mergePack(p, loader({ "b_a.pdf": await pdfWithPages(2), "b_b.png": new Blob([PNG_1X1]), "b_c.pdf": await pdfWithPages(3) }));
    expect(res.failures).toEqual([]);
    expect(res.bytes).not.toBeNull();
    const out = await PDFDocument.load(res.bytes!);
    expect(res.coverPages).toBe(1);
    expect(out.getPageCount()).toBe(1 + 2 + 1 + 3);
    expect(res.merged.map((m) => [m.entry.file.originalName, m.firstPage, m.pageCount])).toEqual([
      ["a.pdf", 2, 2], ["b.png", 4, 1], ["c.pdf", 5, 3],
    ]);
  });

  it("lists non-mergeable files as separate rather than faking conversion", async () => {
    const p = pack([slot("a", true, [file("a.pdf")]), slot("b", true, [file("b.docx")])]);
    const res = await mergePack(p, loader({ "b_a.pdf": await pdfWithPages(1), "b_b.docx": new Blob(["x"]) }));
    expect(res.separate.map((e) => e.file.originalName)).toEqual(["b.docx"]);
    expect(res.merged).toHaveLength(1);
    const out = await PDFDocument.load(res.bytes!);
    expect(out.getPageCount()).toBe(2); // cover + 1 page; docx not embedded
  });

  it("reports corrupt and missing files and produces no PDF", async () => {
    const p = pack([slot("a", true, [file("bad.pdf")]), slot("b", true, [file("gone.pdf")]), slot("c", true, [file("ok.pdf")])]);
    const res = await mergePack(p, loader({ "b_bad.pdf": new Blob(["%PDF-1.4 garbage"]), "b_ok.pdf": await pdfWithPages(1) }));
    expect(res.bytes).toBeNull();
    expect(res.failures.map((f) => f.entry.file.originalName)).toEqual(["bad.pdf", "gone.pdf"]);
  });

  it("returns no PDF when nothing is mergeable", async () => {
    const p = pack([slot("a", true, [file("a.docx")])]);
    const res = await mergePack(p, loader({}));
    expect(res.bytes).toBeNull();
    expect(res.failures).toEqual([]);
    expect(res.separate).toHaveLength(1);
  });

  it("handles non-Latin metadata without throwing", async () => {
    const p = { ...pack([slot("a", true, [file("a.pdf", { displayName: "合同 ✓ contract" })])]), name: "Ünïcode 日本" };
    const res = await mergePack(p, loader({ "b_a.pdf": await pdfWithPages(1) }));
    expect(res.bytes).not.toBeNull();
  });

  it("spills a long contents list onto extra cover pages with correct offsets", async () => {
    const slots = Array.from({ length: 60 }, (_, i) => slot(`s${i}`, true, [file(`f${i}.pdf`)]));
    const blobs = Object.fromEntries(await Promise.all(slots.map(async (s) => [s.files[0].blobKey, await pdfWithPages(1)])));
    const res = await mergePack(pack(slots), loader(blobs));
    expect(res.coverPages).toBeGreaterThan(1);
    const out = await PDFDocument.load(res.bytes!);
    expect(out.getPageCount()).toBe(res.coverPages + 60);
    expect(res.merged[0].firstPage).toBe(res.coverPages + 1);
  });
});

describe("helpers", () => {
  it("canMerge only for pdf/png/jpg", () => {
    expect(["a.pdf", "a.PNG", "a.jpeg", "a.jpg"].every(canMerge)).toBe(true);
    expect(["a.docx", "a.txt", "a.xls"].some(canMerge)).toBe(false);
  });
  it("safePdfText strips unencodable characters", () => {
    expect(safePdfText("a日b\nc")).toBe("a?b c");
  });
  it("manifest lists files in pack order", () => {
    const m = buildManifest(pack([slot("a", true, [file("1.pdf")]), slot("b", false, [file("2.docx")])]));
    expect(m.indexOf("1.pdf")).toBeLessThan(m.indexOf("2.docx"));
    expect(m).toContain("optional");
  });
});


describe("export options", () => {
  const three = async () => {
    const p = pack([slot("a", true, [file("a.pdf")]), slot("b", true, [file("b.pdf")]), slot("c", false, [file("c.pdf")])]);
    const blobs = { "b_a.pdf": await pdfWithPages(2), "b_b.pdf": await pdfWithPages(1), "b_c.pdf": await pdfWithPages(3) };
    return { p, load: loader(blobs) };
  };
  const none = { pageNumbers: false, bookmarks: false, links: false, dividers: false };

  it("adds bookmarks for the cover sheet and every document, pointing at the right pages", async () => {
    const { p, load } = await three();
    const res = await mergePack(p, load, new Date(), undefined, { ...none, bookmarks: true });
    const doc = await PDFDocument.load(res.bytes!);
    const outlines = doc.catalog.lookup(PDFName.of("Outlines"));
    expect(outlines).toBeDefined();
    // walk the linked list of items
    const titles: string[] = [];
    const pageRefs: string[] = [];
    let ref = (outlines as unknown as { get(k: PDFName): unknown }).get(PDFName.of("First"));
    while (ref) {
      const item = doc.context.lookup(ref as never) as unknown as { get(k: PDFName): unknown; lookup(k: PDFName): unknown };
      titles.push((item.lookup(PDFName.of("Title")) as unknown as { decodeText(): string }).decodeText());
      const dest = item.lookup(PDFName.of("Dest")) as PDFArray;
      pageRefs.push(String(dest.get(0)));
      ref = item.get(PDFName.of("Next"));
    }
    expect(titles).toEqual(["Cover sheet and contents", "1. a.pdf (Slot a)", "2. b.pdf (Slot b)", "3. c.pdf (Slot c)"]);
    const pageIndexOf = (r: string) => doc.getPages().findIndex((pg) => String(pg.ref) === r);
    expect(pageRefs.map(pageIndexOf)).toEqual([0, 1, 3, 4]); // cover, then 2 + 1 + 3 pages
  });

  it("makes contents lines clickable links to the document's first page", async () => {
    const { p, load } = await three();
    const res = await mergePack(p, load, new Date(), undefined, { ...none, links: true });
    const doc = await PDFDocument.load(res.bytes!);
    const annots = doc.getPage(0).node.Annots();
    expect(annots?.size()).toBe(3);
    const targets = [0, 1, 2].map((i) => {
      const a = doc.context.lookup(annots!.get(i)) as unknown as { lookup(k: PDFName): unknown };
      return String((a.lookup(PDFName.of("Dest")) as PDFArray).get(0));
    });
    expect(targets.map((r) => doc.getPages().findIndex((pg) => String(pg.ref) === r))).toEqual([1, 3, 4]);
  });

  it("inserts a divider page before each document and keeps the contents page numbers right", async () => {
    const { p, load } = await three();
    const res = await mergePack(p, load, new Date(), undefined, { ...none, dividers: true });
    const doc = await PDFDocument.load(res.bytes!);
    expect(doc.getPageCount()).toBe(1 + (1 + 2) + (1 + 1) + (1 + 3));
    expect(res.merged.map((m) => [m.firstPage, m.pageCount])).toEqual([[2, 3], [5, 2], [7, 4]]);
  });

  it("stamps 'Page X of Y' on every page when enabled", async () => {
    const { p, load } = await three();
    const on = await PDFDocument.load((await mergePack(p, load, new Date(), undefined, { ...none, pageNumbers: true })).bytes!);
    const off = await PDFDocument.load((await mergePack(p, load, new Date(), undefined, none)).bytes!);
    const streamLen = (d: PDFDocument, i: number) => (d.getPage(i).node.Contents() ? String(d.getPage(i).node.Contents()) : "").length;
    expect(on.getPageCount()).toBe(off.getPageCount());
    // every page of the stamped file has extra content compared with the plain one
    for (let i = 1; i < on.getPageCount(); i++) expect(streamLen(on, i)).toBeGreaterThanOrEqual(streamLen(off, i));
    const bytes = (await mergePack(p, load, new Date(), undefined, { ...none, pageNumbers: true })).bytes!;
    expect(bytes.length).toBeGreaterThan((await mergePack(p, load, new Date(), undefined, none)).bytes!.length);
  });

  it("defaults: page numbers, bookmarks and links on; dividers off", () => {
    expect(DEFAULT_EXPORT_OPTIONS).toEqual({ pageNumbers: true, bookmarks: true, links: true, dividers: false });
  });
});
