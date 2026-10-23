import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { skipSplash } from "./skip-splash";
import { pdfFile } from "./fixtures";

test.beforeEach(({ page }) => skipSplash(page));

const controlled = (page: Page) => page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 20_000 });
/** Polls from the test side: waitForFunction does not wait for an async predicate. */
const cached = (page: Page, path: string) =>
  expect
    .poll(() => page.evaluate(async (p) => !!(await (await caches.open("docutile-pages-v1")).match(p)), path), { timeout: 20_000, message: `${path} should be cached by the service worker` })
    .toBe(true);

test("installable: valid manifest with real icons, theme colour and apple touch icon", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: "Docutile", short_name: "Docutile", display: "standalone", start_url: "/", scope: "/" });
  const purposes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
  expect(purposes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
  expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe("#050816");
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")).toContain("apple-touch-icon");
});

test("service worker takes control and caches the app shell", async ({ page }) => {
  await page.goto("/");
  await controlled(page);
  for (const path of ["/", "/packs/new", "/templates", "/offline.html"]) await cached(page, path);
});

/** `next start` forks a child, so kill the whole process group. SIGKILL, because a graceful shutdown keeps serving the browser's open connections. */
function stop(proc: ChildProcess) {
  try { if (proc.pid) process.kill(-proc.pid, "SIGKILL"); } catch { /* already gone */ }
}

/** Starts a second production server we can really shut down (Playwright's offline switch does not stop service-worker requests). */
async function startServer(port: number): Promise<ChildProcess> {
  const proc = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: "ignore", detached: true });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://localhost:${port}/`)).ok) return proc; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(proc);
  throw new Error("test server did not start");
}

test("works offline: with the server stopped, visited pages reload, packs stay editable, unknown pages show the offline page", async ({ page, context }) => {
  test.setTimeout(120_000);
  const PORT = 3199;
  const origin = `http://localhost:${PORT}`;
  const server = await startServer(PORT);
  try {
    await page.goto(`${origin}/packs/new`);
    await controlled(page);
    await page.locator("#pack-name").fill("Offline pack");
    await page.locator("#pack-organisationName").fill("Acme");
    await page.getByRole("radio", { name: /General submission/ }).check();
    await page.getByRole("button", { name: "Create pack" }).click();
    await page.waitForURL(/\/packs\/pack_/);
    const builder = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: "Offline pack" })).toBeVisible();
    await cached(page, builder); // the app asked the worker to remember this in-app navigation
    for (const path of ["/", "/templates"]) await cached(page, path);

    // Genuinely offline: nothing is listening any more.
    stop(server);
    await expect.poll(async () => fetch(origin).then((r) => (r.ok ? "up" : "down"), () => "down"), { timeout: 15_000 }).toBe("down");
    await context.setOffline(true); // also flips navigator.onLine, which drives the offline banner

    await page.reload();
    await expect(page.getByRole("heading", { name: "Offline pack" })).toBeVisible();
    await expect(page.getByText(/You are offline\. Docutile keeps working/)).toBeVisible();

    // Files can still be attached and stored locally, and other saved pages still open.
    await page.locator("li[id^=slot-]").first().locator("input[type=file]").first().setInputFiles(await pdfFile("offline.pdf", 1));
    await expect(page.getByText("offline.pdf").first()).toBeVisible();
    await page.goto(`${origin}/templates`);
    await expect(page.getByRole("heading", { name: "Services & templates" })).toBeVisible();

    // A page that was never saved falls back to the friendly offline page instead of a browser error.
    await page.goto(`${origin}/packs/pack_never_visited`);
    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the dashboard" })).toBeVisible();

    // The pack and its file are still there on the dashboard.
    await page.goto(`${origin}/`);
    await expect(page.getByRole("heading", { name: "Offline pack" })).toBeVisible();
  } finally {
    stop(server);
  }
});
