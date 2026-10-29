import { expect, test, type Page } from "@playwright/test";
import { pdfFile } from "./fixtures";
import { skipSplash } from "./skip-splash";

test.beforeEach(({ page }) => skipSplash(page));

const explorer = (p: Page) => p.getByRole("region", { name: "Start a pack" });
const tile = (p: Page, name: string) => p.locator("li[id^=slot-]").filter({ has: p.getByRole("heading", { name }) });

test("CIPC is a category in the explorer, with eleven groups and the directors service inside", async ({ page }) => {
  await page.goto("/");
  await explorer(page).getByRole("button", { name: "List" }).click();
  await explorer(page).getByRole("button", { name: /Category CIPC \d+ services/ }).click();
  await expect(explorer(page).getByRole("heading", { name: /Choose a group in CIPC/ })).toBeVisible();
  for (const group of ["Register a company", "Company names", "Company changes", "Close corporations", "Conversions", "Winding up and deregistration", "Business rescue", "Trade marks", "Patents", "Designs", "Copyright"]) {
    await expect(explorer(page).getByRole("button", { name: new RegExp(`CIPC ${group} \\d+ service`) })).toHaveCount(1);
  }

  await explorer(page).getByRole("button", { name: /CIPC Company changes/ }).click();
  await explorer(page).getByRole("button", { name: /Change a company's directors/ }).click();
  await expect(explorer(page).getByText("After you lodge the pack")).toBeVisible();
  await expect(explorer(page).getByText(/File the change on CIPC's e-Services/)).toBeVisible();
  await expect(explorer(page).getByRole("link", { name: /CIPC: contact details, forms and supporting documents/ })).toHaveAttribute("href", /cipc\.co\.za/);

  await explorer(page).getByRole("button", { name: /Form CoR39 Notice of change concerning a director/ }).click();
  const detail = explorer(page).getByRole("article", { name: "Notice of change concerning a director" });
  await expect(detail).toContainText("Required");
  await expect(detail).toContainText("Form CoR39");
  await detail.getByRole("button", { name: "Back to documents" }).click();
  await expect(explorer(page).getByRole("button", { name: /Proof of death Optional/ })).toBeVisible();
});

test("the services catalogue lists every CIPC service by group, with its form numbers", async ({ page }) => {
  await page.goto("/templates");
  await expect(page.getByRole("heading", { name: /^CIPC/ }).first()).toContainText("58 services");
  for (const [group, count] of [["Register a company", 7], ["Company names", 3], ["Company changes", 11], ["Close corporations", 2], ["Conversions", 4], ["Winding up and deregistration", 5], ["Business rescue", 5], ["Trade marks", 11], ["Patents", 4], ["Designs", 5], ["Copyright", 1]] as const) {
    await expect(page.getByRole("heading", { name: new RegExp(`^${group}`) })).toContainText(`${count} service`);
  }
  const card = page.locator("li").filter({ has: page.getByRole("heading", { name: "Reinstate a deregistered company or close corporation" }) });
  await card.getByText(/Document tiles/).click();
  await expect(card.getByText("[CoR40.5]")).toBeVisible();
});

test("a CIPC pack is ready only when its required documents are attached", async ({ page }) => {
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Acme registration");
  await page.locator("#pack-organisationName").fill("Acme (Pty) Ltd");
  await page.getByRole("radio", { name: /Register a private company: short standard MOI/ }).check();
  await expect(page.getByRole("link", { name: /CIPC: contact details, forms and supporting documents/ })).toBeVisible();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);

  await expect(page.getByRole("heading", { name: "After you lodge the pack" })).toBeVisible();
  await expect(page.getByText("companydocs@cipc.co.za").first()).toBeVisible();
  await expect(page.getByText("0 of 5 required").first()).toBeVisible();
  await expect(tile(page, "Notice of incorporation").getByText("Form CoR14.1")).toBeVisible();
  await expect(tile(page, "Confirmation of name reservation").getByText("Optional")).toBeVisible();

  const required = ["Notice of incorporation", "Memorandum of Incorporation: short standard form", "Annexure A: initial directors", "Certified ID copy of applicant", "Certified ID copies of incorporators and directors"];
  for (const [i, name] of required.entries()) {
    await tile(page, name).locator("input[type=file]").first().setInputFiles(await pdfFile(`cipc${i}.pdf`, 1));
    await expect(tile(page, name).getByText(`cipc${i}.pdf`).first()).toBeVisible();
    if (i < required.length - 1) await expect(page.getByText("Not ready")).toBeVisible();
  }
  await expect(page.getByText("Ready: all required")).toBeVisible();
});

test("CIPC has its own glow in the carousel and its tile is reachable by keyboard", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator(".ring-stage").first();
  await expect(stage).toHaveAttribute("data-settled", "true", { timeout: 10_000 });
  const cipc = stage.getByRole("button", { name: /Category CIPC/ });
  await expect(cipc).toHaveCount(1);
  expect(await cipc.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--glow"))).toBe("251 191 36"); // amber, unlike the other categories
  const glows = await stage.locator("button.ring-tile").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.getPropertyValue("--glow")));
  expect(new Set(glows).size).toBe(glows.length);
});

test("intellectual property services show what CIPC says to attach, and the next steps", async ({ page }) => {
  await page.goto("/");
  await explorer(page).getByRole("button", { name: "List" }).click();
  await explorer(page).getByRole("button", { name: /Category CIPC \d+ services/ }).click();
  await explorer(page).getByRole("button", { name: /CIPC Trade marks \d+ service/ }).click();
  await expect(explorer(page).getByRole("heading", { name: /Choose a service in Trade marks/ })).toBeVisible();
  await explorer(page).getByRole("button", { name: /Record the assignment of a trade mark/ }).click();

  // The three things CIPC's maintenance page says an assignment needs.
  await expect(explorer(page).getByRole("button", { name: /Form TM6 Application to record a transaction/ })).toBeVisible();
  await expect(explorer(page).getByRole("button", { name: /Deed of assignment Required/ })).toBeVisible();
  await expect(explorer(page).getByRole("button", { name: /Power of attorney Required/ })).toBeVisible();
  await expect(explorer(page).getByText(/within 12 months of the effective date/)).toBeVisible();
  await expect(explorer(page).getByRole("link", { name: /CIPC: maintain a trade mark/ })).toHaveAttribute("href", /cipc\.co\.za/);
});

test("an application form's tick-list is explained, and only its core items are required", async ({ page }) => {
  await page.goto("/packs/new");
  await page.locator("#pack-name").fill("Patent for the widget");
  await page.locator("#pack-organisationName").fill("Acme Ltd");
  await page.getByRole("radio", { name: /Apply for a patent/ }).check();
  await expect(page.getByText(/lists what it may be accompanied by, as a tick-list/).first()).toBeVisible();
  await page.getByRole("button", { name: "Create pack" }).click();
  await page.waitForURL(/\/packs\/pack_/);
  await expect(page.getByText("0 of 2 required").first()).toBeVisible(); // the P1 and the specification
  await expect(tile(page, "Application for a patent").getByText("Form P1")).toBeVisible();
  await expect(tile(page, "Request for ante-dating").getByText("Optional")).toBeVisible();
  await expect(page.getByText(/customer, deposit funds, search patents online/)).toBeVisible();
});
