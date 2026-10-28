import { describe, expect, it } from "vitest";
import { answer, indexForms, type Context } from "@/lib/docubuddy/answer";
import { judge, searchServices } from "@/lib/docubuddy/search";
import { expandedTerms, stem, terms, words } from "@/lib/docubuddy/text";
import type { Block, Reply } from "@/lib/docubuddy/types";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";
import { createPack } from "@/lib/packs";
import { file } from "./helpers";
import type { Pack } from "@/types";

const templates = BUILT_IN_TEMPLATES;
const byId = (id: string) => templates.find((t) => t.id === id)!;
const ctx = (over: Partial<Context> = {}): Context => ({ templates, packs: [], now: new Date("2026-03-10T10:00:00"), ...over });

/** All the words a reply shows, for checking what it says. */
function say(r: Reply): string {
  const parts: string[] = [];
  for (const b of r.blocks) {
    if (b.type === "heading" || b.type === "text") parts.push(b.text);
    else if (b.type === "list") parts.push(...b.items.flatMap((i) => [i.text, i.badge ?? "", i.detail ?? ""]));
    else parts.push(...b.actions.map((a) => a.label));
  }
  return parts.join("\n");
}
const blocksOf = (r: Reply, type: Block["type"]) => r.blocks.filter((b) => b.type === type);
const actionsOf = (r: Reply) => r.blocks.flatMap((b) => (b.type === "actions" ? b.actions : []));

function makePack(templateId: string, name: string, over: Partial<Pack> = {}): Pack {
  const p = createPack({ name, organisationName: "Acme Ltd", submissionType: "", referenceNumber: "", dueDate: "", notes: "" }, byId(templateId));
  return { ...p, id: `pack_${name.replace(/\W/g, "")}`, ...over };
}

describe("Docubuddy text tools", () => {
  it("splits words without accents or apostrophes, and stems lightly", () => {
    expect(words("Guardian’s Fund, déjà-vu!")).toEqual(["guardians", "fund", "deja", "vu"]);
    expect(stem("directors")).toBe("director");
    expect(stem("registering")).toBe("register");
    expect(stem("policies")).toBe("policy");
    expect(stem("class")).toBe("class");
    expect(terms("What do I need to register a company?")).toEqual(["register", "company"]);
  });
  it("turns everyday wording into the checklists' wording, with specific phrases counting fully", () => {
    expect(expandedTerms("my father died").related).toEqual(expect.arrayContaining([stem("deceased"), "estate"]));
    expect(expandedTerms("close my company").direct).toEqual(expect.arrayContaining(["deregister", "wind"]));
    expect(expandedTerms("I want to start a business").direct).toEqual(expect.arrayContaining(["register", "company"]));
    expect(expandedTerms("do you have a form for it").direct).toEqual([]); // "form" alone says nothing about which service
  });
});

describe("Docubuddy finds the right service for everyday questions", () => {
  const top = (q: string, n = 1) => searchServices(q, templates, n).map((m) => m.template.id);
  it.each([
    ["register a trade mark", "tpl_cipc_tm_register"],
    ["how do I get a protection order", "tpl_doj_protection_order"],
    ["my husband is abusing me", "tpl_doj_protection_order"],
    ["child support", "tpl_doj_maintenance"],
    ["apply for maintenance", "tpl_doj_maintenance"],
    ["change directors", "tpl_cipc_directors"],
    ["a director resigned", "tpl_cipc_directors"],
    ["the company needs a new address", "tpl_cipc_registered_office"],
    ["patent my invention", "tpl_cipc_patent_apply"],
    ["protect my brand logo", "tpl_cipc_tm_register"],
    ["reserve a company name", "tpl_cipc_name_reserve"],
    ["convert close corporation to company", "tpl_cipc_cc_to_company"],
    ["deregister my company", "tpl_cipc_deregister"],
    ["copyright for a film", "tpl_cipc_copyright_film"],
    ["supplier onboarding", "tpl_supplier"],
    ["client onboarding", "tpl_client"],
    ["estate under R250 000", "tpl_doj_estate_under_250k"],
  ])("%s -> %s", (q, id) => {
    expect(top(q)[0]).toBe(id);
  });
  it("finds both estate services for someone who has lost a relative, and offers them as a choice", () => {
    for (const q of ["my father died last week what do I do", "someone passed away", "I lost my father", "report a deceased estate"]) {
      expect(top(q, 2).sort(), q).toEqual(["tpl_doj_estate_over_250k", "tpl_doj_estate_under_250k"]);
      expect(judge(searchServices(q, templates)), q).toBe("several");
    }
  });
  it("starting or closing a business points at company registration or winding up, not at business rescue", () => {
    expect(top("I want to start a business", 3).every((id) => id.startsWith("tpl_cipc_") && /private|profit|npc/.test(id))).toBe(true);
    expect(top("close my company", 3)).toContain("tpl_cipc_deregister");
    expect(top("close my company", 3)).toContain("tpl_cipc_wind_up_solvent");
  });
  it("finds nothing for words that match nothing", () => {
    expect(searchServices("purple monkey dishwasher", templates)).toEqual([]);
    expect(judge([])).toBe("none");
    expect(searchServices("", templates)).toEqual([]);
  });
});

describe("Docubuddy answers", () => {
  it("lists a service's required documents with form numbers, its source, next steps and a way to start a pack", () => {
    const r = answer("What do I need to report a deceased estate under R250 000?", ctx());
    const t = byId("tpl_doj_estate_under_250k");
    const required = t.slots.filter((s) => s.required);
    const body = say(r);
    expect(body).toContain(t.name);
    expect(body).toContain(`Required documents (${required.length})`);
    for (const s of required) expect(body).toContain(s.name);
    expect(body).toContain("Form J294");
    expect(body).toContain("After you lodge the pack");
    expect(body).toContain(t.source!.label);
    expect(body).toContain("not legal advice");
    const acts = actionsOf(r);
    expect(acts).toContainEqual({ kind: "link", label: "Start a pack", href: `/packs/new?template=${t.id}` });
    expect(acts).toContainEqual({ kind: "external", label: "Official source", href: t.source!.url });
    expect(r.focus).toEqual({ templateId: t.id });
  });
  it("is honest when a checklist is only partly published", () => {
    const r = answer("apply for a patent", ctx());
    expect(say(r)).toContain("Partly published");
    expect(blocksOf(r, "text").some((b) => b.type === "text" && b.tone === "warn")).toBe(true);
  });
  it("asks which service when several fit, instead of guessing", () => {
    const r = answer("someone passed away", ctx());
    const acts = actionsOf(r).filter((a) => a.kind === "ask");
    expect(acts.map((a) => (a.kind === "ask" ? a.focus?.templateId : ""))).toEqual(expect.arrayContaining(["tpl_doj_estate_over_250k", "tpl_doj_estate_under_250k"]));
    expect(say(r)).not.toContain("Required documents");
  });
  it("explains a form and where it is used", () => {
    const r = answer("What is form J294?", ctx());
    expect(say(r)).toContain("Form J294");
    expect(say(r)).toContain("Death notice");
    expect(say(r)).toContain("Report a deceased estate");
    expect(answer("CoR39", ctx()).blocks.length).toBeGreaterThan(2);
    expect(say(answer("tell me about form cor 14.1", ctx()))).toContain("Notice of incorporation");
  });
  it("does not treat a number-like word as a form unless the checklists really have it", () => {
    expect(say(answer("what is form ZZ99", ctx()))).toContain("couldn't match");
    expect(indexForms(templates).has("J294")).toBe(true);
    expect(indexForms(templates).has("ZZ99")).toBe(false);
  });
  it("answers help, greetings and thanks, and says it never reads files or sends anything anywhere", () => {
    for (const q of ["help", "hi", "hello docubuddy", "what can you do?", ""]) {
      const body = say(answer(q, ctx()));
      expect(body, q).toContain("Docubuddy");
      expect(body, q).toContain("never read your files");
    }
    expect(say(answer("thanks", ctx()))).toContain("welcome");
  });
  it("puts safety first when someone describes being harmed, and still shows what a protection order needs", () => {
    for (const q of ["my husband is abusing me", "my wife hits me", "I am scared of my ex"]) {
      const r = answer(q, ctx());
      expect(r.blocks[0], q).toEqual({ type: "text", text: expect.stringContaining("immediate danger"), tone: "warn" });
    }
    expect(say(answer("how do I get a protection order", ctx()))).not.toContain("immediate danger"); // only when harm is described
  });
  it("declines legal advice, without guessing", () => {
    const body = say(answer("Can I sue my landlord?", ctx()));
    expect(body).toContain("can't give legal advice");
    expect(body).not.toContain("Required documents");
  });
  it("admits when it does not know, and offers the closest things it does know", () => {
    const none = answer("purple monkey dishwasher", ctx());
    expect(say(none)).toContain("couldn't match");
    expect(actionsOf(none)).toContainEqual({ kind: "link", label: "Browse all services", href: "/templates" });
    const near = answer("water", ctx());
    expect(say(near)).toContain("couldn't match");
  });
});

describe("Docubuddy and the user's packs", () => {
  const t = byId("tpl_doj_estate_over_250k");
  const pack = makePack(t.id, "Estate of J Citizen", { dueDate: "2026-03-12" });
  const withDeath = { ...pack, slots: pack.slots.map((s) => (s.name === "Death notice" ? { ...s, files: [file("notice.pdf")] } : s)) };

  it("says what is missing from the pack on screen, with form numbers and the due date", () => {
    const r = answer("What's missing in my pack?", ctx({ packs: [withDeath], currentPackId: withDeath.id }));
    const body = say(r);
    expect(body).toContain("Estate of J Citizen");
    expect(body).toContain("1 of 5 required documents are attached (20%)");
    expect(body).toContain("Due in 2 days");
    expect(body).toContain("Still missing (4)");
    expect(body).toContain("Death certificate");
    expect(body).toContain("Form J243");
    expect(body).not.toContain("Death notice\n"); // already attached
    expect(actionsOf(r)).toContainEqual({ kind: "link", label: "Open this pack", href: `/packs/${withDeath.id}` });
    expect(actionsOf(r).some((a) => a.kind === "link" && a.label === "Review and export")).toBe(false); // not ready
    expect(r.focus?.packId).toBe(withDeath.id);
  });
  it("uses the only pack when there is one, and asks which when there are several", () => {
    expect(say(answer("how far am I?", ctx({ packs: [withDeath] })))).toContain("Estate of J Citizen");
    const other = makePack("tpl_general", "Other pack");
    const r = answer("what's missing in my pack?", ctx({ packs: [withDeath, other] }));
    expect(say(r)).toContain("Which pack do you mean?");
    expect(actionsOf(r).filter((a) => a.kind === "ask").length).toBe(2);
    // naming the pack settles it
    expect(say(answer("what is missing from Other pack", ctx({ packs: [withDeath, other] })))).toContain("Other pack");
  });
  it("tells you when you have no packs yet", () => {
    expect(say(answer("what's missing in my pack?", ctx()))).toContain("don't have any packs");
  });
  it("never calls a pack ready while a required document is missing, and offers export only when it is ready", () => {
    const body = say(answer("is my pack ready?", ctx({ packs: [withDeath], currentPackId: withDeath.id })));
    expect(body).not.toContain("Every required document is attached");
    const done = { ...pack, slots: pack.slots.map((s) => (s.required ? { ...s, files: [file(`${s.id}.pdf`)] } : s)) };
    const r = answer("is my pack ready?", ctx({ packs: [done], currentPackId: done.id }));
    expect(say(r)).toContain("Every required document is attached");
    expect(actionsOf(r)).toContainEqual({ kind: "link", label: "Review and export", href: `/packs/${done.id}/review` });
  });
  it("says a waiting note does not count", () => {
    const waiting = { ...withDeath, slots: withDeath.slots.map((s) => (s.name === "Death certificate" ? { ...s, waiting: { note: "Applied at Home Affairs", expectedBy: "2026-03-20", since: "2026-03-01T00:00:00Z" } } : s)) };
    const body = say(answer("what's missing in my pack?", ctx({ packs: [waiting], currentPackId: waiting.id })));
    expect(body).toContain("Waiting: Applied at Home Affairs");
    expect(body).toContain("does not count as a document");
  });
  it("lists what is due, soonest first, and handles no packs and no due dates", () => {
    const later = makePack("tpl_general", "Later pack", { dueDate: "2026-04-30" });
    const overdue = makePack("tpl_general", "Overdue pack", { dueDate: "2026-03-01" });
    const r = answer("what's due soon?", ctx({ packs: [later, withDeath, overdue] }));
    const items = (blocksOf(r, "list")[0] as Extract<Block, { type: "list" }>).items.map((i) => i.text);
    expect(items).toEqual(["Overdue pack", "Estate of J Citizen", "Later pack"]);
    expect(say(r)).toContain("Overdue by 9 days");
    expect(say(answer("what is due?", ctx()))).toContain("nothing is due");
    expect(say(answer("anything due?", ctx({ packs: [makePack("tpl_general", "No date")] })))).toContain("None of your packs has a due date");
  });
  it("says where to send a pack: the service's steps and the official portals for its category", () => {
    const r = answer("Where do I send it?", ctx({ packs: [pack], currentPackId: pack.id }));
    const body = say(r);
    expect(body).toContain("Report the estate within 14 days");
    expect(body).toContain("Faxed documents are not accepted");
    expect(actionsOf(r)).toContainEqual({ kind: "external", label: "DOJ Online", href: "https://dojonline.justice.gov.za" });
    // after a service answer, "where do I send it?" means that service
    const first = answer("register a trade mark", ctx());
    const follow = answer("where do I send it", ctx({ focus: first.focus }));
    expect(say(follow)).toContain("Sending: Register a trade mark");
    expect(actionsOf(follow).some((a) => a.kind === "external" && a.href.includes("iponline.cipc.co.za"))).toBe(true);
  });
  it("asks which service when it cannot tell, and never invents submission details", () => {
    const r = answer("where do I send it?", ctx());
    expect(say(r)).toContain("depends on the service");
    const general = answer("where do I send supplier onboarding", ctx());
    expect(say(general)).toContain("don't give submission details");
    expect(actionsOf(general).some((a) => a.kind === "external")).toBe(false); // General business has no portal
  });
});

describe("Docubuddy replies are plain data", () => {
  it("never contains markup, and every link goes to Docutile or an official https site", () => {
    const questions = ["help", "what is form J294", "register a trade mark", "report a deceased estate", "where do I send it", "what's due", "<script>alert(1)</script>", "<img src=x onerror=alert(1)> abuse"];
    for (const q of questions) {
      const r = answer(q, ctx({ packs: [makePack("tpl_general", "<b>Bold</b> pack")] }));
      for (const a of actionsOf(r)) {
        if (a.kind === "link") expect(a.href.startsWith("/"), a.href).toBe(true);
        if (a.kind === "external") expect(new URL(a.href).protocol, a.href).toBe("https:");
      }
      // Whatever the user typed is never echoed back as part of a reply.
      expect(say(r)).not.toContain("<script>");
      expect(say(r)).not.toContain("onerror");
    }
  });
  it("gives the same answer to the same question", () => {
    expect(answer("register a company", ctx())).toEqual(answer("register a company", ctx()));
  });
});
