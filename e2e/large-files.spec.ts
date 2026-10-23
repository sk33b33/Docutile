import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, PDFName } from "pdf-lib";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const MB = 1024 * 1024;

/** A valid PDF whose size is ~`mb` MB. Incompressible data is referenced from the page so merging must copy it. */
async function pdfOfSize(mb: number, pages = 3): Promise<Buffer> {
  const d = await PDFDocument.create();
  const page = d.addPage([300, 300]);
  for (let i = 1; i < pages; i++) d.addPage([300, 300]);
  const payload = d.context.stream(randomBytes(Math.floor(mb * MB) - 2000), { Type: "XObject", Subtype: "Form", BBox: [0, 0, 1, 1] });
  const ref = d.context.register(payload);
  const xobjects = d.context.obj({ Payload: ref });
  page.node.Resources()!.set(PDFName.of("XObject"), xobjects);
  return Buffer.from(await d.save({ useObjectStreams: false }));
}

const tile = (p: Page, name: string) => p.locator("li[id^=slot-]").filter({ has: p.getByRole("heading", { name }) });
const input = (p: Page, name: string) => tile(p, name).locator("input[type=file]").first();

async function newPack(p: Page) {
  await p.goto("/packs/new");
  await p.locator("#pack-name").fill("Large");
  await p.locator("#pack-organisationName").fill("Big Co");
  await p.getByRole("radio", { name: /General submission/ }).check();
  await p.getByRole("button", { name: "Create pack" }).click();
  await p.waitForURL(/\/packs\/pack_/);
}

test("25 MB limit: a file just under is accepted, just over is rejected", async ({ page }) => {
  test.setTimeout(120_000);
  await newPack(page);
  const over = await pdfOfSize(25.5);
  expect(over.length).toBeGreaterThan(25 * MB);
  await input(page, "Cover letter").setInputFiles({ name: "over.pdf", mimeType: "application/pdf", buffer: over });
  await expect(tile(page, "Cover letter").getByRole("alert")).toContainText("exceeds the 25.0 MB limit");
  await expect(page.getByText("0 of 2 required").first()).toBeVisible();

  const under = await pdfOfSize(24.5);
  expect(under.length).toBeLessThanOrEqual(25 * MB);
  await input(page, "Cover letter").setInputFiles({ name: "under.pdf", mimeType: "application/pdf", buffer: under });
  await expect(tile(page, "Cover letter").getByText("under.pdf").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("1 of 2 required").first()).toBeVisible();
});

test("exports a pack of several ~24 MB PDFs without freezing the page", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Huge");
  await page.locator("#pack-organisationName").fill("Big Co");
  await page.getByRole("radio", { name: /Custom checklist/ }).check();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);

  const COUNT = 5; // ~120 MB of input
  for (let i = 1; i <= COUNT; i++) {
    await page.getByRole("button", { name: "Add document slot" }).first().click();
    await page.locator("#slot-name").fill(`Doc ${i}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
  let total = 0;
  for (let i = 1; i <= COUNT; i++) {
    const buf = await pdfOfSize(24, 3);
    total += buf.length;
    await input(page, `Doc ${i}`).setInputFiles({ name: `doc${i}.pdf`, mimeType: "application/pdf", buffer: buf });
    await expect(tile(page, `Doc ${i}`).getByText(`doc${i}.pdf`).first()).toBeVisible({ timeout: 60_000 });
  }
  await expect(page.getByText("Ready: all required")).toBeVisible();

  // Survives a refresh (blobs persisted in IndexedDB).
  await page.reload();
  await expect(page.getByText("Ready: all required")).toBeVisible();

  await page.getByRole("link", { name: /Review/ }).click();
  await expect(page.getByText("Contents in pack order")).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as { __maxGap: number };
    w.__maxGap = 0;
    let last = performance.now();
    setInterval(() => { const n = performance.now(); w.__maxGap = Math.max(w.__maxGap, n - last); last = n; }, 20);
  });
  const t0 = Date.now();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 270_000 }), page.getByRole("button", { name: /Create & download PDF/ }).click()]);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const out = testInfo.outputPath("huge.pdf");
  await download.saveAs(out);
  const size = fs.statSync(out).size;
  const pages = (await PDFDocument.load(fs.readFileSync(out), { updateMetadata: false })).getPageCount();
  const gap = Math.round(await page.evaluate(() => (window as unknown as { __maxGap: number }).__maxGap));
  console.log(`input ${(total / MB).toFixed(0)} MB -> output ${(size / MB).toFixed(0)} MB, ${pages} pages, ${secs}s, max main-thread gap ${gap} ms`);
  expect(pages).toBe(COUNT * 3 + 1);
  expect(size).toBeGreaterThan(total * 0.9);
  expect(gap).toBeLessThan(500);
});
