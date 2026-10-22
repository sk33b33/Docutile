import { describe, expect, it } from "vitest";
import { moveItem } from "@/lib/ordering";
import { blobKeysOf, createPack, orderedEntries, packsUsingTemplate, statusFor } from "@/lib/packs";
import { exportFileName, sanitizeFilePart } from "@/lib/filename";
import { BUILT_IN_TEMPLATES, mergeTemplates } from "@/lib/templates";
import { MemoryRepository } from "@/lib/storage/memory";
import { StorageError } from "@/lib/storage/repository";
import { file, pack, slot } from "./helpers";

const meta = { name: " Q1 ", organisationName: " Acme ", submissionType: "", referenceNumber: "", dueDate: "", notes: "" };

describe("moveItem", () => {
  it("moves forward and backward", () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });
  it("ignores invalid moves and does not mutate", () => {
    const a = [1, 2];
    expect(moveItem(a, 0, 5)).toEqual([1, 2]);
    expect(moveItem(a, -1, 0)).toEqual([1, 2]);
    moveItem(a, 0, 1);
    expect(a).toEqual([1, 2]);
  });
});

describe("createPack", () => {
  it("copies template slots with fresh ids, preserving order and required flags", () => {
    const t = BUILT_IN_TEMPLATES[0];
    const p = createPack(meta, t);
    expect(p.name).toBe("Q1");
    expect(p.organisationName).toBe("Acme");
    expect(p.slots.map((s) => s.name)).toEqual(t.slots.map((s) => s.name));
    expect(p.slots.map((s) => s.required)).toEqual(t.slots.map((s) => s.required));
    expect(new Set(p.slots.map((s) => s.id)).size).toBe(t.slots.length);
    expect(p.slots.every((s) => s.files.length === 0)).toBe(true);
    expect(p.status).toBe("draft");
  });
  it("creates an empty custom pack", () => {
    const p = createPack(meta, null);
    expect(p.slots).toEqual([]);
    expect(p.templateId).toBeNull();
  });
  it("mutating the pack does not alter the template", () => {
    const t = BUILT_IN_TEMPLATES[0];
    const p = createPack(meta, t);
    p.slots[0].acceptedTypes.push("zzz");
    expect(t.slots[0].acceptedTypes).not.toContain("zzz");
  });
});

describe("ordering and helpers", () => {
  const p = pack([slot("a", true, [file("1.pdf"), file("2.pdf")]), slot("b", false), slot("c", true, [file("3.pdf")])]);
  it("orders files by slot order then in-slot order, skipping empty slots", () => {
    expect(orderedEntries(p.slots).map((e) => [e.position, e.file.originalName])).toEqual([[1, "1.pdf"], [2, "2.pdf"], [3, "3.pdf"]]);
  });
  it("reordering slots changes export order", () => {
    const re = moveItem(p.slots, 2, 0);
    expect(orderedEntries(re).map((e) => e.file.originalName)).toEqual(["3.pdf", "1.pdf", "2.pdf"]);
  });
  it("lists blob keys and template usage", () => {
    expect(blobKeysOf(p.slots)).toEqual(["b_1.pdf", "b_2.pdf", "b_3.pdf"]);
    expect(packsUsingTemplate([{ ...p, templateId: "t" }, p], "t")).toHaveLength(1);
  });
  it("status follows readiness", () => {
    expect(statusFor(true)).toBe("ready");
    expect(statusFor(false)).toBe("draft");
  });
});

describe("filenames", () => {
  it("sanitises organisation names", () => {
    expect(sanitizeFilePart("Acme & Sons, Ltd.")).toBe("AcmeSonsLtd");
    expect(sanitizeFilePart("../../etc/passwd")).toBe("EtcPasswd");
    expect(sanitizeFilePart("日本")).toBe("Pack");
  });
  it("builds a predictable export name", () => {
    expect(exportFileName("Acme Ltd", "pdf", new Date(2025, 0, 31))).toBe("AcmeLtd_SubmissionPack_2025-01-31.pdf");
  });
});

describe("MemoryRepository", () => {
  it("deletes blobs with the pack and surfaces quota errors", async () => {
    const repo = new MemoryRepository();
    const p = pack([slot("a", true, [file("1.pdf")])]);
    await repo.putBlob("b_1.pdf", new Blob(["x"]));
    await repo.savePack(p);
    await repo.deletePack(p.id);
    expect(await repo.getBlob("b_1.pdf")).toBeNull();
    repo.failBlobWrites = true;
    await expect(repo.putBlob("k", new Blob(["x"]))).rejects.toBeInstanceOf(StorageError);
  });
});

describe("mergeTemplates", () => {
  const edited = { ...BUILT_IN_TEMPLATES[1], name: "Edited client onboarding" };
  const custom = { ...BUILT_IN_TEMPLATES[0], id: "tpl_mine", builtIn: false, name: "Mine" };
  it("returns built-ins unchanged when nothing is saved", () => {
    expect(mergeTemplates(BUILT_IN_TEMPLATES, [])).toEqual(BUILT_IN_TEMPLATES);
  });
  it("replaces a built-in with its saved copy, keeping order, and appends custom templates", () => {
    const merged = mergeTemplates(BUILT_IN_TEMPLATES, [custom, edited]);
    expect(merged.map((t) => t.id)).toEqual([...BUILT_IN_TEMPLATES.map((t) => t.id), "tpl_mine"]);
    expect(merged[1].name).toBe("Edited client onboarding");
  });
  it("reset (removing the saved copy) restores the original", () => {
    expect(mergeTemplates(BUILT_IN_TEMPLATES, [custom])[1].name).toBe(BUILT_IN_TEMPLATES[1].name);
  });
});

import { DOJ_CATEGORY, DOJ_TEMPLATES } from "@/lib/templates/doj";
import { canMerge } from "@/lib/pdf/merge";
import { groupByCategory } from "@/lib/templates/categories";

describe("South African DOJ templates", () => {
  it("has the six expected checklists, all built-in and in the DOJ category", () => {
    expect(DOJ_TEMPLATES.map((t) => t.id)).toEqual([
      "tpl_doj_estate_over_250k", "tpl_doj_estate_under_250k", "tpl_doj_trust_inter_vivos",
      "tpl_doj_trust_testamentary", "tpl_doj_trust_termination", "tpl_doj_maintenance", "tpl_doj_protection_order",
    ]);
    expect(DOJ_TEMPLATES.every((t) => t.builtIn && t.category === DOJ_CATEGORY)).toBe(true);
  });
  it("cites an official justice.gov.za source with a retrieval date", () => {
    for (const t of DOJ_TEMPLATES) {
      expect(t.source?.url).toMatch(/^https:\/\/(www\.)?justice\.gov\.za\//);
      expect(t.source?.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("has unique slot ids across every built-in template", () => {
    const ids = BUILT_IN_TEMPLATES.flatMap((t) => t.slots.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("only accepts file types that can be merged into the combined PDF, and has required slots", () => {
    for (const t of DOJ_TEMPLATES) {
      expect(t.slots.some((s) => s.required)).toBe(true);
      for (const s of t.slots) expect(s.acceptedTypes.every((ext) => canMerge(`x.${ext}`))).toBe(true);
    }
  });
  it("carries the official form numbers", () => {
    const refs = (id: string) => DOJ_TEMPLATES.find((t) => t.id === id)!.slots.map((s) => s.formRef).filter(Boolean);
    expect(refs("tpl_doj_estate_over_250k")).toEqual(expect.arrayContaining(["J294", "J192", "J243", "J190", "J262"]));
    expect(refs("tpl_doj_estate_under_250k")).toEqual(expect.arrayContaining(["J294", "J192", "J243", "J155"]));
    expect(refs("tpl_doj_trust_inter_vivos")).toEqual(expect.arrayContaining(["J401", "J417", "J405", "J450", "J344"]));
    expect(refs("tpl_doj_protection_order")).toEqual(["Form 6", "Form 2"]);
  });
  it("a pack copies slots (with form refs) and the source, and needs only the required ones to be ready", () => {
    const t = DOJ_TEMPLATES[0];
    const p = createPack(meta, t);
    expect(p.templateSource).toEqual(t.source);
    expect(p.templateSource).not.toBe(t.source);
    expect(p.slots.find((s) => s.name === "Death notice")?.formRef).toBe("J294");
  });
  it("groups templates by category, keeping the general ones separate", () => {
    const groups = groupByCategory(BUILT_IN_TEMPLATES);
    const doj = groups.find((g) => g.category === DOJ_CATEGORY)!;
    expect(doj.templates).toHaveLength(7);
    expect(doj.note).toBeTruthy();
    expect(groups.length).toBeGreaterThan(1);
  });
});
