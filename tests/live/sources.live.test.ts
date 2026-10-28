import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PORTALS } from "@/lib/portals";
import { CIPC_TEMPLATES } from "@/lib/templates/cipc";
import { DOJ_TEMPLATES } from "@/lib/templates/doj";
import { SOURCES } from "@/lib/templates/sources";
import { cipcFormsSection, cipcMainText, formTokensFor, htmlToText, pageUpdatedIso, templateDateIso } from "@/lib/sources/tokens";

const TEMPLATES = [...DOJ_TEMPLATES, ...CIPC_TEMPLATES];

/**
 * Re-reads every official page and PDF the DOJ and CIPC checklists were transcribed from and reports drift:
 *  - a source is unreachable or empty
 *  - a form named in a checklist no longer appears on any official page
 *  - a page's own "Updated:" date moved past the one recorded in the template
 *  - the set of form numbers on a page changed since the saved snapshot (a form was added or removed)
 * Run with `npm run check:sources`. After reviewing a change and updating the checklists, refresh the snapshot with
 * `npm run check:sources:update`. Needs `curl`; PDF sources also need `pdftotext` (poppler-utils) and are skipped without it.
 */
const SNAPSHOT = path.join(__dirname, "source-snapshot.json");
const UPDATE = process.env.UPDATE_SNAPSHOT === "1";
const UA = "Mozilla/5.0 (compatible; DocutileSourceCheck/1.0)";

const hasPdftotext = (() => {
  try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); return true; } catch { return false; }
})();

interface Fetched { url: string; ok: boolean; skipped?: string; error?: string; text: string; tokens: string[] }

/** One download, tried up to three times: official sites sometimes reset a connection. Status 0 means no answer at all. */
function curl(url: string, out?: string): { status: number; body: string } {
  const args = ["-sSL", "--max-time", "90", "-A", UA, "-w", "\n%{http_code}"];
  if (out) args.push("-o", out);
  let last = { status: 0, body: "" };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = execFileSync("curl", [...args, url], { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
      const nl = res.lastIndexOf("\n");
      last = { status: Number(res.slice(nl + 1)), body: res.slice(0, nl) };
      if (last.status !== 0) return last;
    } catch (e) {
      last = { status: 0, body: String((e as Error).message) };
    }
    execFileSync("sleep", [String(2 * (attempt + 1))]);
  }
  return last;
}

function fetchSource(url: string): Fetched {
  const isPdf = url.toLowerCase().endsWith(".pdf");
  if (isPdf && !hasPdftotext) return { url, ok: true, skipped: "pdftotext is not installed", text: "", tokens: [] };
  if (isPdf) {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "docutile-src-")), "doc.pdf");
    const { status, body } = curl(url, tmp);
    if (status !== 200) return { url, ok: false, error: `HTTP ${status} ${body.slice(0, 120)}`, text: "", tokens: [] };
    const text = execFileSync("pdftotext", ["-layout", tmp, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return { url, ok: text.trim().length > 50, error: text.trim().length > 50 ? undefined : "empty PDF text", text, tokens: formTokensFor(url, text) };
  }
  const { status, body } = curl(url);
  if (status !== 200) return { url, ok: false, error: `HTTP ${status}`, text: "", tokens: [] };
  const text = htmlToText(body);
  if (CIPC_FORMS_PAGES.includes(url)) {
    // Only the forms list counts: the rest of a CIPC page also names forms, so it would hide a form that was removed.
    const section = cipcFormsSection(text);
    return { url, ok: !!section && section.length > 200, error: section ? undefined : 'no "FORM CODE" list found: the page layout changed', text, tokens: section ? formTokensFor(url, section) : [] };
  }
  // CIPC pages carry popups that name forms after the main content; leave them out of the form numbers.
  const isCipc = /(^|\.)cipc\.co\.za\//i.test(url);
  return { url, ok: text.length > 200, error: text.length > 200 ? undefined : "page text is almost empty", text, tokens: formTokensFor(url, isCipc ? cipcMainText(text) : text) };
}

/** CIPC's current forms pages: the checklists name forms from a 2021 list, so check them against these too. */
const CIPC_FORMS_PAGES = [
  SOURCES.cipcCompanyForms.url, SOURCES.cipcCloseCorpForms.url,
  SOURCES.cipcTmForms.url, SOURCES.cipcPatentForms.url, SOURCES.cipcDesignForms.url, SOURCES.cipcCopyrightForms.url,
];
/** Forms named in CIPC's supporting-documents list, its application forms or its "maintain" pages but not carried on its forms pages. */
const NOT_ON_FORMS_PAGES = new Set(["COR94", "CR1", "CR4", "CR5", "CR8", "JM12", "P9", "D18"]);

const urls = [...new Set([...TEMPLATES.map((t) => t.source!.url), ...CIPC_FORMS_PAGES])].sort();
const fetched = new Map<string, Fetched>();

beforeAll(() => { for (const u of urls) fetched.set(u, fetchSource(u)); });

describe("official DOJ and CIPC sources", () => {
  it("are all reachable and readable", () => {
    const bad = [...fetched.values()].filter((f) => !f.ok).map((f) => `${f.url}: ${f.error}`);
    expect(bad, "unreachable or empty sources").toEqual([]);
  });

  it("still list every form number the checklists name", () => {
    const union = new Set([...fetched.values()].flatMap((f) => f.tokens));
    const missing = TEMPLATES.flatMap((t) =>
      t.slots.flatMap((s) => formTokensFor(t.source!.url, s.formRef ?? "").filter((tok) => !union.has(tok)).map((tok) => `${t.id} / ${s.name}: ${tok}`)),
    );
    expect(missing, "forms no longer found on any official page").toEqual([]);
  });

  it("still carry every CIPC form on CIPC's current forms pages", () => {
    const onPages = new Set(CIPC_FORMS_PAGES.flatMap((u) => fetched.get(u)?.tokens ?? []));
    expect(onPages.size, "CIPC forms pages should list forms").toBeGreaterThan(30);
    const missing = CIPC_TEMPLATES.flatMap((t) =>
      t.slots.flatMap((s) => formTokensFor(t.source!.url, s.formRef ?? "").filter((tok) => !NOT_ON_FORMS_PAGES.has(tok) && !onPages.has(tok)).map((tok) => `${t.id} / ${s.name}: ${tok}`)),
    );
    expect(missing, "CIPC forms not on CIPC's current forms pages").toEqual([]);
  });

  it("have not been updated past the date recorded in the checklist", () => {
    const drift: string[] = [];
    for (const t of TEMPLATES) {
      const f = fetched.get(t.source!.url);
      if (!f || !f.text || !t.source!.pageUpdated) continue;
      const live = pageUpdatedIso(f.text);
      const recorded = templateDateIso(t.source!.pageUpdated);
      if (live && recorded && live !== recorded) drift.push(`${t.id}: page now says Updated ${live}, checklist recorded ${recorded}`);
    }
    expect(drift, "page update stamps changed: re-read the page and update the checklist").toEqual([]);
  });

  it("list the same form numbers as the saved snapshot", () => {
    const current: Record<string, string[]> = {};
    for (const f of fetched.values()) if (f.text) current[f.url] = f.tokens;
    if (UPDATE || !fs.existsSync(SNAPSHOT)) {
      fs.writeFileSync(SNAPSHOT, JSON.stringify({ takenOn: new Date().toISOString().slice(0, 10), sources: current }, null, 2) + "\n");
      return;
    }
    const saved = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")) as { sources: Record<string, string[]> };
    const changes: string[] = [];
    for (const [url, tokens] of Object.entries(current)) {
      const before = saved.sources[url];
      if (!before) { changes.push(`${url}: new source, not in snapshot`); continue; }
      const added = tokens.filter((x) => !before.includes(x));
      const removed = before.filter((x) => !tokens.includes(x));
      if (added.length || removed.length) changes.push(`${url}: added [${added.join(", ")}] removed [${removed.join(", ")}]`);
    }
    expect(changes, "form numbers on official pages changed: review the checklists, then run `npm run check:sources:update`").toEqual([]);
  });
});

describe("official portals", () => {
  const status = (url: string) => curl(url).status;

  it("still answer, and are still listed on the official page that names them", () => {
    const unreachable: string[] = [];
    const notListed: string[] = [];
    const unverified: string[] = [];
    const listedBodies = new Map<string, string>();
    for (const p of PORTALS) {
      const code = status(p.url);
      if (code === 0) unverified.push(p.url); // no answer here (for example a certificate this machine cannot check): not proof it is down
      else if (code >= 400) unreachable.push(`${p.url}: HTTP ${code}`);
      if (!listedBodies.has(p.listedOn)) listedBodies.set(p.listedOn, curl(p.listedOn).body);
      const host = new URL(p.url).hostname;
      if (!listedBodies.get(p.listedOn)!.includes(host)) notListed.push(`${p.id}: ${p.listedOn} no longer mentions ${host}`);
    }
    if (unverified.length) console.warn(`Portals not verified from this machine (no answer): ${unverified.join(", ")}`);
    expect(unreachable, "portals returning an error").toEqual([]);
    expect(notListed, "portals the official pages no longer mention").toEqual([]);
  });
});

