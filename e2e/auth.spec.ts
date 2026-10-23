import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import type { ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { startServer, stop } from "./server";

const PORT = 3197;
const ORIGIN = `http://localhost:${PORT}`;
const SECRET = "test-secret-only-for-e2e-0123456789abcdef";
const CLIENT_ID = "dummy-client-id.apps.googleusercontent.com";

/** A real signed session cookie, as Google sign-in would leave behind. (Google itself cannot be driven from a test.) */
async function sessionCookie(email: string, name: string) {
  const value = await encode({ token: { email, name, sub: email }, secret: SECRET, salt: "authjs.session-token", maxAge: 3600 });
  // Host-only (url, not domain), exactly like the cookie a real sign-in sets, so signing out deletes it.
  return { name: "authjs.session-token", value, url: ORIGIN, httpOnly: true, sameSite: "Lax" as const };
}
const dbName = (email: string) => `docutile-u-${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;

test.describe("sign-in switched OFF (the default)", () => {
  test("the sign-in screen explains it is off, the app stays open, and nothing is faked", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Docutile" })).toBeVisible();
    await expect(page.getByText(/Sign-in is not switched on for this site yet/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    await expect(page.getByLabel("Email address")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with email" })).toBeDisabled();
    await expect(page.getByText(/Email and password sign-in is not available/)).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible(); // not locked out
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    const api = await page.request.get("/api/auth/session");
    expect(api.status()).toBe(404);
  });

  test("the sign-in screen has no accessibility violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Docutile" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
});

test.describe("sign-in switched ON", () => {
  let server: ChildProcess;
  test.beforeAll(async () => {
    server = await startServer(PORT, { AUTH_SECRET: SECRET, AUTH_GOOGLE_ID: CLIENT_ID, AUTH_GOOGLE_SECRET: "dummy-secret" });
  });
  test.afterAll(() => stop(server));

  test("signed-out visitors are sent to the sign-in screen; install files stay reachable", async ({ request }) => {
    for (const path of ["/", "/packs/new", "/library", "/templates", "/packs/pack_x/review"]) {
      const res = await request.get(`${ORIGIN}${path}`, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()["location"], path).toContain("/login?callbackUrl=");
    }
    const back = await request.get(`${ORIGIN}/packs/pack_x?tab=1`, { maxRedirects: 0 });
    expect(decodeURIComponent(back.headers()["location"])).toContain("callbackUrl=/packs/pack_x?tab=1");
    for (const path of ["/login", "/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png", "/icon.svg"]) {
      expect((await request.get(`${ORIGIN}${path}`, { maxRedirects: 0 })).status(), path).toBe(200);
    }
    expect(await (await request.get(`${ORIGIN}/api/auth/session`)).json()).toBeNull();
  });

  test("the Google button starts a real Google sign-in (PKCE, correct callback) and nothing else is reachable", async ({ page }) => {
    await page.route("https://accounts.google.com/**", (route) => route.abort());
    await page.goto(`${ORIGIN}/login?callbackUrl=%2Flibrary`);
    await expect(page.getByText(/not switched on/)).toHaveCount(0);
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeEnabled();
    const [request] = await Promise.all([page.waitForRequest(/accounts\.google\.com/), google.click()]);
    const url = new URL(request.url());
    expect(url.pathname).toContain("/o/oauth2");
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/google`);
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("scope")).toContain("email");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256"); // PKCE
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    // PKCE ties the sign-in to this browser: the matching secret waits in a cookie until Google sends the user back.
    const cookies = (await page.context().cookies()).map((c) => c.name);
    expect(cookies).toContain("authjs.pkce.code_verifier");
  });

  test("page requests never re-send the session cookie, so a slow response cannot undo a sign-out or an account switch", async ({ request }) => {
    const cookie = await sessionCookie("dave@example.com", "Dave");
    for (const path of ["/", "/library", "/packs/new", "/login"]) {
      const res = await request.get(`${ORIGIN}${path}`, { headers: { cookie: `${cookie.name}=${cookie.value}` }, maxRedirects: 0 });
      expect(res.status() === 200 || res.status() === 307, path).toBe(true);
      expect(res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie"), `${path} set a cookie`).toEqual([]);
    }
  });

  test("an open-redirect callbackUrl is ignored", async ({ page }) => {
    await page.goto(`${ORIGIN}/login?callbackUrl=https%3A%2F%2Fevil.example%2Fx`);
    expect(await page.locator('input[name="callbackUrl"]').inputValue()).toBe("/");
  });

  test("the sign-in screen has no accessibility violations when enabled", async ({ page }) => {
    await page.goto(`${ORIGIN}/login`);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });

  /** Swap the session cookie, then wait until the browser really holds only the new one (a swap can lag behind). */
  const signIn = async (context: BrowserContext, email: string, name: string) => {
    const cookie = await sessionCookie(email, name);
    await context.clearCookies();
    await context.addCookies([cookie]);
    await expect
      .poll(async () => (await context.cookies(ORIGIN)).filter((c) => c.name === cookie.name).map((c) => c.value))
      .toEqual([cookie.value]);
  };
  const skip = (page: Page) => page.addInitScript(() => sessionStorage.setItem("docutile:entered", "1"));

  test("a signed-in account gets the app, sees its name, and its data is separate from other accounts", async ({ page, context }) => {
    await skip(page);
    await signIn(context, "alice@example.com", "Alice Example");
    await page.goto(`${ORIGIN}/login`);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible(); // already signed in: no sign-in screen
    await expect(page.getByText("Alice Example").first()).toBeVisible();
    await expect(page.getByText("alice@example.com").first()).toBeVisible();

    await page.goto(`${ORIGIN}/packs/new`);
    await page.locator("#pack-name").fill("Alice's pack");
    await page.locator("#pack-organisationName").fill("Acme");
    await page.getByRole("radio", { name: /Custom checklist/ }).check();
    await page.getByRole("button", { name: "Create pack" }).click();
    await page.waitForURL(/\/packs\/pack_/);

    const databases = async () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
    expect(await databases()).toContain(dbName("alice@example.com"));

    // Switch to a different Google account in the same browser: a different, empty database.
    await signIn(context, "bob@example.com", "Bob Example");
    await page.goto(`${ORIGIN}/`);
    await expect(page.getByText("Bob Example").first()).toBeVisible();
    await expect(page.getByText("No packs yet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alice's pack" })).toHaveCount(0);
    expect(await databases()).toEqual(expect.arrayContaining([dbName("alice@example.com"), dbName("bob@example.com")]));

    // And Alice's pack is still hers.
    await signIn(context, "alice@example.com", "Alice Example");
    await page.goto(`${ORIGIN}/`);
    await expect(page.getByRole("heading", { name: "Alice's pack" })).toBeVisible();
  });

  test("the first account to sign in takes over data saved before sign-in existed; later accounts start empty", async ({ page, context }) => {
    await skip(page);
    await page.goto(`${ORIGIN}/login`);
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("docutile", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore("packs", { keyPath: "id" }); db.createObjectStore("blobs"); db.createObjectStore("templates", { keyPath: "id" });
          db.createObjectStore("activity", { keyPath: "id" }); db.createObjectStore("settings");
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result; const ts = "2025-01-01T00:00:00.000Z";
          const tx = db.transaction(["packs"], "readwrite");
          tx.objectStore("packs").put({ id: "pack_before", name: "Saved before sign-in", organisationName: "Old Co", submissionType: "", referenceNumber: "", dueDate: "", notes: "", templateId: null, templateName: "Custom checklist", status: "draft", createdAt: ts, updatedAt: ts, exportedAt: null, slots: [] });
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        };
      });
      localStorage.removeItem("docutile:shared-data-claimed");
    });
    await signIn(context, "first@example.com", "First User");
    await page.goto(`${ORIGIN}/`);
    await expect(page.getByRole("heading", { name: "Saved before sign-in" })).toBeVisible();
    await signIn(context, "second@example.com", "Second User");
    await page.goto(`${ORIGIN}/`);
    await expect(page.getByText("No packs yet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saved before sign-in" })).toHaveCount(0);
  });

  test("signing out returns to the sign-in screen and locks the app again", async ({ page, context }) => {
    await skip(page);
    await signIn(context, "carol@example.com", "Carol Example");
    await page.goto(`${ORIGIN}/`);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    const res = await page.request.get(`${ORIGIN}/library`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
  });
});
