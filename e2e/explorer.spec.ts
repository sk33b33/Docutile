import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const explorer = (p: Page) => p.getByRole("region", { name: "Start a pack" });
const stage = (p: Page) => p.locator(".ring-stage");
/** The ring has stopped turning: a tile is locked in the centre. */
const settled = (p: Page) => expect(stage(p)).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
const centre = (p: Page) => stage(p).getAttribute("data-active");
/** Opens a tile on the ring once it has stopped. Two tiles or fewer are shown side by side, with no ring. */
const open = async (p: Page, name: string | RegExp, ring = true) => {
  if (ring) await settled(p);
  await explorer(p).getByRole("button", { name }).first().evaluate((el: HTMLElement) => el.click());
};

test("drill from category to subcategory to service to document, then back out", async ({ page }) => {
  await page.goto("/");
  await expect(explorer(page).getByRole("heading", { name: "Choose a category" })).toBeVisible();
  await expect(explorer(page).getByRole("button", { name: /Category South African DOJ/ })).toHaveCount(1);

  await open(page, /Category South African DOJ/);
  await expect(explorer(page).getByRole("heading", { name: /Choose a group in South African DOJ/ })).toBeVisible();
  await expect(explorer(page).getByRole("button", { name: /Estates \d+ service/ })).toHaveCount(1);
  await expect(explorer(page).getByRole("button", { name: /Trusts \d+ service/ })).toHaveCount(1);

  await open(page, /Estates \d+ service/, false); // only two groups: side by side, no ring
  await expect(explorer(page).getByRole("heading", { name: /Choose a service in Estates/ })).toBeVisible();

  await open(page, /Report a deceased estate: over R250 000/);
  await expect(explorer(page).getByRole("heading", { name: "Report a deceased estate: over R250 000" })).toBeVisible();
  await expect(explorer(page).getByRole("button", { name: /Form J294 Death notice/ })).toHaveCount(1);
  await expect(explorer(page).getByText("After you lodge the pack")).toBeVisible(); // the sourced next steps

  // A document tile opens out and stays put until Back.
  await open(page, /Death notice/);
  const detail = explorer(page).getByRole("article", { name: "Death notice" });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Required");
  await expect(detail).toContainText("Form J294");
  await expect(stage(page)).toHaveCount(0); // nothing spins while a document is open
  await detail.getByRole("button", { name: "Back to documents" }).click();
  await expect(explorer(page).getByRole("heading", { name: "Report a deceased estate: over R250 000" })).toBeVisible();

  // Breadcrumb jumps straight back up; Back steps one level at a time.
  await explorer(page).getByRole("navigation", { name: "Breadcrumb" }).getByRole("button", { name: "South African DOJ" }).click();
  await expect(explorer(page).getByRole("heading", { name: /Choose a group in South African DOJ/ })).toBeVisible();
  await explorer(page).getByRole("button", { name: "Back", exact: true }).click();
  await expect(explorer(page).getByRole("heading", { name: "Choose a category" })).toBeVisible();
});

test("a category with one group skips the subcategory step", async ({ page }) => {
  await page.goto("/");
  await explorer(page).getByRole("button", { name: "List" }).click();
  await explorer(page).getByRole("button", { name: /Category South African Courts/ }).click();
  await expect(explorer(page).getByRole("heading", { name: /Choose a group in South African Courts/ })).toBeVisible(); // Maintenance + Domestic violence
  await explorer(page).getByRole("button", { name: /Maintenance/ }).click();
  await expect(explorer(page).getByRole("heading", { name: /Choose a service in Maintenance/ })).toBeVisible();
});

test("a pack can be started from a service and its documents become tiles in the builder", async ({ page }) => {
  await page.goto("/");
  await explorer(page).getByRole("button", { name: "List" }).click();
  await explorer(page).getByRole("button", { name: /Category General business/ }).click();
  await explorer(page).getByRole("button", { name: /General 1 service/ }).first().click();
  await explorer(page).getByRole("button", { name: /General submission/ }).click();
  await explorer(page).getByRole("button", { name: "Start a pack", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Create pack" }).click();
  await expect(dialog.getByText("Client / organisation name is required.")).toBeVisible();
  await dialog.getByLabel(/Client \/ organisation/).fill("Acme Ltd");
  await dialog.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(page.locator("li[id^=slot-]")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "General submission" }).first()).toBeVisible();
});

test("the ring spins when dragged, coasts, then locks a tile in the centre and hovers it", async ({ page }) => {
  await page.goto("/");
  await settled(page); // the intro spin has finished
  const start = await centre(page);
  const box = (await stage(page).boundingBox())!;
  const y = box.y + box.height / 2;

  // A fast flick to the left, released while still moving.
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width * 0.7 - i * 40, y, { steps: 2 }); await page.waitForTimeout(8); }
  await expect(stage(page)).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  await expect(stage(page)).toHaveAttribute("data-settled", "false"); // coasting, not stopped
  // While it coasts, different tiles pass through the centre. (It may end on the tile it started on: a hard flick
  // can turn the ring exactly once round.)
  const passed = new Set<string | null>([start]);
  for (let i = 0; i < 40 && (await stage(page).getAttribute("data-settled")) !== "true"; i++) {
    passed.add(await centre(page));
    await page.waitForTimeout(40);
  }
  await settled(page);
  expect(passed.size, "tiles that passed through the centre").toBeGreaterThan(2);
  await expect(stage(page).locator(".ring-bob")).toHaveCount(1); // the locked centre tile hovers

  // Grabbing a coasting ring stops it.
  await page.mouse.move(box.x + box.width * 0.3, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.width * 0.3 + i * 50, y, { steps: 2 }); await page.waitForTimeout(8); }
  await page.mouse.up();
  await expect(stage(page)).toHaveAttribute("data-settled", "false");
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await expect(stage(page)).toHaveAttribute("data-settled", "false");
  const held = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ring-stage > div")].map((e) => e.style.transform).join("|"));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ring-stage > div")].map((e) => e.style.transform).join("|"))).toBe(held); // frozen while held
  await page.mouse.up();
  await settled(page);

  // A drag is not a click: nothing opened.
  await expect(explorer(page).getByRole("heading", { name: "Choose a category" })).toBeVisible();
});

test("keyboard and buttons turn the ring and open the centre tile", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  const first = await centre(page);
  await explorer(page).getByRole("button", { name: "Next" }).click();
  await settled(page);
  const second = await centre(page);
  expect(second).not.toBe(first);
  await explorer(page).getByRole("button", { name: "Previous" }).click();
  await settled(page);
  expect(await centre(page)).toBe(first);

  await stage(page).locator("button[tabindex='0']").focus();
  await page.keyboard.press("ArrowRight");
  await settled(page);
  expect(await centre(page)).toBe(second);
  await expect(stage(page).locator("button[tabindex='0']")).toBeFocused(); // focus follows the centre tile
  await page.keyboard.press("Enter");
  await expect(explorer(page).getByRole("heading", { name: /Choose a group in/ })).toBeVisible();
});

test("list view works, is remembered, and reduced motion defaults to it", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  await explorer(page).getByRole("button", { name: "List" }).click();
  await expect(stage(page)).toHaveCount(0);
  await expect(explorer(page).getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(explorer(page).getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
  await explorer(page).getByRole("button", { name: "Carousel" }).click();
  await expect(stage(page)).toHaveCount(1);
});

test("with reduced motion the ring does not spin or hover, and the list is the default", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await skipSplash(page);
  await page.goto("/");
  await expect(explorer(page).getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
  await explorer(page).getByRole("button", { name: "Carousel" }).click();
  await expect(stage(page)).toHaveAttribute("data-settled", "true"); // no intro spin
  await expect(stage(page).locator(".ring-bob")).toHaveCount(1); // class is present but the animation is disabled by CSS
  const anim = await stage(page).locator(".ring-bob").evaluate((e) => getComputedStyle(e).animationName);
  expect(anim).toBe("none");
  const first = await centre(page);
  await explorer(page).getByRole("button", { name: "Next" }).click();
  await expect(stage(page)).toHaveAttribute("data-settled", "true");
  expect(await centre(page)).not.toBe(first); // jumps straight to the next tile
  await context.close();
});

test("the explorer has no accessibility violations, in carousel, list and detail views", async ({ page }) => {
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  };
  await page.goto("/");
  await settled(page);
  await check();
  await explorer(page).getByRole("button", { name: "List" }).click();
  await check();
  await explorer(page).getByRole("button", { name: /Category South African DOJ/ }).click();
  await explorer(page).getByRole("button", { name: /Estates/ }).click();
  await explorer(page).getByRole("button", { name: /over R250 000/ }).click();
  await explorer(page).getByRole("button", { name: /Death notice/ }).click();
  await check();

  // The busiest ring: 18 document tiles, with the far ones small and dimmed.
  await explorer(page).getByRole("button", { name: "Back to documents" }).click();
  await explorer(page).getByRole("button", { name: "Carousel" }).click();
  await settled(page);
  await check();
});

test("the ring fits a phone screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await settled(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = (await stage(page).boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(360);
});

/** The centre tile's scroll area, and a point over the middle of it. */
async function centreScroller(page: Page) {
  const scroller = stage(page).locator(".ring-scroll").filter({ has: page.locator("button[tabindex='0']") });
  await expect(scroller).toHaveCount(1);
  const box = (await scroller.boundingBox())!;
  return { scroller, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
const scrollTopOf = (loc: ReturnType<Page["locator"]>) => loc.evaluate((e) => (e as HTMLElement).scrollTop);
const pageScroll = (page: Page) => page.evaluate(() => window.scrollY);

/** DOJ, then Estates: its service names are long, so on a phone nearly every tile has more text than fits. */
async function toLongTiles(page: Page) {
  await page.goto("/");
  await settled(page);
  await open(page, /Category South African DOJ/);
  await open(page, /Estates \d+ service/, false);
  await settled(page);
}

test("long text in a tile scrolls with the mouse wheel while hovering, and the page stays put", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await toLongTiles(page);
  const { scroller, x, y } = await centreScroller(page);
  const tile = scroller.locator("xpath=..");
  await expect.poll(() => scroller.evaluate((e) => e.scrollHeight > e.clientHeight + 4)).toBe(true);
  await expect(tile.getByText("Scroll for more")).toBeVisible(); // the cue that there is more below

  const before = await pageScroll(page);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 60);
  await expect.poll(() => scrollTopOf(scroller)).toBeGreaterThan(0);
  expect(await pageScroll(page)).toBe(before); // the wheel scrolled the tile, not the page

  // All the way down: the last lines are reachable, the cue goes, and the page still does not move.
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 200);
  await expect(tile.getByText("Scroll for more")).toHaveCount(0);
  expect(await scroller.evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight)).toBeLessThan(4);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  expect(await pageScroll(page)).toBe(before);

  // Back up: the cue returns.
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => scrollTopOf(scroller)).toBe(0);
  await expect(tile.getByText("Scroll for more")).toBeVisible();
});

test("a tile whose text fits does not trap the wheel: the page scrolls as normal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/");
  await settled(page);
  const { scroller, x, y } = await centreScroller(page);
  expect(await scroller.evaluate((e) => e.scrollHeight > e.clientHeight + 4)).toBe(false);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => pageScroll(page)).toBeGreaterThan(0);
});

test("long text scrolls with a finger, while a sideways swipe still spins the ring", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await skipSplash(page);
  await toLongTiles(page);
  const { scroller, x, y } = await centreScroller(page);
  await expect.poll(() => scroller.evaluate((e) => e.scrollHeight > e.clientHeight + 4)).toBe(true);

  // Real touch events, as a finger makes them: down, a series of moves, up. (The browser turns them into scrolling.)
  const cdp = await context.newCDPSession(page);
  const drag = async (dx: number, dy: number, steps = 12) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // Finger up the tile: the text moves, the page does not.
  const before = await pageScroll(page);
  await drag(0, -70);
  await expect.poll(() => scrollTopOf(scroller)).toBeGreaterThan(20);
  expect(await pageScroll(page)).toBe(before);

  // Finger sideways: the ring spins (tiles pass through the centre) instead of scrolling anything.
  const passed = new Set<string | null>([await centre(page)]);
  await drag(-220, 0);
  for (let i = 0; i < 80; i++) {
    passed.add(await centre(page));
    if (i > 3 && (await stage(page).getAttribute("data-settled")) === "true") break;
    await page.waitForTimeout(30);
  }
  await settled(page);
  expect(passed.size, "tiles that passed through the centre").toBeGreaterThan(1);
  await context.close();
});

test("a tile's long text can be scrolled with the arrow keys once it has focus", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await toLongTiles(page);
  const { scroller } = await centreScroller(page);
  await scroller.locator("button").focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => scrollTopOf(scroller)).toBeGreaterThan(0);
});

test("scrollable tiles have no accessibility violations, on the ring and in the list", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await toLongTiles(page);
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  };
  await check();
  await explorer(page).getByRole("button", { name: "List", exact: true }).click();
  await check();
});
