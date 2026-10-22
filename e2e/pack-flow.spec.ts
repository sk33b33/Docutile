import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs";
import { docx, fakePdf, pdfFile } from "./fixtures";

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
