import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const enter = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Tap to enter Docutile" });

test("splash shows the logo centred, blocks the app behind it, and a tap enters", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(enter(page)).toBeVisible();
  await expect(page.getByText("Tap to enter", { exact: true })).toBeVisible();

  // Logo is centred horizontally; the splash group (logo, name, hint) is centred vertically.
  const logo = await page.locator(".splash-logo").boundingBox();
  expect(logo).not.toBeNull();
  expect(Math.abs(logo!.x + logo!.width / 2 - 640)).toBeLessThanOrEqual(2);
  const hint = await page.locator(".splash-hint").boundingBox();
  const groupMid = (logo!.y + (hint!.y + hint!.height)) / 2;
  expect(Math.abs(groupMid - 400)).toBeLessThanOrEqual(40);

  // The app underneath cannot be focused or read until the user enters.
  await expect(page.locator("div[inert]")).toHaveCount(1);
  await expect(enter(page)).toBeFocused();
  // Tabbing must never land inside the inert app (with one focusable element, focus leaves the page instead).
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !document.activeElement?.closest("[inert]") || document.activeElement === document.body)).toBe(true);
  }
  await enter(page).focus();

  await enter(page).click();
  await expect(enter(page)).toHaveCount(0);
  await expect(page.locator("div[inert]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New Pack", exact: true })).toBeVisible();
});

test("splash shows once per session: a reload after entering goes straight to the app", async ({ page }) => {
  await page.goto("/");
  await enter(page).click();
  await page.reload(); // even mid-fade: the tap is remembered immediately
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(enter(page)).toHaveCount(0);
});

test("splash works from the keyboard alone (Enter or Space)", async ({ page }) => {
  await page.goto("/");
  await expect(enter(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().clearCookies();
  const second = await page.context().newPage();
  await second.goto("/");
  await expect(enter(second)).toBeFocused();
  await second.keyboard.press("Space");
  await expect(second.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("splash enters instantly with reduced motion, and has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(enter(page)).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

  const reduced = await page.context().newPage();
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto("/");
  expect(await reduced.evaluate(() => getComputedStyle(document.querySelector(".splash")!).animationName)).toBe("none");
  await enter(reduced).click();
  await expect(enter(reduced)).toHaveCount(0, { timeout: 1000 }); // no 450 ms fade
});

test("splash fits a phone screen and the logo stays centred", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(enter(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const logo = await page.locator(".splash-logo").boundingBox();
  expect(Math.abs(logo!.x + logo!.width / 2 - 160)).toBeLessThanOrEqual(2);
});
