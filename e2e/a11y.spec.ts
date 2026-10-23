import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

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

test("reflow: no horizontal scrolling at 320 CSS px (WCAG 1.4.10) on every main page", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Reflow");
  await page.locator("#pack-organisationName").fill("Acme");
  await page.getByRole("radio", { name: /deceased estate: over R250 000/ }).check();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  const builder = page.url();
  await page.locator("li[id^=slot-]").first().locator("input[type=file]").first().setInputFiles(await pdfFile("a.pdf", 1));
  await expect(page.getByText("a.pdf").first()).toBeVisible();
  const pages: [string, string][] = [
    ["/", "Dashboard"], ["/packs/new", "New pack"], [builder, "Reflow"], [`${builder}/review`, "Review: Reflow"],
    ["/templates", "Services & templates"], ["/library", "Document library"], ["/activity", "Activity"], ["/settings", "Settings"],
  ];
  for (const [path, marker] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: marker, exact: true }).first()).toBeVisible();
    // Force a wide fallback font so the result does not depend on which fonts the machine has
    // (CI's fallback font is wider than a typical desktop's, which once hid an overflow locally).
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test("user preferences: reduced motion stops the background animation; forced colours keep controls usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("No packs yet")).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body, "::before").animationName)).toBe("none");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await page.evaluate(() => getComputedStyle(document.body, "::before").animationName)).toBe("drift");

  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/packs/new");
  await expect(page.getByRole("button", { name: "Create pack" })).toBeVisible();
  await page.locator("#pack-name").fill("High contrast");
  await expect(page.locator("#pack-name")).toHaveValue("High contrast");
  // Glass effects are disabled in forced-colours mode so system colours stay legible.
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".glass-input")!).backdropFilter)).toBe("none");
});
