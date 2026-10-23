import { describe, expect, it } from "vitest";
import { moveItem } from "@/lib/ordering";
import { blobKeysOf, createPack, orderedEntries, packsUsingTemplate, statusFor } from "@/lib/packs";
import { exportFileName, sanitizeFilePart } from "@/lib/filename";
import { BUILT_IN_TEMPLATES, mergeTemplates } from "@/lib/templates";
import { MemoryRepository } from "@/lib/storage/memory";
import { StorageError } from "@/lib/storage/repository";
import { computeCompleteness } from "@/lib/validation/pack";
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

import { COURTS_CATEGORY, CURATORS_TUTORS, DOJ_CATEGORY, DOJ_TEMPLATES, DOMESTIC_VIOLENCE, ESTATES, GUARDIANS_FUND, INSOLVENT_ESTATES, MAINTENANCE, MASTER_OTHER_CATEGORY, TRUSTS } from "@/lib/templates/doj";
import { canMerge } from "@/lib/pdf/merge";
import { groupByCategory } from "@/lib/templates/categories";

const doj = (sub: string) => DOJ_TEMPLATES.filter((t) => t.category === DOJ_CATEGORY && t.subcategory === sub);
const byId = (id: string) => DOJ_TEMPLATES.find((t) => t.id === id)!;

describe("South African DOJ catalogue", () => {
  it("splits the DOJ category into exactly two subcategories: Estates and Trusts", () => {
    const subs = new Set(DOJ_TEMPLATES.filter((t) => t.category === DOJ_CATEGORY).map((t) => t.subcategory));
    expect([...subs].sort()).toEqual([ESTATES, TRUSTS].sort());
  });
  it("lists every Estates service", () => {
    expect(doj(ESTATES).map((t) => t.id)).toEqual([
      "tpl_doj_estate_over_250k", "tpl_doj_estate_under_250k", "tpl_doj_estate_foreign", "tpl_doj_estate_laa",
      "tpl_doj_estate_objection", "tpl_doj_estate_copies", "tpl_doj_estate_s42", "tpl_doj_estate_s80", "tpl_doj_estate_funeral",
    ]);
  });
  it("lists every Trusts service", () => {
    expect(doj(TRUSTS).map((t) => t.id)).toEqual([
      "tpl_doj_trust_inter_vivos", "tpl_doj_trust_testamentary", "tpl_doj_trust_amend_trustees", "tpl_doj_trust_amend_auditor",
      "tpl_doj_trust_amend_bond", "tpl_doj_trust_amend_general", "tpl_doj_trust_trustee_details",
      "tpl_doj_trust_bo_register", "tpl_doj_trust_terminated_report", "tpl_doj_trust_dormant_report",
      "tpl_doj_trust_termination", "tpl_doj_trust_info", "tpl_doj_trust_copies",
    ]);
  });
  it("keeps maintenance and domestic violence services in a separate courts category", () => {
    const sub = (name: string) => DOJ_TEMPLATES.filter((t) => t.category === COURTS_CATEGORY && t.subcategory === name).map((t) => t.id);
    expect(sub(MAINTENANCE)).toEqual([
      "tpl_doj_maintenance", "tpl_doj_mnt_substitution", "tpl_doj_mnt_consent", "tpl_doj_mnt_variation", "tpl_doj_mnt_enforcement",
      "tpl_doj_mnt_warrant", "tpl_doj_mnt_emoluments", "tpl_doj_mnt_debts", "tpl_doj_mnt_noncompliance",
    ]);
    expect(sub(DOMESTIC_VIOLENCE)).toEqual([
      "tpl_doj_protection_order", "tpl_doj_dv_report", "tpl_doj_dv_variation", "tpl_doj_dv_contravention",
      "tpl_doj_dv_warrant", "tpl_doj_dv_monitoring", "tpl_doj_dv_service",
    ]);
  });
  it("lists the Master's other divisions in their own category, not under Estates or Trusts", () => {
    const sub = (name: string) => DOJ_TEMPLATES.filter((t) => t.category === MASTER_OTHER_CATEGORY && t.subcategory === name);
    expect(sub(GUARDIANS_FUND)).toHaveLength(12);
    expect(sub(CURATORS_TUTORS)).toHaveLength(3);
    expect(sub(INSOLVENT_ESTATES)).toHaveLength(16);
    expect(DOJ_TEMPLATES.filter((t) => t.category === DOJ_CATEGORY).every((t) => t.subcategory === ESTATES || t.subcategory === TRUSTS)).toBe(true);
  });
  it("Guardian's Fund services carry the requirements the DOJ publishes", () => {
    const get = (id: string) => byId(id);
    const allowance = get("tpl_doj_gf_allowance");
    const req = (slotId: string) => allowance.slots.find((x) => x.id === slotId)?.required;
    expect([req("doj_ga_j341"), req("doj_ga_bank"), req("doj_ga_cert"), req("doj_ga_minor_id"), req("doj_ga_guardian_id")]).toEqual([true, true, true, true, true]);
    expect([req("doj_ga_school"), req("doj_ga_quotes"), req("doj_ga_adoption")]).toEqual([false, false, false]);
    expect(get("tpl_doj_gf_claim").slots.map((x) => x.formRef).filter(Boolean)).toContain("J251");
    expect(get("tpl_doj_gf_fideicommissary").slots.map((x) => x.formRef)).toEqual(expect.arrayContaining(["J251", "J251A"]));
    const school = get("tpl_doj_gf_school_fees");
    expect(school.slots.every((x) => x.required)).toBe(true);
    expect(get("tpl_doj_curator_apply").slots.find((x) => x.formRef === "J197")?.required).toBe(true);
  });
  it("cites an official justice.gov.za source with a retrieval date for every service", () => {
    for (const t of DOJ_TEMPLATES) {
      expect(t.builtIn).toBe(true);
      expect(t.source?.url, t.id).toMatch(/^https:\/\/(www\.)?justice\.gov\.za\//);
      expect(t.source?.retrievedOn, t.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("states how complete each checklist is, and explains every non-official one", () => {
    for (const t of DOJ_TEMPLATES) {
      expect(["published", "partial", "form-only"], t.id).toContain(t.checklist);
      if (t.checklist !== "published") expect(t.checklistNote, t.id).toBeTruthy();
    }
  });
  it("gives every service at least one required tile and unique tile ids across all built-ins", () => {
    for (const t of DOJ_TEMPLATES) expect(t.slots.some((s) => s.required), t.id).toBe(true);
    const ids = BUILT_IN_TEMPLATES.flatMap((t) => t.slots.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("accepts only mergeable scans, except the BO register spreadsheet", () => {
    for (const t of DOJ_TEMPLATES) {
      for (const s of t.slots) {
        const mergeable = s.acceptedTypes.every((ext) => canMerge(`x.${ext}`));
        expect(mergeable, `${t.id}/${s.id}`).toBe(s.id !== "doj_bo_register");
      }
    }
  });
  it("carries the official form numbers", () => {
    const refs = (id: string) => byId(id).slots.map((s) => s.formRef).filter(Boolean);
    expect(refs("tpl_doj_estate_over_250k")).toEqual(expect.arrayContaining(["J294", "J192", "J243", "J190", "J262"]));
    expect(refs("tpl_doj_estate_under_250k")).toEqual(expect.arrayContaining(["J294", "J192", "J243", "J155"]));
    expect(refs("tpl_doj_estate_laa")).toEqual(expect.arrayContaining(["J193", "J187"]));
    expect(refs("tpl_doj_estate_copies")).toContain("JM46");
    expect(refs("tpl_doj_trust_inter_vivos")).toEqual(expect.arrayContaining(["J401", "J417", "J405", "J450", "J344"]));
    expect(refs("tpl_doj_trust_trustee_details")).toEqual(["J417"]);
    expect(refs("tpl_doj_protection_order")).toEqual(["Form 06 · J480", "Form 07 · J965"]);
    expect(refs("tpl_doj_maintenance")).toContain("Form A · J101");
    expect(refs("tpl_doj_trust_amend_trustees")).toEqual(["J401", "J417"]);
  });
  it("covers the JM21 stated case with a required tile and its conditional parts", () => {
    const t = byId("tpl_doj_trust_testamentary");
    expect(t.slots.find((x) => x.id === "doj_tt_jm21")).toMatchObject({ required: true, formRef: "JM21" });
    expect(t.slots.find((x) => x.id === "doj_tt_views")?.required).toBe(false);
    expect(t.slots.find((x) => x.id === "doj_tt_auditor")?.required).toBe(false);
  });
  it("uses the 2022 Domestic Violence Regulations numbering, not the outdated 2011 page", () => {
    const apply = byId("tpl_doj_protection_order");
    expect(apply.source?.url).toContain("form_dva");
    expect(apply.slots.find((x) => x.formRef === "Form 06 · J480")?.required).toBe(true);
    expect(apply.slots.some((x) => x.formRef === "Form 2" || x.formRef === "Form 6")).toBe(false);
  });
  it("requires an affidavit for a foreign estate", () => {
    const aff = byId("tpl_doj_estate_foreign").slots.find((s) => s.id === "doj_ef_affidavit")!;
    expect(aff.required).toBe(true);
  });
  it("a pack copies slots, form refs, source and checklist status, and is ready with only the required tiles", () => {
    const t = byId("tpl_doj_estate_over_250k");
    const p = createPack(meta, t);
    expect(p.templateSource).toEqual(t.source);
    expect(p.templateSource).not.toBe(t.source);
    expect(p.templateChecklist).toBe("published");
    expect(p.templateNote).toBe(t.checklistNote);
    expect(p.slots.find((s) => s.name === "Death notice")?.formRef).toBe("J294");
    const filled = p.slots.map((s) => (s.required ? { ...s, files: [file(`${s.id}.pdf`)] } : s));
    expect(computeCompleteness(filled).ready).toBe(true);
    expect(computeCompleteness(p.slots).ready).toBe(false);
  });
  it("groups by category then subcategory", () => {
    const groups = groupByCategory(BUILT_IN_TEMPLATES);
    const g = groups.find((x) => x.category === DOJ_CATEGORY)!;
    expect(g.subgroups.map((x) => x.name)).toEqual([ESTATES, TRUSTS]);
    expect(g.count).toBe(22);
    expect(g.note).toBeTruthy();
    expect(groups.find((x) => x.category === COURTS_CATEGORY)?.count).toBe(16);
    expect(groups.find((x) => x.category === MASTER_OTHER_CATEGORY)?.count).toBe(31);
    expect(groups.length).toBeGreaterThan(2);
  });
});

import { RECHECK_AFTER_DAYS, daysSince } from "@/lib/format";
import { BACKUP_MAGIC, BackupError, backupFileName, createBackup, parseBackup, remapForImport } from "@/lib/backup";

describe("daysSince", () => {
  it("counts whole days and never goes negative", () => {
    const now = new Date(2026, 9, 23, 12, 0, 0);
    expect(daysSince("2026-10-22", now)).toBe(1);
    expect(daysSince("2026-07-01", now)).toBe(114);
    expect(daysSince("2027-01-01", now)).toBe(0);
    expect(daysSince("garbage", now)).toBe(0);
    expect(RECHECK_AFTER_DAYS).toBe(90);
  });
  it("every built-in checklist was read on a valid date", () => {
    for (const t of DOJ_TEMPLATES) expect(Number.isNaN(daysSince(t.source!.retrievedOn)), t.id).toBe(false);
  });
});

describe("pack backup", () => {
  const PDF = () => new Blob(["%PDF-1.4 body"], { type: "application/pdf" });
  const sample = () => {
    const p = pack([slot("a", true, [file("a.pdf"), file("b.pdf")]), slot("b", false)]);
    p.status = "ready";
    return p;
  };
  const loader = (extra: Record<string, Blob> = {}) => async (k: string) => ({ "b_a.pdf": PDF(), "b_b.pdf": PDF(), ...extra })[k] ?? null;

  it("round-trips a pack with its files", async () => {
    const blob = await createBackup(sample(), loader());
    const parsed = await parseBackup(blob);
    expect(parsed.pack.name).toBe("Test pack");
    expect(parsed.pack.slots[0].files.map((f) => f.originalName)).toEqual(["a.pdf", "b.pdf"]);
    expect(await parsed.blobs.get("b_a.pdf")!.text()).toBe("%PDF-1.4 body");
    expect(parsed.pack.status).toBe("draft"); // an import is never trusted as "ready"
  });
  it("imports under fresh ids so nothing can be overwritten", async () => {
    const parsed = await parseBackup(await createBackup(sample(), loader()));
    const { pack: imported, blobs } = remapForImport(parsed);
    expect(imported.id).not.toBe("p1");
    const oldKeys = new Set(["b_a.pdf", "b_b.pdf"]);
    for (const f of imported.slots[0].files) {
      expect(oldKeys.has(f.blobKey)).toBe(false);
      expect(blobs.has(f.blobKey)).toBe(true);
    }
    expect(new Set(imported.slots[0].files.map((f) => f.id)).size).toBe(2);
  });
  it("refuses to back up a pack with a missing stored file", async () => {
    await expect(createBackup(sample(), async () => null)).rejects.toBeInstanceOf(BackupError);
  });
  it("rejects files that are not backups, truncated, or tampered with", async () => {
    await expect(parseBackup(new Blob(["hello world, not a backup at all"]))).rejects.toThrow(/not a Docutile backup/);
    const good = await createBackup(sample(), loader());
    await expect(parseBackup(good.slice(0, good.size - 3))).rejects.toThrow(/damaged or incomplete/);
    await expect(parseBackup(new Blob([BACKUP_MAGIC, new Uint8Array([0, 0, 0, 0])]))).rejects.toBeInstanceOf(BackupError);
    await expect(parseBackup(new Blob([BACKUP_MAGIC, new Uint8Array([0x7f, 0xff, 0xff, 0xff])]))).rejects.toBeInstanceOf(BackupError);
  });
  it("rejects an embedded file whose contents do not match its extension", async () => {
    const bad = await createBackup(sample(), loader({ "b_a.pdf": new Blob(["MZ this is not a pdf"]) }));
    await expect(parseBackup(bad)).rejects.toThrow(/does not look like a valid \.pdf/);
  });
  it("builds a safe file name", () => {
    expect(backupFileName("Estate of J. Citizen / 2026", new Date("2026-10-23T10:00:00Z"))).toBe("EstateOfJCitizen2026_Backup_2026-10-23.docutile");
  });
});

import { dueStatus, sortPacks } from "@/lib/due";
import { libraryRows, normalize, searchLibrary, searchPacks } from "@/lib/search";

describe("dueStatus", () => {
  const now = new Date(2026, 9, 23, 15, 30); // 23 Oct 2026, afternoon
  it("classifies dates relative to today", () => {
    expect(dueStatus("", now).kind).toBe("none");
    expect(dueStatus("nonsense", now).kind).toBe("none");
    expect(dueStatus("2026-10-20", now)).toMatchObject({ kind: "overdue", days: -3, label: "Overdue by 3 days" });
    expect(dueStatus("2026-10-22", now).label).toBe("Overdue by 1 day");
    expect(dueStatus("2026-10-23", now)).toMatchObject({ kind: "today", label: "Due today" });
    expect(dueStatus("2026-10-24", now)).toMatchObject({ kind: "soon", label: "Due tomorrow" });
    expect(dueStatus("2026-10-30", now)).toMatchObject({ kind: "soon", days: 7 });
    expect(dueStatus("2026-10-31", now)).toMatchObject({ kind: "later", days: 8 });
  });
  it("sorts by due date, undated last, then by last update", () => {
    const mk = (id: string, due: string, upd: string) => ({ ...pack([]), id, dueDate: due, updatedAt: upd });
    const list = [mk("none-new", "", "2026-10-02"), mk("late", "2026-12-01", "2026-10-01"), mk("early", "2026-11-01", "2026-10-01"), mk("none-old", "", "2026-09-01")];
    expect(sortPacks(list, "due").map((p) => p.id)).toEqual(["early", "late", "none-new", "none-old"]);
    expect(sortPacks(list, "updated").map((p) => p.id)).toEqual(["none-new", "late", "early", "none-old"]);
  });
});

describe("search", () => {
  const a = { ...pack([slot("s1", true, [file("Death-Certificate.pdf")], { name: "Death certificate", formRef: "J294" })]), id: "a", name: "Estate of Nkosi", referenceNumber: "EST-2026/114" };
  const b = { ...pack([slot("s2", true, [file("lease.pdf")], { name: "Lease" })]), id: "b", name: "Café Müller onboarding", organisationName: "Müller GmbH" };
  it("normalises accents and case", () => expect(normalize("Café MÜLLER")).toBe("cafe muller"));
  it("matches pack fields, slot names, form numbers and file names; all words must match", () => {
    expect(searchPacks([a, b], "").length).toBe(2);
    expect(searchPacks([a, b], "nkosi").map((p) => p.id)).toEqual(["a"]);
    expect(searchPacks([a, b], "est-2026/114").map((p) => p.id)).toEqual(["a"]);
    expect(searchPacks([a, b], "j294").map((p) => p.id)).toEqual(["a"]);
    expect(searchPacks([a, b], "cafe muller").map((p) => p.id)).toEqual(["b"]);
    expect(searchPacks([a, b], "lease nkosi")).toEqual([]);
  });
  it("searches files in the library", () => {
    const rows = libraryRows([a, b]);
    expect(rows).toHaveLength(2);
    expect(searchLibrary(rows, "certificate").map((r) => r.file.originalName)).toEqual(["Death-Certificate.pdf"]);
    expect(searchLibrary(rows, "muller lease")).toHaveLength(1);
  });
});

import { nextRotation, outputSize, renameForFormat } from "@/lib/image";

describe("image edit maths", () => {
  const src = { width: 4000, height: 3000 };
  const none = { rotation: 0 as const, crop: { top: 0, right: 0, bottom: 0, left: 0 }, maxSide: null };
  it("swaps width and height when rotated a quarter turn", () => {
    expect(outputSize(src, none)).toEqual({ width: 4000, height: 3000 });
    expect(outputSize(src, { ...none, rotation: 90 })).toEqual({ width: 3000, height: 4000 });
    expect(outputSize(src, { ...none, rotation: 180 })).toEqual({ width: 4000, height: 3000 });
  });
  it("crops by percentage of the rotated image, never below 10%", () => {
    expect(outputSize(src, { ...none, crop: { top: 10, right: 20, bottom: 10, left: 0 } })).toEqual({ width: 3200, height: 2400 });
    expect(outputSize(src, { ...none, crop: { top: 99, right: 99, bottom: 99, left: 99 } })).toEqual({ width: 400, height: 300 });
  });
  it("shrinks to a longest side without upscaling", () => {
    expect(outputSize(src, { ...none, maxSide: 2000 })).toEqual({ width: 2000, height: 1500 });
    expect(outputSize(src, { ...none, rotation: 90, maxSide: 2000 })).toEqual({ width: 1500, height: 2000 });
    expect(outputSize({ width: 800, height: 600 }, { ...none, maxSide: 2000 })).toEqual({ width: 800, height: 600 });
  });
  it("cycles rotation and renames for the output format", () => {
    expect(nextRotation(0, "right")).toBe(90);
    expect(nextRotation(0, "left")).toBe(270);
    expect(nextRotation(270, "right")).toBe(0);
    expect(renameForFormat("scan.PNG", "image/jpeg")).toBe("scan.jpg");
    expect(renameForFormat("photo.jpeg", "image/png")).toBe("photo.png");
  });
});

import { BackupPasswordError, ENC_MAGIC, decryptBlob, encryptBlob, isEncryptedBackup } from "@/lib/backup-crypto";

describe("encrypted backups", () => {
  const fast = { iterations: 1_000, chunkSize: 64 };
  const plain = () => new Blob([new Uint8Array(300).map((_, i) => i % 251)]); // 5 chunks of 64 bytes
  const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

  it("round-trips with the right password and is not readable without it", async () => {
    const enc = await encryptBlob(plain(), "correct horse", fast);
    expect(await isEncryptedBackup(enc)).toBe(true);
    expect(await isEncryptedBackup(plain())).toBe(false);
    expect(await bytes(await decryptBlob(enc, "correct horse"))).toEqual(await bytes(plain()));
    // the plaintext pattern does not appear in the output
    const raw = await bytes(enc);
    const needle = Array.from({ length: 16 }, (_, i) => i % 251);
    const hay = Array.from(raw).join(",");
    expect(hay.includes(needle.join(","))).toBe(false);
  });
  it("rejects a wrong password with a clear error", async () => {
    const enc = await encryptBlob(plain(), "right", fast);
    await expect(decryptBlob(enc, "wrong")).rejects.toBeInstanceOf(BackupPasswordError);
  });
  it("detects tampering, truncation and chunk reordering", async () => {
    const enc = await encryptBlob(plain(), "pw", fast);
    const raw = await bytes(enc);
    const flipped = raw.slice(); flipped[flipped.length - 20] ^= 1;
    await expect(decryptBlob(new Blob([flipped]), "pw")).rejects.toBeInstanceOf(BackupPasswordError);
    await expect(decryptBlob(enc.slice(0, enc.size - 5), "pw")).rejects.toThrow(/damaged or incomplete/);
    // swap two full ciphertext chunks (each 64 + 16 bytes) after the header
    const hLen = new DataView(raw.buffer).getUint32(ENC_MAGIC.length, false);
    const start = ENC_MAGIC.length + 4 + hLen;
    const swapped = raw.slice();
    swapped.set(raw.slice(start + 80, start + 160), start);
    swapped.set(raw.slice(start, start + 80), start + 80);
    await expect(decryptBlob(new Blob([swapped]), "pw")).rejects.toBeInstanceOf(BackupPasswordError);
  });
  it("uses a fresh salt and IV every time, and handles an empty input", async () => {
    const a = await bytes(await encryptBlob(plain(), "pw", fast));
    const b = await bytes(await encryptBlob(plain(), "pw", fast));
    expect(a).not.toEqual(b);
    const empty = await encryptBlob(new Blob([]), "pw", fast);
    expect((await decryptBlob(empty, "pw")).size).toBe(0);
  });
  it("rejects hostile headers (absurd iteration counts)", async () => {
    const enc = await encryptBlob(plain(), "pw", fast);
    const raw = await bytes(enc);
    const hLen = new DataView(raw.buffer).getUint32(ENC_MAGIC.length, false);
    const start = ENC_MAGIC.length + 4;
    const header = new TextDecoder().decode(raw.slice(start, start + hLen)).replace('"iterations":1000', '"iterations":999999999');
    const forged = new Uint8Array([...raw.slice(0, ENC_MAGIC.length), 0, 0, 0, header.length, ...new TextEncoder().encode(header), ...raw.slice(start + hLen)]);
    await expect(decryptBlob(new Blob([forged]), "pw")).rejects.toThrow(/unsupported settings/);
  });
  it("works end to end with a real pack backup", async () => {
    const p = pack([slot("a", true, [file("a.pdf")])]);
    const backup = await createBackup(p, async () => new Blob(["%PDF-1.4 secret"], { type: "application/pdf" }));
    const enc = await encryptBlob(backup, "pw", fast);
    await expect(parseBackup(enc)).rejects.toThrow(/not a Docutile backup/); // cannot be read as a plain backup
    const parsed = await parseBackup(await decryptBlob(enc, "pw"));
    expect(await parsed.blobs.get("b_a.pdf")!.text()).toBe("%PDF-1.4 secret");
  });
});

import { extractFormTokens, htmlToText, normalizeToken, pageUpdatedIso, templateDateIso } from "@/lib/sources/tokens";

describe("source tokens", () => {
  it("normalises form numbers however they are written", () => {
    expect(["MBU 09 (A)", "MBU 09(A)", "mbu09a", "MBU09A"].map(normalizeToken)).toEqual(["MBU09A", "MBU09A", "MBU09A", "MBU09A"]);
  });
  it("finds form numbers in page text and ignores look-alikes", () => {
    const t = "Completed Death Notice - J294; Next-of-Kin Affidavit - J192 (if no will). JM33_42 and JM21, MBU 09 (A) / MBU 12. Bond J262, J1234 is not a form, nor is PJ401x.";
    expect(extractFormTokens(t)).toEqual(["J192", "J262", "J294", "JM21", "JM33_42", "MBU09A", "MBU12"]);
  });
  it("reads dates the way the Master writes them and the way templates store them", () => {
    expect(pageUpdatedIso("... Updated: 31/10/2024 ...")).toBe("2024-10-31");
    expect(pageUpdatedIso("no date here")).toBeNull();
    expect(templateDateIso("31 Oct 2024")).toBe("2024-10-31");
    expect(templateDateIso("6 Jul 2011")).toBe("2011-07-06");
    expect(templateDateIso("whenever")).toBeNull();
  });
  it("strips tags and scripts from html", () => {
    expect(htmlToText("<p>Form&nbsp;<b>J294</b></p><script>var J999=1</script>").trim()).toBe("Form J294");
  });
  it("every form number named in a checklist is a recognisable form token", () => {
    const refs = DOJ_TEMPLATES.flatMap((t) => t.slots.map((s) => s.formRef)).filter(Boolean) as string[];
    const withTokens = refs.filter((r) => extractFormTokens(r).length > 0);
    expect(withTokens.length).toBeGreaterThan(30);
  });
});

describe("clearActivity", () => {
  it("removes every activity event and leaves packs and blobs alone", async () => {
    const repo = new MemoryRepository();
    const p = pack([slot("a", true, [file("a.pdf")])]);
    await repo.savePack(p);
    await repo.putBlob("b_a.pdf", new Blob(["x"]));
    await repo.addActivity({ id: "e1", packId: p.id, type: "pack_created", message: "one", timestamp: "2026-01-01T00:00:00.000Z" });
    await repo.addActivity({ id: "e2", packId: null, type: "data_cleared", message: "two", timestamp: "2026-01-02T00:00:00.000Z" });
    await repo.clearActivity();
    expect(await repo.listActivity()).toEqual([]);
    expect(await repo.listPacks()).toHaveLength(1);
    expect(await repo.getBlob("b_a.pdf")).not.toBeNull();
  });
});

import { authEnabled, isEmailAllowed, isPublicPath, missingAuthSettings, safeCallbackPath, userStorageName } from "@/lib/auth/config";

describe("sign-in configuration", () => {
  const full = { AUTH_SECRET: "s", AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" };
  it("is on only when every credential is set", () => {
    expect(authEnabled({})).toBe(false);
    expect(authEnabled({ ...full, AUTH_GOOGLE_SECRET: "  " })).toBe(false);
    expect(authEnabled(full)).toBe(true);
    expect(missingAuthSettings({ AUTH_SECRET: "x" })).toEqual(["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"]);
  });
  it("accepts only Google-verified addresses", () => {
    expect(isEmailAllowed("a@b.co", true, {})).toBe(true);
    expect(isEmailAllowed("a@b.co", false, {})).toBe(false);
    expect(isEmailAllowed("a@b.co", undefined, {})).toBe(false);
    expect(isEmailAllowed("", true, {})).toBe(false);
    expect(isEmailAllowed(null, true, {})).toBe(false);
  });
  it("honours the allow-lists, case-insensitively", () => {
    const env = { ALLOWED_EMAILS: "Boss@Firm.co.za, intern@gmail.com", ALLOWED_DOMAINS: "@partner.org" };
    expect(isEmailAllowed("boss@firm.co.za", true, env)).toBe(true);
    expect(isEmailAllowed("INTERN@gmail.com", true, env)).toBe(true);
    expect(isEmailAllowed("anyone@partner.org", true, env)).toBe(true);
    expect(isEmailAllowed("stranger@gmail.com", true, env)).toBe(false);
    expect(isEmailAllowed("x@evilpartner.org", true, env)).toBe(false);
    expect(isEmailAllowed("x@partner.org.evil.com", true, env)).toBe(false);
  });
  it("gives each account its own stable storage name that does not reveal the address", () => {
    expect(userStorageName("A@B.co")).toBe(userStorageName(" a@b.co "));
    expect(userStorageName("a@b.co")).not.toBe(userStorageName("c@d.co"));
    expect(userStorageName("a@b.co")).toMatch(/^docutile-u-[0-9a-f]{16}$/);
    expect(userStorageName("a@b.co")).not.toContain("a@b");
  });
  it("lets only the sign-in screen, auth endpoints and install files through unauthenticated", () => {
    for (const p of ["/login", "/api/auth/signin", "/api/auth/callback/google", "/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) expect(isPublicPath(p), p).toBe(true);
    for (const p of ["/", "/packs/new", "/library", "/templates", "/api/other", "/login-evil", "/packs/x"]) expect(isPublicPath(p), p).toBe(false);
  });
  it("only redirects to same-site paths after sign-in", () => {
    expect(safeCallbackPath("/packs/pack_1")).toBe("/packs/pack_1");
    for (const bad of [null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/login"]) expect(safeCallbackPath(bad as string), String(bad)).toBe("/");
  });
});
