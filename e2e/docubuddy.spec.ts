import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const launcher = (p: Page) => p.getByRole("button", { name: "Docubuddy" });
const panel = (p: Page) => p.getByRole("dialog", { name: "Docubuddy assistant" });
const box = (p: Page) => p.getByLabel("Ask Docubuddy");
const log = (p: Page) => panel(p).getByRole("log", { name: "Conversation" });

async function open(p: Page) {
  await launcher(p).click();
  await expect(panel(p)).toBeVisible();
}
async function ask(p: Page, q: string) {
  await box(p).fill(q);
  await box(p).press("Enter");
}

async function createPack(p: Page, name: string, template: RegExp) {
  await p.goto("/packs/new");
  await p.locator("#pack-name").fill(name);
  await p.locator("#pack-organisationName").fill("Acme Ltd");
  await p.getByRole("radio", { name: template }).check();
  await p.getByRole("button", { name: "Create pack" }).click();
  await p.waitForURL(/\/packs\/pack_/);
}

test("opens from a button on every page, greets with examples, and closes with Escape or the X", async ({ page }) => {
  await page.goto("/");
  await expect(panel(page)).toHaveCount(0);
  await open(page);
  await expect(box(page)).toBeFocused();
  await expect(log(page)).toContainText("Hi, I'm Docubuddy");
  await expect(log(page)).toContainText("I never read your files, and nothing you type is sent anywhere");
  await expect(panel(page).getByRole("button", { name: "What is form J294?" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(launcher(page)).toBeFocused();

  for (const path of ["/templates", "/library", "/settings", "/packs/new"]) {
    await page.goto(path);
    await expect(launcher(page)).toBeVisible();
  }
  await open(page);
  await panel(page).getByRole("button", { name: "Close Docubuddy" }).click();
  await expect(panel(page)).toHaveCount(0);
});

test("answers a service question with its required documents, steps and source, and can start a pack", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await ask(page, "What do I need to report a deceased estate under R250 000?");
  await expect(log(page).getByText("Report a deceased estate: under R250 000").first()).toBeVisible();
  await expect(log(page)).toContainText("Required documents (");
  await expect(log(page)).toContainText("Death notice");
  await expect(log(page)).toContainText("Form J294");
  await expect(log(page)).toContainText("After you lodge the pack");
  await expect(log(page)).toContainText("not legal advice");
  const source = log(page).getByRole("link", { name: /Official source/ });
  await expect(source).toHaveAttribute("href", /justice\.gov\.za/);
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", /noopener/);

  // A follow-up that only makes sense because Docubuddy remembers the service.
  await log(page).getByRole("button", { name: "Where do I send it?" }).click();
  await expect(log(page)).toContainText("Sending: Report a deceased estate: under R250 000");
  await expect(log(page)).toContainText("Faxed documents are not accepted");
  await expect(log(page).getByRole("link", { name: /DOJ Online/ })).toHaveAttribute("href", "https://dojonline.justice.gov.za");

  // Start a pack goes to the right service, preselected, and tucks the panel away.
  await log(page).getByRole("link", { name: "Start a pack" }).first().click();
  await page.waitForURL(/\/packs\/new\?template=tpl_doj_estate_under_250k/);
  await expect(page.getByRole("radio", { name: /deceased estate: under R250 000/ })).toBeChecked();
  await expect(panel(page)).toHaveCount(0);
});

test("understands everyday words, asks when several services fit, and puts safety first", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await ask(page, "my father died last week");
  await expect(log(page)).toContainText("A few services fit. Which one do you mean?");
  await log(page).getByRole("button", { name: "Report a deceased estate: over R250 000" }).click();
  await expect(log(page)).toContainText("Required documents (5)");

  await ask(page, "my husband is abusing me");
  await expect(log(page)).toContainText("If you are in immediate danger, contact the police straight away");
  await log(page).getByRole("button", { name: "Apply for a protection order" }).click();
  await expect(log(page)).toContainText("Apply for a protection order");
  await expect(log(page)).toContainText("Required documents");

  await ask(page, "I want to start a business");
  await expect(log(page).getByRole("button", { name: /Register a private company: short standard MOI/ })).toBeVisible();
});

test("explains a form number and where it is used, and is honest about what it does not know", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await ask(page, "What is form J294?");
  await expect(log(page)).toContainText("Form J294 is the \"Death notice\" tile");
  await expect(log(page)).toContainText("Used in 3 services");
  await ask(page, "tell me about CoR39");
  await expect(log(page)).toContainText("Notice of change concerning a director");

  await ask(page, "what is form ZZ99");
  await expect(log(page)).toContainText("I couldn't match that to one of my checklists, and I'd rather say so than guess.");
  await ask(page, "can I sue my landlord");
  await expect(log(page)).toContainText("can't give legal advice");
  await ask(page, "purple monkey dishwasher");
  await expect(log(page).getByRole("link", { name: "Browse all services" }).last()).toHaveAttribute("href", "/templates");
});

test("knows the pack on screen: what is missing, and it updates as files are attached", async ({ page }) => {
  await createPack(page, "Estate of J Citizen", /deceased estate: over R250 000/);
  await open(page);
  await ask(page, "What's missing in my pack?");
  await expect(log(page)).toContainText("Estate of J Citizen");
  await expect(log(page)).toContainText("0 of 5 required documents are attached (0%)");
  await expect(log(page)).toContainText("Still missing (5)");
  await expect(log(page)).toContainText("Form J243");

  await page.locator("li[id^=slot-]").filter({ has: page.getByRole("heading", { name: "Death notice" }) }).locator("input[type=file]").first().setInputFiles(await pdfFile("secret-notice.pdf", 1));
  await expect(page.getByText("secret-notice.pdf").first()).toBeVisible();
  await ask(page, "how far am I?");
  await expect(log(page)).toContainText("1 of 5 required documents are attached (20%)");
  await expect(log(page)).toContainText("Still missing (4)");
  await expect(log(page)).not.toContainText("secret-notice.pdf"); // it never reads or repeats your files
  await expect(log(page).getByRole("link", { name: "Review and export" })).toHaveCount(0); // not ready, so no export offered
  await log(page).getByRole("link", { name: "Open this pack" }).last().click();
  await expect(panel(page)).toHaveCount(0);
});

test("lists what is due, soonest first", async ({ page }) => {
  await createPack(page, "Later pack", /General submission/);
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.locator("#edit-dueDate").fill("2099-12-31");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); // saved
  await createPack(page, "Soon pack", /General submission/);
  await page.getByRole("button", { name: "Edit details" }).click();
  const soon = new Date(Date.now() + 2 * 86_400_000);
  await page.locator("#edit-dueDate").fill(`${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); // saved
  await page.goto("/");
  await open(page);
  await ask(page, "what's due soon?");
  await expect(log(page)).toContainText("1 pack due within a week or overdue:");
  const names = await log(page).locator("ul").last().locator("li").allInnerTexts();
  expect(names[0]).toContain("Soon pack");
  expect(names[1]).toContain("Later pack");
});

test("runs entirely in the browser: asking questions sends nothing anywhere", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await page.waitForLoadState("networkidle");
  const requests: { method: string; url: string }[] = [];
  page.on("request", (r) => requests.push({ method: r.method(), url: r.url() }));
  for (const q of ["what do I need to register a company", "what is form J294", "where do I send it", "what's due", "can I sue"]) {
    await ask(page, q);
    await expect(log(page).getByText(q, { exact: true })).toBeVisible();
  }
  const origin = new URL(page.url()).origin;
  const leaks = requests.filter((r) => r.method !== "GET" || !r.url.startsWith(origin));
  expect(leaks, "requests that left the app or changed anything").toEqual([]);
});

test("whatever is typed is shown as plain text and never run as HTML", async ({ page }) => {
  await page.goto("/");
  await open(page);
  const attack = "<img src=x onerror=\"window.__pwned=1\"> <script>window.__pwned=1</script> abuse";
  await ask(page, attack);
  await expect(log(page).getByText(attack, { exact: true })).toBeVisible(); // literal text, tags and all
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(await log(page).locator("img, script").count()).toBe(0);
});

test("clearing starts over, and the question box limits what can be typed", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await ask(page, "register a trade mark");
  await expect(log(page)).toContainText("Register a trade mark");
  await panel(page).getByRole("button", { name: "Clear the conversation" }).click();
  await expect(log(page)).not.toContainText("Register a trade mark");
  await expect(log(page)).toContainText("Hi, I'm Docubuddy");
  expect(await box(page).getAttribute("maxlength")).toBe("300");
  await expect(panel(page).getByRole("button", { name: "Send" })).toBeDisabled(); // nothing typed
});

test("fits a phone screen, and the carousel never floats above it", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.locator(".ring-stage")).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
  await open(page);
  await ask(page, "what is form J294");
  const b = (await panel(page).boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(360);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // The element at the middle of the panel is the panel (or something in it), not a carousel tile.
  const topmost = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest("[aria-label='Docubuddy assistant']"), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
  expect(topmost).toBe(true);
});

test("passes the accessibility audit, closed and open, in both themes", async ({ page }) => {
  const check = async (label: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), label).toEqual([]);
  };
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((t) => localStorage.setItem("docutile:theme", t), theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".ring-stage")).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
    await check(`launcher (${theme})`);
    await open(page);
    await check(`greeting (${theme})`);
    await ask(page, "what do I need to report a deceased estate under R250 000");
    await expect(log(page)).toContainText("Required documents (");
    await check(`service answer (${theme})`);
    await ask(page, "my husband is abusing me");
    await check(`choices with a safety note (${theme})`);
    await page.keyboard.press("Escape");
  }
});
