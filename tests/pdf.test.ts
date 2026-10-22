import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildManifest, canMerge, mergePack, safePdfText } from "@/lib/pdf/merge";
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
