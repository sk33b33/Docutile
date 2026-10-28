import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const tile = (p: Page, name: string) => p.locator("li[id^=slot-]").filter({ has: p.getByRole("heading", { name }) });
const card = (p: Page, packName: string) => p.locator("ul > li").filter({ has: p.getByRole("heading", { name: packName }) });

async function createPack(p: Page, name: string, template: RegExp) {
  await p.goto("/packs/new");
  await p.locator("#pack-name").fill(name);
  await p.locator("#pack-organisationName").fill("Acme Ltd");
  await p.getByRole("radio", { name: template }).check();
  await p.getByRole("button", { name: "Create pack" }).click();
  await p.waitForURL(/\/packs\/pack_/);
}

async function attach(p: Page, slotName: string, fileName: string, pages = 1) {
  await tile(p, slotName).locator("input[type=file]").first().setInputFiles(await pdfFile(fileName, pages));
  await expect(tile(p, slotName).getByText(fileName).first()).toBeVisible();
}

test("a pack tile says what the pack is applying for, and a draft has a Continue editing button", async ({ page }) => {
  await createPack(page, "Estate of J Citizen", /deceased estate: over R250 000/);
  await attach(page, "Death notice", "notice.pdf");
  await createPack(page, "Blank one", /General submission/);
  await attach(page, "Cover letter", "letter.pdf");
  await attach(page, "Main document", "main.pdf"); // every required document: no longer a draft

  await page.goto("/");
  const estate = card(page, "Estate of J Citizen");
  await expect(estate.getByTestId("applying-for")).toHaveText("Report a deceased estate: over R250 000");
  await expect(estate).toContainText("Applying for:");
  await expect(estate.getByText("Draft")).toBeVisible();

  // The draft says Continue editing and takes you back to the builder, where you left off.
  await estate.getByRole("link", { name: "Continue editing Estate of J Citizen" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(page.getByRole("heading", { name: "Estate of J Citizen" })).toBeVisible();
  await expect(tile(page, "Death notice").getByText("notice.pdf").first()).toBeVisible(); // the file is still there

  // A pack that is ready is not a draft: it offers Open instead.
  await page.goto("/");
  const ready = card(page, "Blank one");
  await expect(ready.getByTestId("applying-for")).toHaveText("General submission");
  await expect(ready.getByRole("link", { name: /Continue editing/ })).toHaveCount(0);
  await ready.getByRole("link", { name: "Open Blank one" }).click();
  await page.waitForURL(/\/packs\/pack_/);
});

test("a custom checklist says so", async ({ page }) => {
  await createPack(page, "Own list", /Custom checklist/);
  await page.goto("/");
  await expect(card(page, "Own list").getByTestId("applying-for")).toHaveText("Custom checklist");
});

test("light and dark theme toggle: switches, is remembered, and does not flash on load", async ({ page }) => {
  const group = page.getByRole("group", { name: "Colour theme" });
  const bodyLuminance = () => page.evaluate(() => {
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

  await page.goto("/");
  await expect(group.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  expect(await bodyLuminance()).toBeLessThan(0.2);

  await group.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(group.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  await expect(group.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "false");
  expect(await bodyLuminance()).toBeGreaterThan(0.8);
  const barColours = () => page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((e) => e.getAttribute("content")));
  expect(new Set(await barColours())).toEqual(new Set(["#e9eff8"]));

  // Remembered across a reload, and already applied before the page finished loading (no dark flash).
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  await expect(page.getByRole("heading", { name: "Document library" })).toBeVisible();
  expect(await bodyLuminance()).toBeGreaterThan(0.8);

  await page.goto("/");
  await group.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bodyLuminance()).toBeLessThan(0.2);
  expect(new Set(await barColours())).toEqual(new Set(["#050816"]));
  await page.reload();
  await expect(group.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
});

test("the light theme keeps text readable on the carousel, the list and a document card", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("docutile:theme", "light"));
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  };
  await page.goto("/");
  await expect(page.locator(".ring-stage")).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
  await check();
  const ex = page.getByRole("region", { name: "Start a pack" });
  await ex.getByRole("button", { name: "List", exact: true }).click();
  await check();
  await ex.getByRole("button", { name: /Category CIPC/ }).click();
  await ex.getByRole("button", { name: /CIPC Trade marks/ }).click();
  await ex.getByRole("button", { name: /Record the assignment of a trade mark/ }).click();
  await check();
  await ex.getByRole("button", { name: /Deed of assignment/ }).click();
  await check();
});

test("the splash screen is readable in the light theme too", async ({ page }) => {
  const fresh = await page.context().newPage(); // no skipped splash
  await fresh.addInitScript(() => localStorage.setItem("docutile:theme", "light"));
  await fresh.goto("/");
  await expect(fresh.getByRole("button", { name: /Tap to enter/i })).toBeVisible();
  const { violations } = await new AxeBuilder({ page: fresh }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
});

test("the document library sorts by date, file name, pack name, size and type", async ({ page }) => {
  // Zeta pack: m.pdf (3 pages), z-big.pdf (6 pages). Alpha pack: a-small.pdf (1 page), uploaded last.
  await createPack(page, "Zeta pack", /General submission/);
  await attach(page, "Cover letter", "m.pdf", 3);
  await attach(page, "Main document", "z-big.pdf", 6);
  await createPack(page, "Alpha pack", /General submission/);
  await attach(page, "Cover letter", "a-small.pdf", 1);

  await page.goto("/library");
  const sort = page.getByLabel("Sort by");
  const order = () => page.locator("tbody tr td:first-child").allInnerTexts();
  await expect(sort).toHaveValue("newest");
  expect(await order()).toEqual(["a-small.pdf", "z-big.pdf", "m.pdf"]);

  const expectations: [string, string[]][] = [
    ["Date added: oldest first", ["m.pdf", "z-big.pdf", "a-small.pdf"]],
    ["File name: A to Z", ["a-small.pdf", "m.pdf", "z-big.pdf"]],
    ["File name: Z to A", ["z-big.pdf", "m.pdf", "a-small.pdf"]],
    ["Pack name: A to Z", ["a-small.pdf", "m.pdf", "z-big.pdf"]],
    ["Pack name: Z to A", ["m.pdf", "z-big.pdf", "a-small.pdf"]],
    ["Size: largest first", ["z-big.pdf", "m.pdf", "a-small.pdf"]],
    ["Size: smallest first", ["a-small.pdf", "m.pdf", "z-big.pdf"]],
  ];
  for (const [label, expected] of expectations) {
    await sort.selectOption({ label });
    expect(await order(), label).toEqual(expected);
  }

  // Sorting and searching work together.
  await sort.selectOption({ label: "Size: largest first" });
  await page.getByLabel("Search documents").fill("zeta");
  expect(await order()).toEqual(["z-big.pdf", "m.pdf"]);
  await expect(page.getByText("2 of 3 documents match.")).toBeVisible();
});

test("the Device theme follows the device's light or dark setting, live, and is remembered", async ({ page }) => {
  const group = page.getByRole("group", { name: "Colour theme" });
  const theme = () => page.locator("html").getAttribute("data-theme");
  const luminance = () => page.evaluate(() => {
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(group.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true"); // the default ignores the device
  expect(await theme()).not.toBe("light");

  await group.getByRole("button", { name: "Device" }).click();
  await expect(group.getByRole("button", { name: "Device" })).toHaveAttribute("aria-pressed", "true");
  await expect(group.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await luminance()).toBeGreaterThan(0.8);
  await expect(group.getByText("(following your device, now light)")).toBeAttached();

  // The device changes while the page is open: the page follows at once.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await luminance()).toBeLessThan(0.2);
  await expect(group.getByText("(following your device, now dark)")).toBeAttached();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Remembered, and applied before the page finishes loading, to whatever the device says at that moment.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => [document.documentElement.dataset.themeChoice, document.documentElement.dataset.theme])).toEqual(["system", "dark"]);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await theme()).toBe("light");
  await expect(group.getByRole("button", { name: "Device" })).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // A fixed choice stops following the device.
  await group.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(200);
  expect(await theme()).toBe("light");
  await page.emulateMedia({ colorScheme: "light" });
  await group.getByRole("button", { name: "Dark", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(200);
  expect(await theme()).toBe("dark");
});

test("the Device theme passes the accessibility audit in both device settings", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await skipSplash(page);
    await page.addInitScript(() => localStorage.setItem("docutile:theme", "system"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), colorScheme).toEqual([]);
    await context.close();
  }
});
