import { describe, expect, it } from "vitest";
import { signatureMatchesExtension, validateFile, validateFileMeta } from "@/lib/validation/files";
import { computeCompleteness, validatePackMeta } from "@/lib/validation/pack";
import { file, slot } from "./helpers";

const rules = { acceptedTypes: ["pdf", "png"], maxFileSizeBytes: 1000 };

describe("validateFileMeta", () => {
  it("accepts an allowed type within the size limit", () => {
    expect(validateFileMeta({ name: "a.PDF", size: 10 }, rules)).toEqual({ ok: true, warnings: [] });
  });
  it("rejects disallowed or missing extensions", () => {
    expect(validateFileMeta({ name: "a.exe", size: 10 }, rules).ok).toBe(false);
    expect(validateFileMeta({ name: "noext", size: 10 }, rules).ok).toBe(false);
  });
  it("rejects oversized and empty files", () => {
    const big = validateFileMeta({ name: "a.pdf", size: 1001 }, rules);
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/exceeds/);
    expect(validateFileMeta({ name: "a.pdf", size: 0 }, rules).ok).toBe(false);
  });
  it("accepts a file exactly at the limit", () => {
    expect(validateFileMeta({ name: "a.pdf", size: 1000 }, rules).ok).toBe(true);
  });
  it("warns, but does not block, on duplicate names (case-insensitive)", () => {
    const r = validateFileMeta({ name: "A.pdf", size: 10 }, rules, ["a.pdf"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toHaveLength(1);
  });
});

describe("signatureMatchesExtension / validateFile", () => {
  it("detects renamed files", () => {
    const text = new TextEncoder().encode("hello world");
    expect(signatureMatchesExtension("pdf", text)).toBe(false);
    expect(signatureMatchesExtension("png", text)).toBe(false);
    expect(signatureMatchesExtension("docx", text)).toBe(false);
    expect(signatureMatchesExtension("txt", text)).toBe(true);
    expect(signatureMatchesExtension("pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(signatureMatchesExtension("jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });
  it("rejects a text file renamed to .pdf", async () => {
    const f = new File(["not a pdf"], "fake.pdf", { type: "application/pdf" });
    const r = await validateFile(f, rules);
    expect(r.ok).toBe(false);
  });
  it("accepts a real PDF header", async () => {
    const f = new File(["%PDF-1.4 ..."], "real.pdf");
    expect((await validateFile(f, rules)).ok).toBe(true);
  });
});

describe("computeCompleteness", () => {
  it("counts only required slots with files", () => {
    const c = computeCompleteness([slot("a", true, [file("a.pdf")]), slot("b", true), slot("c", false)]);
    expect(c.requiredTotal).toBe(2);
    expect(c.requiredComplete).toBe(1);
    expect(c.percent).toBe(50);
    expect(c.missing.map((s) => s.id)).toEqual(["b"]);
    expect(c.ready).toBe(false);
  });
  it("is never ready while a required slot is empty, even with optional files", () => {
    const c = computeCompleteness([slot("a", true), slot("o", false, [file("o.pdf")])]);
    expect(c.ready).toBe(false);
    expect(c.optionalComplete).toBe(1);
  });
  it("is ready when all required slots are filled; empty optional slots do not block", () => {
    const c = computeCompleteness([slot("a", true, [file("a.pdf")]), slot("o", false)]);
    expect(c.ready).toBe(true);
    expect(c.percent).toBe(100);
  });
  it("is not ready for an empty pack or one with no files", () => {
    expect(computeCompleteness([]).ready).toBe(false);
    expect(computeCompleteness([slot("o", false)]).ready).toBe(false);
  });
});

describe("validatePackMeta", () => {
  it("requires name and organisation", () => {
    expect(validatePackMeta({ name: " ", organisationName: "" }).map((i) => i.field)).toEqual(["name", "organisationName"]);
    expect(validatePackMeta({ name: "x", organisationName: "y" })).toEqual([]);
  });
});
