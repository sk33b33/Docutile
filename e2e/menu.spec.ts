import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const panel = (p: Page) => p.getByRole("complementary", { name: "Official portals" });
const drawer = (p: Page) => p.getByRole("dialog", { name: "Menu" });

const EXPECTED: [string, string][] = [
  ["DOJ Online", "https://dojonline.justice.gov.za"],
  ["Trust Beneficial Ownership Register", "https://trustonline.justice.gov.za/Masters"],
  ["BizPortal", "https://www.bizportal.gov.za/"],
  ["CIPC e-Services", "https://eservices.cipc.co.za/"],
  ["CIPC IPOnline", "https://iponline.cipc.co.za/Account/Login.aspx"],
];

test("the dashboard has a side panel of official portals, in a list grouped by main category, that open in a new tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(panel(page).getByRole("heading", { name: "Official portals" })).toBeVisible();
  await expect(panel(page)).toContainText("Docutile never sees your password");
  await panel(page).getByRole("button", { name: "List", exact: true }).click(); // the grouped list, rather than the carousel
  for (const category of ["South African DOJ", "Master of the High Court: other services", "South African Courts", "CIPC"]) {
    await expect(panel(page).getByRole("heading", { name: category })).toBeVisible();
  }
  await expect(panel(page).getByRole("heading", { name: "General business" })).toHaveCount(0); // no official portal for it

  for (const [name, href] of EXPECTED) {
    const link = panel(page).getByRole("link", { name: new RegExp(`^${name}`) }).first();
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    await expect(link).toContainText("opens the official site in a new tab");
  }
  // The same DOJ Online link appears under each category it serves, with a line saying what it is for there.
  await expect(panel(page).getByRole("link", { name: /^DOJ Online/ })).toHaveCount(3);

  // It really is a side panel: to the right of the "Start a pack" section on a wide screen.
  const side = (await panel(page).boundingBox())!;
  const explorer = (await page.getByRole("region", { name: "Start a pack" }).boundingBox())!;
  expect(side.x).toBeGreaterThanOrEqual(explorer.x + explorer.width);
});

test("on a narrower screen the portals panel sits between the explorer and the packs, with no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/");
  const side = (await panel(page).boundingBox())!;
  const explorer = (await page.getByRole("region", { name: "Start a pack" }).boundingBox())!;
  expect(side.y).toBeGreaterThanOrEqual(explorer.y + explorer.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the pop-out menu opens from the sidebar, holds every option, and closes with Escape, the X or a click outside", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open all options" });
  await expect(drawer(page)).not.toBeVisible(); // closed until asked for

  await opener.click();
  await expect(drawer(page)).toBeVisible();
  for (const page_ of ["Dashboard", "New Pack", "Templates", "Document Library", "Activity", "Settings"]) {
    await expect(drawer(page).getByRole("link", { name: page_ })).toBeVisible();
  }
  await expect(drawer(page).getByRole("heading", { name: "Official portals" })).toBeVisible();
  await expect(drawer(page).getByRole("link", { name: /^CIPC IPOnline/ })).toHaveAttribute("href", "https://iponline.cipc.co.za/Account/Login.aspx");
  await expect(drawer(page).getByRole("group", { name: "Colour theme" })).toBeVisible();
  await expect(drawer(page).getByText("Local-first. Files stay in this browser.")).toBeVisible();

  // The page behind cannot be reached while it is open, and Escape closes it and returns focus to the button.
  await page.keyboard.press("Escape");
  await expect(drawer(page)).not.toBeVisible();
  await expect(opener).toBeFocused();

  await opener.click();
  await drawer(page).getByRole("button", { name: "Close menu" }).click();
  await expect(drawer(page)).not.toBeVisible();

  await opener.click();
  await page.mouse.click(1100, 400); // the dimmed page outside the panel
  await expect(drawer(page)).not.toBeVisible();
});

test("choosing a page in the pop-out menu goes there and closes it; the theme switch inside works", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open all options" }).click();
  await drawer(page).getByRole("group", { name: "Colour theme" }).getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await drawer(page).getByRole("link", { name: "Document Library" }).click();
  await page.waitForURL("**/library");
  await expect(drawer(page)).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Document library" })).toBeVisible();

  // Closes by itself when the page changes any other way too (Back).
  await page.getByRole("button", { name: "Open all options" }).click();
  await expect(drawer(page)).toBeVisible();
  await page.goBack();
  await expect(drawer(page)).not.toBeVisible();
});

test("on a phone the menu button opens the same pop-out menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open all options" })).toBeHidden(); // the sidebar is desktop only
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(drawer(page)).toBeVisible();
  await expect.poll(async () => (await drawer(page).boundingBox())!.x).toBe(0); // slid fully in
  const box = (await drawer(page).boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(390 * 0.9 + 1); // a panel, not the whole screen: the page shows beside it
  await expect(drawer(page).getByRole("heading", { name: "Official portals" })).toBeVisible();
  await drawer(page).getByRole("link", { name: "Templates" }).click();
  await page.waitForURL("**/templates");
  await expect(drawer(page)).not.toBeVisible();
});

test("the panel and the pop-out menu pass the accessibility audit in both themes", async ({ page }) => {
  const check = async (label: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), label).toEqual([]);
  };
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((t) => localStorage.setItem("docutile:theme", t), theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await check(`dashboard with portals panel (${theme})`);
    await page.getByRole("button", { name: "Open all options" }).click();
    await expect(drawer(page)).toBeVisible();
    await page.waitForTimeout(400); // slide-in finished
    await check(`pop-out menu (${theme})`);
    await page.keyboard.press("Escape");
  }
});

test("the pop-out menu has a single scrollbar: the panel does not scroll, its content does", async ({ page }) => {
  for (const [width, height] of [[1280, 600], [390, 600]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.getByRole("button", { name: /Open (all options|menu)/ }).click();
    await expect(drawer(page)).toBeVisible();
    const state = () => page.evaluate(() => {
      const panel = document.querySelector("dialog.menu-drawer") as HTMLElement;
      const content = panel.firstElementChild as HTMLElement;
      return { panelOverflow: getComputedStyle(panel).overflowY, panelScrolls: panel.scrollHeight > panel.clientHeight && getComputedStyle(panel).overflowY !== "hidden", contentOverflow: getComputedStyle(content).overflowY, contentOverflows: content.scrollHeight > content.clientHeight, contentTop: content.scrollTop, panelTop: panel.scrollTop };
    });
    const before = await state();
    expect(before.panelOverflow).toBe("hidden"); // one scroller only
    expect(before.panelScrolls).toBe(false);
    expect(before.contentOverflow).toBe("auto");
    expect(before.contentOverflows, `${width}x${height}: the menu is taller than the screen`).toBe(true);

    // The wheel scrolls the content, and everything (the portals, the theme switch, the account) can be reached.
    await page.mouse.move(width < 500 ? 150 : 180, height / 2);
    await page.mouse.wheel(0, 3000);
    await expect.poll(async () => (await state()).contentTop).toBeGreaterThan(0);
    expect((await state()).panelTop).toBe(0);
    await expect(drawer(page).getByText("Local-first. Files stay in this browser.")).toBeInViewport();
    await expect(drawer(page).getByRole("group", { name: "Colour theme" })).toBeAttached();
    await page.keyboard.press("Escape");
  }
});


const ring = (p: Page) => panel(p).locator(".ring-stage");
const bars = (p: Page) => p.context();

test("the portals are a carousel by default: one tile per official site, each a link that opens in a new tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(ring(page)).toHaveAttribute("data-settled", "true"); // no intro spin here
  await expect(panel(page).getByRole("button", { name: "Carousel", exact: true })).toHaveAttribute("aria-pressed", "true");
  const tiles = ring(page).locator("a.ring-tile");
  await expect(tiles).toHaveCount(7); // seven sites; DOJ Online is one tile that serves three categories
  const hrefs = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(7);
  for (const [, href] of EXPECTED) expect(hrefs).toContain(href);
  for (const el of await tiles.all()) {
    await expect(el).toHaveAttribute("target", "_blank");
    await expect(el).toHaveAttribute("rel", /noopener/);
    await expect(el).toHaveAttribute("rel", /noreferrer/);
    await expect(el).toHaveAttribute("draggable", "false");
    await expect(el).toContainText("opens the official site in a new tab");
  }
  const dojOnline = ring(page).locator("a.ring-tile[href='https://dojonline.justice.gov.za']");
  await expect(dojOnline).toContainText("DOJ · Master · Courts");

  // Turning it changes the centre tile, and the Open button follows.
  const centre = () => ring(page).getAttribute("data-active");
  const first = await centre();
  await panel(page).getByRole("button", { name: "Next" }).click();
  await expect(ring(page)).toHaveAttribute("data-settled", "true");
  expect(await centre()).not.toBe(first);
  const open = panel(page).getByRole("link", { name: /^Open / });
  await expect(open).toHaveAttribute("target", "_blank");
  expect(await open.getAttribute("href")).toBe(await ring(page).locator("a.ring-tile[tabindex='0']").getAttribute("href"));
});

test("clicking a portal opens the official site in a new tab that cannot reach back into Docutile; dragging the ring opens nothing", async ({ page, context }) => {
  await context.route(/^https:\/\/(dojonline|trustonline|icmsweb|eservices|iponline|enquiries)\..*|^https:\/\/www\.bizportal\.gov\.za\/.*/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Official site</title>" }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(ring(page)).toHaveAttribute("data-settled", "true");

  // A drag or flick across the tiles must not count as a click on one.
  let opened = 0;
  context.on("page", () => { opened++; });
  const b = (await ring(page).boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(b.x + b.width * 0.8 - i * 25, b.y + b.height / 2, { steps: 2 }); await page.waitForTimeout(10); }
  await page.mouse.up();
  await expect(ring(page)).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
  await page.waitForTimeout(300);
  expect(opened).toBe(0);

  // A real click on the centre tile opens the site in a new tab with no link back (noopener).
  const popup = context.waitForEvent("page");
  await ring(page).locator("a.ring-tile[tabindex='0']").click({ force: true }); // it hovers up and down, so it is never "still"
  const site = await popup;
  await site.waitForLoadState();
  expect(site.url()).toMatch(/^https:\/\/(dojonline|trustonline|icmsweb|eservices|iponline|enquiries|www\.bizportal)\./);
  expect(await site.evaluate(() => window.opener)).toBeNull();
  await site.close();
  await expect(page).toHaveURL(/localhost/); // Docutile itself stayed where it was
});

test("the portals view is remembered, and reduced motion starts on the list", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await panel(page).getByRole("button", { name: "List", exact: true }).click();
  await expect(ring(page)).toHaveCount(0);
  await expect(panel(page).getByRole("heading", { name: "South African DOJ" })).toBeVisible();
  await page.reload();
  await expect(panel(page).getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await panel(page).getByRole("button", { name: "Carousel", exact: true }).click();
  await expect(ring(page)).toHaveCount(1);

  const calm = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const p2 = await calm.newPage();
  await skipSplash(p2);
  await p2.goto("/");
  await expect(p2.getByRole("complementary", { name: "Official portals" }).getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await calm.close();
  void bars;
});

test("the portals carousel fits a phone, and passes the accessibility audit in both themes", async ({ page }) => {
  const check = async (label: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), label).toEqual([]);
  };
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(ring(page)).toHaveAttribute("data-settled", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const b = (await ring(page).boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(360);
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((t) => localStorage.setItem("docutile:theme", t), theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(ring(page)).toHaveAttribute("data-settled", "true");
    await check(`portals carousel (${theme})`);
  }
});
