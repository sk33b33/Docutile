import type { Page } from "@playwright/test";

/** Behaves like a user who has already tapped through the splash this session. */
export async function skipSplash(page: Page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem("docutile:entered", "1"); } catch { /* storage blocked */ }
  });
}
