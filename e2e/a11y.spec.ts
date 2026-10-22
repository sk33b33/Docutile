import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function audit(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

test("axe: all main pages and states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No packs yet")).toBeVisible();
  await audit(page, "dashboard (empty)");

  await page.goto("/packs/new");
  await page.getByRole("button", { name: "Create pack" }).click();
  await expect(page.getByText("Pack name is required.")).toBeVisible();
  await audit(page, "new pack (with errors)");

  await page.locator("#pack-name").fill("Audit pack");
  await page.locator("#pack-organisationName").fill("Acme Ltd");
  await page.getByRole("radio", { name: /Supplier onboarding/ }).check();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(page.getByRole("heading", { name: /Cover letter/ })).toBeVisible();
  await audit(page, "pack builder (empty)");

  await page.locator("li[id^=slot-]").first().locator("input[type=file]").first().setInputFiles(await pdfFile("a.pdf", 1));
  await expect(page.getByText("a.pdf").first()).toBeVisible();
  await audit(page, "pack builder (with file)");

  await page.getByRole("button", { name: "Edit slot" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "slot editor dialog");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: /^Remove a\.pdf/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "confirm dialog");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("link", { name: /Review/ }).click();
  await expect(page.getByText("Contents in pack order")).toBeVisible();
  await audit(page, "review");

  for (const [path, ready] of [["/", "Audit pack"], ["/templates", "Supplier onboarding"], ["/library", "a.pdf"], ["/activity", "Created pack"], ["/settings", "File limits"]] as const) {
    await page.goto(path);
    await expect(page.getByText(ready).first()).toBeVisible();
    await audit(page, path);
  }
  await page.goto("/templates");
  await page.getByRole("link", { name: "Edit" }).first().click();
  await expect(page.getByText("Document slots (in order)")).toBeVisible();
  await audit(page, "template editor");
});

test("axe: mobile menu open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await audit(page, "mobile nav");
});

test("keyboard: reorder with the drag handle, dialog focus and Escape", async ({ page }) => {
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Keys");
  await page.locator("#pack-organisationName").fill("Acme");
  await page.getByRole("radio", { name: /General submission/ }).check();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  const titles = () => page.locator("li[id^=slot-] h2").allInnerTexts();
  expect((await titles())[0]).toContain("Cover letter");

  // dnd-kit keyboard sensor: Space to pick up, Arrow to move, Space to drop.
  await page.getByRole("button", { name: /^Reorder Cover letter/ }).focus();
  // Wait for dnd-kit's screen-reader announcements between steps instead of racing it.
  const announce = page.locator('[role="status"][aria-live="assertive"]');
  const ids = async () => ((await announce.innerText()).match(/slot_[\w-]+/g) ?? []);
  await page.keyboard.press("Space"); // pick up: announces the item over itself
  await expect.poll(async () => (await ids()).length).toBe(2);
  await page.keyboard.press("ArrowRight"); // move: announces the item over a different droppable
  await expect.poll(async () => { const [a, b] = await ids(); return a !== b; }).toBe(true);
  await page.keyboard.press("Space");
  await expect(announce).toContainText(/dropped/i);
  await expect.poll(async () => (await titles())[0]).toContain("Main document");

  // Native modal dialog: opens focused inside, Escape closes, focus returns to the trigger.
  const trigger = page.getByRole("button", { name: "Delete slot Attachments" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
