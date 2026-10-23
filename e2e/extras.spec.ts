import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const tile = (p: Page, name: string) => p.locator("li[id^=slot-]").filter({ has: p.getByRole("heading", { name }) });
const DAY = 24 * 60 * 60 * 1000;

async function createPack(p: Page, template: RegExp) {
  await p.goto("/packs/new");
  await p.locator("#pack-name").fill("Q1 onboarding");
  await p.locator("#pack-organisationName").fill("Acme Ltd");
  await p.getByRole("radio", { name: template }).check();
  await p.getByRole("button", { name: "Create pack" }).click();
  await p.waitForURL(/\/packs\/pack_/);
}

async function expectNoViolations(p: Page) {
  const { violations } = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function attach(p: Page, slotName: string, fileName: string) {
  await tile(p, slotName).locator("input[type=file]").first().setInputFiles(await pdfFile(fileName, 1));
  await expect(tile(p, slotName).getByText(fileName).first()).toBeVisible();
}

test("a DOJ pack lists what happens after lodging, from its source", async ({ page }) => {
  await createPack(page, /deceased estate: over R250 000/);
  const steps = page.getByRole("region", { name: "After you lodge the pack" }).or(page.locator("section", { has: page.getByRole("heading", { name: "After you lodge the pack" }) }));
  await expect(steps).toBeVisible();
  await expect(steps).toContainText("within 14 days");
  await expect(steps).toContainText("Faxed documents are not accepted");
  await expectNoViolations(page);

  // A template with no sourced steps shows no such panel.
  await createPack(page, /General submission/);
  await expect(page.getByRole("heading", { name: "After you lodge the pack" })).toHaveCount(0);
});

test("printable cover sheet shows what is attached and what is missing", async ({ page }) => {
  await createPack(page, /General submission/);
  await attach(page, "Cover letter", "letter.pdf");
  await page.getByRole("link", { name: "Cover sheet" }).click();
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toBeVisible();
  await expect(page.getByText(/Not complete: 1 required document is missing/)).toBeVisible();
  const row = (name: string) => page.getByRole("row").filter({ hasText: name });
  await expect(row("Cover letter")).toContainText("Attached");
  await expect(row("Cover letter")).toContainText("letter.pdf");
  await expect(page.getByRole("row", { name: /MISSING/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Print cover sheet" })).toBeEnabled();
  await expectNoViolations(page);
});

test("backup reminder: appears for an old unbacked pack, can be postponed", async ({ page }) => {
  await createPack(page, /General submission/);
  await attach(page, "Cover letter", "letter.pdf");

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Backup reminder" })).toHaveCount(0); // brand new: no nagging

  await page.clock.setFixedTime(new Date(Date.now() + 10 * DAY));
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Backup reminder" });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Q1 onboarding");
  await expectNoViolations(page);

  await banner.getByRole("button", { name: "Remind me in 7 days" }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Backup reminder" })).toHaveCount(0);
});

test("backup reminder stops once the pack has been exported as a backup", async ({ page }) => {
  await createPack(page, /General submission/);
  await attach(page, "Cover letter", "letter.pdf");
  await page.getByRole("button", { name: "Export backup" }).click();
  await page.getByRole("radio", { name: /No password/ }).check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  await download;
  await expect(page.getByText(/Backup downloaded/)).toBeVisible();

  await page.clock.setFixedTime(new Date(Date.now() + 10 * DAY));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Q1 onboarding" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Backup reminder" })).toHaveCount(0);
});
