import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, PDFName } from "pdf-lib";
import fs from "node:fs";
import { docx, fakePdf, pdfFile, pngBuffer, pngSize } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const tile = (p: Page, name: string) =>
  p.locator("li[id^=slot-]").filter({ has: p.getByRole("heading", { name }) });
const fileInput = (p: Page, name: string) => tile(p, name).locator("input[type=file]").first();
const order = (p: Page) => p.locator("li[id^=slot-] h2").allInnerTexts();

async function createPack(p: Page, template = /General submission/) {
  await p.goto("/packs/new");
  await p.locator("#pack-name").fill("Q1 onboarding");
  await p.locator("#pack-organisationName").fill("Acme Ltd");
  await p.getByRole("radio", { name: template }).check();
  await p.getByRole("button", { name: "Create pack" }).click();
  await p.waitForURL(/\/packs\/pack_/);
}

async function dropFile(p: Page, name: string, file: { name: string; buffer: Buffer }, events = ["dragenter", "dragover", "drop"]) {
  await tile(p, name).evaluate(async (el, { fileName, b64, events }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], fileName));
    for (const t of events) el.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { fileName: file.name, b64: file.buffer.toString("base64"), events });
}

test("empty dashboard and form validation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No packs yet")).toBeVisible();
  await page.goto("/packs/new");
  await page.getByRole("button", { name: "Create pack" }).click();
  await expect(page.getByText("Pack name is required.")).toBeVisible();
  await expect(page.getByText("Client / organisation name is required.")).toBeVisible();
});

test("upload, validation, drop, replace, reorder, persistence, export and blocking", async ({ page }, testInfo) => {
  await createPack(page);
  await expect(page.getByText("Not ready")).toBeVisible();
  await expect(page.getByText("0 of 2 required").first()).toBeVisible();

  // Content that does not match its extension is rejected and not counted.
  await fileInput(page, "Cover letter").setInputFiles(fakePdf);
  await expect(tile(page, "Cover letter").getByRole("alert")).toBeVisible();
  await expect(page.getByText("0 of 2 required").first()).toBeVisible();

  // Picker upload, then an occupied single slot asks before replacing.
  await fileInput(page, "Cover letter").setInputFiles(docx);
  await expect(tile(page, "Cover letter").getByText("doc.docx").first()).toBeVisible();
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("a.pdf", 1));
  await expect(page.getByText("Replace existing file?")).toBeVisible();
  await page.getByRole("button", { name: "Replace file" }).click();
  await expect(tile(page, "Cover letter").getByText("a.pdf").first()).toBeVisible();
  await expect(page.getByText("1 of 2 required").first()).toBeVisible();

  // OS-style drop onto a specific tile completes the pack.
  await dropFile(page, "Main document", await pdfFile("b.pdf", 2));
  await expect(page.getByText("Ready: all required")).toBeVisible();

  // Dropping onto an occupied tile asks; cancelling keeps the existing file.
  await dropFile(page, "Main document", await pdfFile("c.pdf", 1), ["dragover", "drop"]);
  await expect(page.getByText("Replace existing file?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(tile(page, "Main document").getByText("b.pdf").first()).toBeVisible();

  // Keyboard-accessible reorder, persisted across refresh.
  await page.getByRole("button", { name: "Move Main document earlier" }).click();
  await expect.poll(async () => (await order(page))[0]).toContain("Main document");
  await page.reload();
  await expect(page.getByText("Ready: all required")).toBeVisible();
  expect((await order(page))[0]).toContain("Main document");

  // Review order follows tile order, and the exported PDF is correct.
  await page.getByRole("link", { name: /Review/ }).click();
  await expect(page.locator("ol li p.font-medium").first()).toBeVisible();
  expect(await page.locator("ol li p.font-medium").allInnerTexts()).toEqual(["b.pdf", "a.pdf"]);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/^AcmeLtd_SubmissionPack_\d{4}-\d\d-\d\d\.pdf$/);
  const out = testInfo.outputPath("out.pdf");
  await download.saveAs(out);
  expect((await PDFDocument.load(fs.readFileSync(out))).getPageCount()).toBe(4); // cover + 2 + 1

  // Removing a required file blocks export.
  await page.getByRole("link", { name: /Back to builder/ }).click();
  await tile(page, "Cover letter").getByRole("button", { name: /Remove a\.pdf/ }).click();
  await page.getByRole("button", { name: "Remove file" }).click();
  await expect(page.getByText("Not ready")).toBeVisible();
  await page.getByRole("link", { name: /Review/ }).click();
  await expect(page.getByRole("button", { name: /Create & download PDF/ })).toBeDisabled();
});

test("custom checklist can add a slot", async ({ page }) => {
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Custom");
  await page.locator("#pack-organisationName").fill("Beta Co");
  await page.getByRole("radio", { name: /Custom checklist/ }).check();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await page.getByRole("button", { name: "Add document slot" }).click();
  await page.locator("#slot-name").fill("Passport");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Passport/ })).toBeVisible();
  await expect(page.getByText("0 of 1 required").first()).toBeVisible();
});

test("mobile layout has no horizontal overflow and a menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});

test("built-in template can be edited, used by a new pack, and reset", async ({ page }) => {
  await page.goto("/templates");
  const card = page.locator("li").filter({ has: page.getByRole("heading", { name: "General submission" }) });
  await card.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.locator("#slot-name").fill("Board resolution");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Save template" }).click();
  await page.waitForURL(/\/templates$/);
  await expect(card.getByText("Built-in (customised)")).toBeVisible();

  await createPack(page);
  await expect(page.getByRole("heading", { name: /Board resolution/ })).toBeVisible();

  await page.goto("/templates");
  await card.getByRole("button", { name: /Reset General submission to default/ }).click();
  await page.getByRole("button", { name: "Reset template" }).click();
  await expect(card.getByText("Built-in", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: /Reset/ })).toHaveCount(0);
});

test("large PDF export keeps the page responsive and supports cancel", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  // ~1500 text pages: heavy enough that a main-thread merge would visibly freeze the tab.
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 1500; i++) {
    const pg = d.addPage();
    for (let l = 0; l < 40; l++) pg.drawText(`Page ${i} line ${l} lorem ipsum dolor sit amet consectetur`, { x: 40, y: 800 - l * 18, size: 10, font });
  }
  const big = { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.from(await d.save({ useObjectStreams: false })) };
  testInfo.annotations.push({ type: "fixture", description: `${(big.buffer.length / 1048576).toFixed(1)} MB` });
  expect(big.buffer.length).toBeLessThan(25 * 1048576);

  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(big);
  await fileInput(page, "Main document").setInputFiles(await pdfFile("small.pdf", 1));
  await expect(page.getByText("Ready: all required")).toBeVisible();
  await page.getByRole("link", { name: /Review/ }).click();

  await page.evaluate(() => {
    const w = window as unknown as { __maxGap: number };
    w.__maxGap = 0;
    let last = performance.now();
    setInterval(() => { const n = performance.now(); w.__maxGap = Math.max(w.__maxGap, n - last); last = n; }, 20);
  });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 150_000 }), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  const out = testInfo.outputPath("big-out.pdf");
  await download.saveAs(out);
  expect((await PDFDocument.load(fs.readFileSync(out), { updateMetadata: false })).getPageCount()).toBe(1500 + 1 + 1);
  const gap = await page.evaluate(() => (window as unknown as { __maxGap: number }).__maxGap);
  testInfo.annotations.push({ type: "max main-thread gap", description: `${Math.round(gap)} ms` });
  console.log(`fixture ${(big.buffer.length / 1048576).toFixed(1)} MB, max main-thread gap ${Math.round(gap)} ms`);
  expect(gap).toBeLessThan(200); // main-thread merge of this fixture stalls ~400 ms

  // Cancel: no file is produced and the button comes back.
  await page.getByRole("button", { name: /Create & download PDF/ }).click();
  await page.getByRole("button", { name: "Cancel export" }).click();
  await expect(page.getByText("Export cancelled. No file was created.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create & download PDF/ })).toBeEnabled();
});

test("South African DOJ checklist: tiles, form numbers, source, and readiness from required documents only", async ({ page }) => {
  await page.goto("/packs/new");
  await expect(page.getByRole("heading", { name: "South African DOJ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trusts", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Register an inter vivos trust/ })).toBeVisible();
  await page.locator("#pack-name").fill("Estate of J Citizen");
  await page.locator("#pack-organisationName").fill("Master of the High Court");
  await page.getByRole("radio", { name: /deceased estate: over R250 000/ }).check();
  await expect(page.getByRole("link", { name: /How to report a deceased estate/ })).toHaveAttribute("href", /justice\.gov\.za\/master\/deceased-how/);
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);

  await expect(page.locator("li[id^=slot-]")).toHaveCount(18);
  await expect(tile(page, "Death notice").getByText("Form J294")).toBeVisible();
  await expect(tile(page, "Will and codicils").getByText("Optional")).toBeVisible();
  await expect(page.getByText("0 of 5 required").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /How to report a deceased estate/ })).toBeVisible(); // source shown in the builder

  const required = ["Death notice", "Death certificate", "Inventory of assets", "Acceptance of trust as executor", "Executor's ID (photo page)"];
  for (const [i, name] of required.entries()) {
    await fileInput(page, name).setInputFiles(await pdfFile(`doc${i}.pdf`, 1));
    await expect(tile(page, name).getByText(`doc${i}.pdf`).first()).toBeVisible();
    if (i < required.length - 1) await expect(page.getByText("Not ready")).toBeVisible();
  }
  await expect(page.getByText("Ready: all required")).toBeVisible();
});

test("services catalogue lists every DOJ service by subcategory and starts a pack from one", async ({ page }) => {
  await page.goto("/templates");
  await expect(page.getByRole("heading", { name: /South African DOJ/ }).first()).toBeVisible();
  const estates = page.getByRole("heading", { name: /^Estates/ });
  const trusts = page.getByRole("heading", { name: /^Trusts/ });
  await expect(estates).toContainText("9 services");
  await expect(trusts).toContainText("13 services");
  await expect(page.getByRole("heading", { name: "Register a testamentary trust" })).toBeVisible();
  // The Master's other divisions are a separate category with their own subcategories.
  await expect(page.getByRole("heading", { name: /^Master of the High Court: other services/ })).toContainText("31 services");
  for (const sub of ["Guardian's Fund", "Curators and tutors", "Insolvent estates"]) await expect(page.getByRole("heading", { name: new RegExp(`^${sub}`) })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apply for maintenance, an allowance or interest from the Guardian's Fund" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Liquidation and distribution account (executor)" })).toBeVisible();

  // Tiles are listed per service, with form numbers.
  const card = page.locator("li").filter({ has: page.getByRole("heading", { name: "Register an inter vivos trust" }) });
  await card.getByText(/Document tiles/).click();
  await expect(card.getByText("[J401]")).toBeVisible();

  // Create pack from a service preselects it.
  await card.getByRole("link", { name: "Create pack" }).click();
  await expect(page.getByRole("radio", { name: /Register an inter vivos trust/ })).toBeChecked();
});

test("backup: export a pack, import it as a new draft, and reject bad files", async ({ page }, testInfo) => {
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("letter.pdf", 2));
  await expect(tile(page, "Cover letter").getByText("letter.pdf").first()).toBeVisible();

  await page.getByRole("button", { name: "Export backup" }).click();
  await page.getByRole("radio", { name: /No password/ }).check();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^Q1Onboarding_Backup_\d{4}-\d\d-\d\d\.docutile$/);
  const backup = testInfo.outputPath("pack.docutile");
  await download.saveAs(backup);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toBeVisible();
  await page.locator('input[accept=".docutile"]').setInputFiles(backup);
  await page.waitForURL(/\/packs\/pack_/);
  await expect(tile(page, "Cover letter").getByText("letter.pdf").first()).toBeVisible();
  await expect(page.getByText("1 of 2 required").first()).toBeVisible();

  // Two independent packs now exist, and the imported file is previewable data, not a shared reference.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toHaveCount(2);

  // A file that is not a backup is refused with a clear message and creates nothing.
  await page.locator('input[accept=".docutile"]').setInputFiles({ name: "x.docutile", mimeType: "application/octet-stream", buffer: Buffer.from("this is not a backup file at all") });
  await expect(page.getByText(/not a Docutile backup/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toHaveCount(2);
});

test("data saved under the old 'packflow' database is migrated to 'docutile' and the old one removed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No packs yet")).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("packflow", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("packs", { keyPath: "id" });
        db.createObjectStore("blobs");
        db.createObjectStore("templates", { keyPath: "id" });
        db.createObjectStore("activity", { keyPath: "id" });
        db.createObjectStore("settings");
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const ts = "2025-01-01T00:00:00.000Z";
        const tx = db.transaction(["packs", "blobs"], "readwrite");
        tx.objectStore("blobs").put(new Blob(["%PDF-1.4 legacy"], { type: "application/pdf" }), "blob_legacy");
        tx.objectStore("packs").put({
          id: "pack_legacy", name: "Legacy pack", organisationName: "Old Co", submissionType: "", referenceNumber: "", dueDate: "", notes: "",
          templateId: null, templateName: "Custom checklist", status: "draft", createdAt: ts, updatedAt: ts, exportedAt: null,
          slots: [{ id: "s1", templateSlotId: null, name: "Old doc", description: "", required: true, acceptedTypes: ["pdf"], maxFileSizeBytes: 1000000, allowMultiple: false,
            files: [{ id: "f1", originalName: "old.pdf", displayName: "old.pdf", mimeType: "application/pdf", sizeBytes: 15, lastModified: 0, blobKey: "blob_legacy", uploadedAt: ts }] }],
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Legacy pack" })).toBeVisible();
  await page.getByRole("heading", { name: "Legacy pack" }).getByRole("link").click();
  await expect(page.getByText("old.pdf").first()).toBeVisible();
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(names).not.toContain("packflow");
  expect(names).toContain("docutile");
});

test("waiting note: a missing document can be marked as waiting but still blocks readiness", async ({ page }) => {
  await createPack(page);
  await tile(page, "Cover letter").getByRole("button", { name: "Mark as waiting…" }).click();
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(/Say what you are waiting for/)).toBeVisible();
  await page.locator("#waiting-note").fill("Applied at Home Affairs");
  await page.locator("#waiting-date").fill("2030-01-15");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(tile(page, "Cover letter").getByText(/Applied at Home Affairs/)).toBeVisible();
  await expect(page.getByText("0 of 2 required").first()).toBeVisible(); // still missing
  await expect(page.getByText("Not ready")).toBeVisible();
  await expect(page.getByText(/Waiting: Applied at Home Affairs/).first()).toBeVisible();

  // Persists, shows on the dashboard, and is cleared when the file arrives.
  await page.reload();
  await expect(tile(page, "Cover letter").getByText(/Applied at Home Affairs/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("1 document waiting")).toBeVisible();
  await page.getByRole("link", { name: "Q1 onboarding" }).click();
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("letter.pdf", 1));
  await expect(tile(page, "Cover letter").getByText("letter.pdf").first()).toBeVisible();
  await expect(tile(page, "Cover letter").getByText(/Applied at Home Affairs/)).toHaveCount(0);
});

test("dashboard: due-date badges, sort by due date, search, and duplicate with files", async ({ page }) => {
  const make = async (name: string, due: string) => {
    await page.goto("/packs/new");
    await page.locator("#pack-name").fill(name);
    await page.locator("#pack-organisationName").fill("Acme");
    await page.locator("#pack-dueDate").fill(due);
    await page.getByRole("radio", { name: /General submission/ }).check();
    await page.getByRole("button", { name: "Create pack" }).click();
    await page.waitForURL(/\/packs\/pack_/);
  };
  const iso = (offsetDays: number) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  await make("Later pack", iso(30));
  await make("Overdue pack", iso(-2));
  await make("Soon pack", iso(3));
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("findme-letter.pdf", 1));
  await expect(tile(page, "Cover letter").getByText("findme-letter.pdf").first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Overdue by 2 days")).toBeVisible();
  await expect(page.getByText("Due in 3 days")).toBeVisible();

  await page.getByLabel("Sort by").selectOption("due");
  const titles = () => page.locator("ul > li h2").allInnerTexts();
  expect(await titles()).toEqual(["Overdue pack", "Soon pack", "Later pack"]);

  await page.getByLabel("Search packs").fill("findme");
  await expect(page.getByText("1 of 3 packs match.")).toBeVisible();
  expect(await titles()).toEqual(["Soon pack"]);
  await page.getByLabel("Search packs").fill("zzz-nothing");
  await expect(page.getByText("No packs match your search")).toBeVisible();
  await page.getByLabel("Search packs").fill("");

  await page.getByRole("button", { name: "Duplicate pack Soon pack" }).click();
  await page.getByRole("button", { name: "Copy with files" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(page.getByRole("heading", { name: "Soon pack (copy)" })).toBeVisible();
  await expect(tile(page, "Cover letter").getByText("findme-letter.pdf").first()).toBeVisible();

  // Library search finds the file in both packs.
  await page.goto("/library");
  await page.getByLabel("Search documents").fill("findme");
  await expect(page.getByText("2 of 2 documents match.")).toBeVisible();
});

test("export options: title pages, bookmarks and page numbers change the exported PDF", async ({ page }, testInfo) => {
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("a.pdf", 1));
  await fileInput(page, "Main document").setInputFiles(await pdfFile("b.pdf", 2));
  await expect(page.getByText("Ready: all required")).toBeVisible();
  await page.getByRole("link", { name: /Review/ }).click();

  await expect(page.getByLabel("Page numbers (Page X of Y)")).toBeChecked();
  await expect(page.getByLabel("Title page before each document")).not.toBeChecked();
  await page.getByLabel("Title page before each document").check();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  const out = testInfo.outputPath("opts.pdf");
  await download.saveAs(out);
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect(doc.getPageCount()).toBe(1 + (1 + 1) + (1 + 2)); // cover + 2 documents, each with a title page
  expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(true);

  // Turning everything off gives the plain pack: no outline.
  await page.getByLabel("Title page before each document").uncheck();
  await page.getByLabel("Bookmarks for each document").uncheck();
  const [download2] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  const out2 = testInfo.outputPath("plain.pdf");
  await download2.saveAs(out2);
  const doc2 = await PDFDocument.load(fs.readFileSync(out2));
  expect(doc2.getPageCount()).toBe(1 + 1 + 2);
  expect(doc2.catalog.has(PDFName.of("Outlines"))).toBe(false);
});


test("image tidy-up: rotate, crop and shrink replace the stored image", async ({ page }, testInfo) => {
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: pngBuffer(2400, 1600) });
  await expect(tile(page, "Cover letter").getByText("photo.png").first()).toBeVisible();

  await tile(page, "Cover letter").getByRole("button", { name: /Edit image photo\.png/ }).click();
  await expect(page.getByRole("dialog", { name: "Edit image" })).toBeVisible();
  await expect(page.getByText(/Original .* after your changes about/)).toBeVisible();
  await page.getByRole("button", { name: "Rotate right" }).click();
  await page.locator("#crop-top").fill("25");
  await page.locator("#img-size").selectOption("1000");
  await page.getByRole("button", { name: "Save image" }).click();
  await expect(page.getByText('Saved the edited image as "photo.png".')).toBeVisible();

  // 2400x1600 rotated -> 1600x2400, top 25% trimmed -> 1600x1800, longest side shrunk to 1000 -> 889x1000
  const [download] = await Promise.all([page.waitForEvent("download"), tile(page, "Cover letter").getByRole("button", { name: "Download" }).click()]);
  const out = testInfo.outputPath("edited.png");
  await download.saveAs(out);
  const size = pngSize(fs.readFileSync(out));
  expect(size.height).toBe(1000);
  expect(Math.abs(size.width - 889)).toBeLessThanOrEqual(1);
  await expect(page.getByText("1 of 2 required").first()).toBeVisible(); // still exactly one file, still counted
  await expect(tile(page, "Cover letter").getByText("photo.png")).toHaveCount(1);
});

test("image tidy-up can convert a PNG to a smaller JPEG when the slot allows it", async ({ page }) => {
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles({ name: "scan.png", mimeType: "image/png", buffer: pngBuffer(800, 600) });
  await tile(page, "Cover letter").getByRole("button", { name: /Edit image scan\.png/ }).click();
  await page.getByLabel("Save as JPEG").check();
  await page.getByRole("button", { name: "Save image" }).click();
  await expect(tile(page, "Cover letter").getByText("scan.jpg").first()).toBeVisible();
  await expect(tile(page, "Cover letter").getByText("scan.png")).toHaveCount(0);
});


test("encrypted backup: password rules, wrong password, and a successful import", async ({ page }, testInfo) => {
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("secret.pdf", 1));
  await expect(tile(page, "Cover letter").getByText("secret.pdf").first()).toBeVisible();

  await page.getByRole("button", { name: "Export backup" }).click();
  await expect(page.getByRole("radio", { name: /Encrypt with a password/ })).toBeChecked(); // protected by default
  await page.getByRole("button", { name: "Download backup" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await page.locator("#bk-pw").fill("longenough1");
  await page.locator("#bk-pw2").fill("different123");
  await page.getByRole("button", { name: "Download backup" }).click();
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();
  await page.locator("#bk-pw2").fill("longenough1");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  const file = testInfo.outputPath("locked.docutile");
  await download.saveAs(file);
  expect(fs.readFileSync(file).subarray(0, 16).toString()).toBe("DOCUTILE-ENCRYPT");
  expect(fs.readFileSync(file).includes(Buffer.from("secret.pdf"))).toBe(false); // names are encrypted too

  await page.goto("/");
  await page.locator('input[accept=".docutile"]').setInputFiles(file);
  await expect(page.getByRole("dialog", { name: "Password needed" })).toBeVisible();
  await page.locator("#imp-pw").fill("not-the-password");
  await page.getByRole("dialog").getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/password is wrong, or the backup file is damaged/)).toBeVisible();
  await page.locator("#imp-pw").fill("longenough1");
  await page.getByRole("dialog").getByRole("button", { name: "Import", exact: true }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(tile(page, "Cover letter").getByText("secret.pdf").first()).toBeVisible();
});

test("activity: clear recent activity with confirmation, keeping packs and files", async ({ page }) => {
  await page.goto("/activity");
  await expect(page.getByRole("button", { name: "Clear activity" })).toBeDisabled();
  await expect(page.getByText("Nothing to clear: there is no activity yet.")).toBeVisible();

  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("keep.pdf", 1));
  await expect(tile(page, "Cover letter").getByText("keep.pdf").first()).toBeVisible();

  await page.goto("/activity");
  await expect(page.getByText(/Created pack "Q1 onboarding"/)).toBeVisible();
  await expect(page.getByText(/Attached "keep.pdf"/)).toBeVisible();

  await page.getByRole("button", { name: "Clear activity" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(/Attached "keep.pdf"/)).toBeVisible(); // cancelling changes nothing

  await page.getByRole("button", { name: "Clear activity" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear activity" }).click();
  await expect(page.getByText("Activity history cleared. Your packs and files were not touched.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No activity yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear activity" })).toBeDisabled();

  // Stays cleared after a reload, and the pack and its file are untouched.
  await page.reload();
  await expect(page.getByRole("heading", { name: "No activity yet" })).toBeVisible();
  await page.goto("/library");
  await expect(page.getByText("keep.pdf")).toBeVisible();
});


test("export still works when the web worker cannot start (falls back to the main thread)", async ({ page }, testInfo) => {
  await page.route("**/turbopack-worker-*.js*", (route) => route.abort()); // simulate a broken or blocked worker
  await createPack(page);
  await fileInput(page, "Cover letter").setInputFiles(await pdfFile("a.pdf", 1));
  await fileInput(page, "Main document").setInputFiles(await pdfFile("b.pdf", 2));
  await expect(page.getByText("Ready: all required")).toBeVisible();
  await page.getByRole("link", { name: /Review/ }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  const out = testInfo.outputPath("fallback.pdf");
  await download.saveAs(out);
  expect((await PDFDocument.load(fs.readFileSync(out))).getPageCount()).toBe(1 + 1 + 2);
});
