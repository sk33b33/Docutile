import { dueStatus, sortPacks } from "../due";
import { formatDate, formLabel } from "../format";
import { portalsFor } from "../portals";
import { CHECKLIST_LABEL } from "../templates/categories";
import { computeCompleteness } from "../validation/pack";
import { judge, searchServices, type ServiceMatch } from "./search";
import { words } from "./text";
import type { Action, Block, Focus, ListItem, Reply } from "./types";
import type { Pack, Template, TemplateSlot } from "@/types";

export interface Context {
  templates: Template[];
  packs: Pack[];
  /** The pack open on screen, if any. */
  currentPackId?: string;
  /** Carried over from the last answer. */
  focus?: Focus;
  now?: Date;
}

const DISCLAIMER = "Requirements change, so confirm with the receiving office before you lodge. This is a preparation aid, not legal advice.";
const PRIVACY = "I run in your browser and use only Docutile's own checklists. I never read your files, and nothing you type is sent anywhere.";

const text = (t: string, tone?: "normal" | "note" | "warn"): Block => ({ type: "text", text: t, tone });
const heading = (t: string): Block => ({ type: "heading", text: t });
const list = (items: ListItem[], ordered = false): Block => ({ type: "list", items, ordered });
const actions = (a: Action[]): Block => ({ type: "actions", actions: a });
const ask = (label: string, q: string, focus?: Focus): Action => ({ kind: "ask", label, text: q, focus });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const slotItem = (s: TemplateSlot): ListItem => ({ text: s.name, badge: s.formRef ? formLabel(s.formRef) : undefined });

// ---------------------------------------------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------------------------------------------

type Intent = "help" | "greeting" | "thanks" | "legal" | "form" | "due" | "pack" | "where" | "service";

const FORM_PATTERN = /\b[A-Za-z]{1,4}\s?\d{1,3}(?:\.\d)?[A-Za-z]?(?:\s?\([A-Za-z]\))?/g;
const normForm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Every form number the checklists name, mapped to the tiles that carry it. */
export function indexForms(templates: Template[]): Map<string, { ref: string; template: Template; slot: TemplateSlot }[]> {
  const map = new Map<string, { ref: string; template: Template; slot: TemplateSlot }[]>();
  for (const template of templates) {
    for (const slot of template.slots) {
      for (const m of (slot.formRef ?? "").match(FORM_PATTERN) ?? []) {
        const key = normForm(m);
        map.set(key, [...(map.get(key) ?? []), { ref: m.trim(), template, slot }]);
      }
    }
  }
  return map;
}

const has = (q: string, re: RegExp) => re.test(q);

/** Words of a "where do I send it?" question that carry no information about which service it is. */
const WHERE_WORDS = new Set("where how send sending sent submit submitting lodge lodging hand post posting email mail file filing deliver portal portals login log sign in online apply give it them this that do i does the a to can".split(" "));

function detectIntent(q: string, ctx: Context, forms: ReturnType<typeof indexForms>): Intent {
  const n = words(q).join(" ");
  if (n === "") return "help";
  if (has(n, /^(hi|hello|hey|howzit|hallo|good (morning|afternoon|evening))( docubuddy| there)?$/)) return "greeting";
  if (has(n, /^(thanks|thank you|cheers|ta|great thanks|ok thanks|awesome|perfect)( docubuddy| so much)?$/)) return "thanks";
  if (has(n, /\b(help|what can you do|what do you do|who are you|how do you work|how does this work)\b/) && n.split(" ").length <= 8) return "help";
  if (has(n, /\b(sue|lawsuit|legal advice|is it legal|will i win|my rights|lawyer advice|should i take (him|her|them) to court|is this fraud)\b/)) return "legal";
  const typed = (q.match(FORM_PATTERN) ?? []).map(normForm).filter((k) => forms.has(k));
  if (typed.length > 0 && (has(n, /\b(form|what|explain|mean|means|is|about)\b/) || n.split(" ").length <= 3)) return "form";
  const packWords = has(n, /\b(my|this|our)\b.*\b(pack|packs|application|submission|checklist|documents?)\b|\b(pack|packs)\b/);
  if (has(n, /\b(due|deadline|deadlines|overdue|expires?|expiring)\b/) && (packWords || has(n, /^(what|which|anything|is anything|whats)\b/) || n.split(" ").length <= 4)) return "due";
  const statusWords = has(n, /\b(missing|left|remaining|outstanding|incomplete|complete|completed|ready|status|progress|still need|whats next|next step|next steps|how far|am i done|what now)\b/);
  if (statusWords && (packWords || ctx.currentPackId || ctx.focus?.packId || has(n, /\b(i|am i|do i)\b/))) return "pack";
  if (has(n, /\b(where|how)\b.*\b(send|submit|lodge|hand in|post|email|mail|file|deliver|apply)\b|\b(portal|portals|log ?in|sign ?in|online)\b|\bwho do i (send|submit|give)\b/)) return "where";
  return "service";
}

// ---------------------------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------------------------

function helpReply(): Reply {
  return {
    blocks: [
      text("Hi, I'm Docubuddy. I help you find out what a pack needs, using Docutile's own checklists. Ask me things like:"),
      list([
        { text: "What do I need to report a deceased estate?" },
        { text: "What is form J294?" },
        { text: "I want to register a company" },
        { text: "What's missing in my pack?" },
        { text: "What's due soon?" },
        { text: "Where do I send it?" },
      ]),
      actions([
        ask("What do I need to report a deceased estate?", "What do I need to report a deceased estate?"),
        ask("What is form J294?", "What is form J294?"),
        ask("What's missing in my pack?", "What's missing in my pack?"),
        ask("What's due soon?", "What's due soon?"),
      ]),
      text(PRIVACY, "note"),
    ],
  };
}

function serviceReply(t: Template): Reply {
  const required = t.slots.filter((s) => s.required);
  const optional = t.slots.filter((s) => !s.required);
  const blocks: Block[] = [
    heading(t.name),
    text(`${t.category}${t.subcategory ? ` › ${t.subcategory}` : ""}`, "note"),
    text(t.description),
    heading(`Required documents (${required.length})`),
    list(required.map(slotItem)),
  ];
  if (optional.length > 0) {
    const shown = optional.slice(0, 10);
    blocks.push(heading(`Optional, or only if it applies to you (${optional.length})`));
    blocks.push(list(shown.map(slotItem)));
    if (optional.length > shown.length) blocks.push(text(`…and ${optional.length - shown.length} more. The full list, with what each one is for, is in the pack builder.`, "note"));
  }
  if (t.checklist && t.checklist !== "published") {
    blocks.push(text(`${CHECKLIST_LABEL[t.checklist].label}: ${t.checklistNote ?? CHECKLIST_LABEL[t.checklist].help}`, "warn"));
  }
  if (t.nextSteps?.length) {
    blocks.push(heading("After you lodge the pack"));
    blocks.push(list(t.nextSteps.slice(0, 4).map((s) => ({ text: s })), true));
    if (t.nextSteps.length > 4) blocks.push(text(`There are ${t.nextSteps.length - 4} more steps on the service's page in the pack builder.`, "note"));
  }
  const acts: Action[] = [{ kind: "link", label: "Start a pack", href: `/packs/new?template=${encodeURIComponent(t.id)}` }];
  if (t.source) acts.push({ kind: "external", label: "Official source", href: t.source.url });
  acts.push(ask("Where do I send it?", "Where do I send it?", { templateId: t.id }));
  blocks.push(actions(acts));
  if (t.source) blocks.push(text(`Source: ${t.source.label}.`, "note"));
  blocks.push(text(DISCLAIMER, "note"));
  return { blocks, focus: { templateId: t.id } };
}

function choicesReply(matches: ServiceMatch[], intro: string): Reply {
  return {
    blocks: [
      text(intro),
      actions(matches.slice(0, 4).map((m) => ask(m.template.name, `What do I need for ${m.template.name}?`, { templateId: m.template.id }))),
      text("Pick one and I'll list what it needs.", "note"),
    ],
  };
}

function formReply(token: string, forms: ReturnType<typeof indexForms>): Reply {
  const uses = forms.get(token) ?? [];
  const first = uses[0];
  const label = formLabel(first.ref);
  const byTemplate = new Map<string, (typeof uses)[number]>();
  for (const u of uses) if (!byTemplate.has(u.template.id)) byTemplate.set(u.template.id, u);
  const distinct = [...byTemplate.values()];
  const blocks: Block[] = [
    heading(label),
    text(`${label} is the "${first.slot.name}" tile. ${first.slot.description}`),
    heading(`Used in ${plural(distinct.length, "service")}`),
    list(distinct.slice(0, 8).map((u) => ({ text: u.template.name, badge: u.slot.required ? "Required" : "Optional", detail: u.template.subcategory ?? u.template.category }))),
  ];
  if (distinct.length > 8) blocks.push(text(`…and ${distinct.length - 8} more.`, "note"));
  blocks.push(actions(distinct.slice(0, 3).map((u) => ask(`What do I need for ${u.template.name}?`, `What do I need for ${u.template.name}?`, { templateId: u.template.id }))));
  blocks.push(text("Blank forms come from the official office that issues them. Docutile does not fill them in for you.", "note"));
  return { blocks, focus: { templateId: first.template.id } };
}

function packReply(p: Pack, ctx: Context): Reply {
  const c = computeCompleteness(p.slots);
  const due = dueStatus(p.dueDate, ctx.now);
  const waiting = p.slots.filter((s) => s.files.length === 0 && s.waiting);
  const t = ctx.templates.find((x) => x.id === p.templateId);
  const blocks: Block[] = [
    heading(p.name),
    text(`${p.organisationName} · applying for: ${p.templateName}`, "note"),
    text(`${c.requiredComplete} of ${c.requiredTotal} required documents are attached (${c.percent}%).${due.kind !== "none" ? ` ${due.label} (${formatDate(p.dueDate)}).` : ""}`),
  ];
  if (c.missing.length > 0) {
    blocks.push(heading(`Still missing (${c.missing.length})`));
    blocks.push(list(c.missing.map((s) => ({
      ...slotItem(s),
      detail: s.waiting ? `Waiting: ${s.waiting.note}${s.waiting.expectedBy ? `, expected by ${formatDate(s.waiting.expectedBy)}` : ""}` : undefined,
    }))));
    blocks.push(text("A waiting note does not count as a document: the pack stays not ready until the file is attached.", "note"));
  } else if (c.ready) {
    blocks.push(text("Every required document is attached. You can review the order and export the combined PDF.", "normal"));
  } else {
    blocks.push(text("This pack has no documents yet. Add files to its tiles to get started."));
  }
  if (waiting.length > 0 && c.missing.length === 0) blocks.push(text(`${plural(waiting.length, "document")} marked as waiting.`, "note"));
  const emptyOptional = p.slots.filter((s) => !s.required && s.files.length === 0).length;
  if (c.missing.length === 0 && emptyOptional > 0) blocks.push(text(`${plural(emptyOptional, "optional tile")} still empty: check whether any apply to you.`, "note"));
  if (t?.nextSteps?.length && c.ready) {
    blocks.push(heading("When you lodge it"));
    blocks.push(list(t.nextSteps.slice(0, 3).map((s) => ({ text: s })), true));
  }
  const acts: Action[] = [{ kind: "link", label: "Open this pack", href: `/packs/${p.id}` }];
  if (c.ready) acts.push({ kind: "link", label: "Review and export", href: `/packs/${p.id}/review` });
  if (t) acts.push(ask("Where do I send it?", "Where do I send it?", { templateId: t.id, packId: p.id }));
  blocks.push(actions(acts));
  return { blocks, focus: { packId: p.id, templateId: t?.id } };
}

function choosePackReply(ctx: Context, why: string): Reply {
  const packs = sortPacks(ctx.packs, "updated").slice(0, 6);
  return {
    blocks: [text(why), actions(packs.map((p) => ask(p.name, `What's the status of my pack ${p.name}?`, { packId: p.id })))],
  };
}

/** The pack a question is about: the one on screen, the one just discussed, the only one, or one named in the question. */
function resolvePack(q: string, ctx: Context): Pack | null {
  const byId = (id?: string) => ctx.packs.find((p) => p.id === id) ?? null;
  const named = ctx.packs.find((p) => p.name.trim().length > 2 && words(q).join(" ").includes(words(p.name).join(" ")));
  return named ?? byId(ctx.currentPackId) ?? byId(ctx.focus?.packId) ?? (ctx.packs.length === 1 ? ctx.packs[0] : null);
}

function dueReply(ctx: Context): Reply {
  const dated = sortPacks(ctx.packs.filter((p) => p.dueDate), "due");
  if (ctx.packs.length === 0) return { blocks: [text("You don't have any packs yet, so nothing is due."), actions([{ kind: "link", label: "Start a pack", href: "/packs/new" }])] };
  if (dated.length === 0) return { blocks: [text("None of your packs has a due date. You can add one under Edit details in the pack builder.")] };
  const items: ListItem[] = dated.slice(0, 8).map((p) => {
    const d = dueStatus(p.dueDate, ctx.now);
    const c = computeCompleteness(p.slots);
    return { text: p.name, badge: d.label, detail: `${formatDate(p.dueDate)} · ${c.requiredComplete} of ${c.requiredTotal} required documents` };
  });
  const urgent = dated.filter((p) => ["overdue", "today", "soon"].includes(dueStatus(p.dueDate, ctx.now).kind));
  return {
    blocks: [
      text(urgent.length > 0 ? `${plural(urgent.length, "pack")} due within a week or overdue:` : "Nothing is due within the next week. Here are your packs with due dates:"),
      list(items),
      actions(dated.slice(0, 3).map((p) => ask(`Status of ${p.name}`, `What's the status of my pack ${p.name}?`, { packId: p.id }))),
    ],
  };
}

function whereReply(t: Template | null, ctx: Context): Reply {
  if (!t) {
    const cats = [...new Set(ctx.templates.map((x) => x.category))].filter((c) => portalsFor(c).length > 0);
    return {
      blocks: [
        text("Where a pack goes depends on the service. Tell me which one (for example \"deceased estate\" or \"change directors\") and I'll show its steps and the right portal. Official portals by category:"),
        list(cats.map((c) => ({ text: c, detail: portalsFor(c).map((x) => x.name).join(", ") }))),
        text("They are also listed in the Official portals panel on the dashboard and in the menu.", "note"),
      ],
    };
  }
  const blocks: Block[] = [heading(`Sending: ${t.name}`)];
  if (t.nextSteps?.length) blocks.push(list(t.nextSteps.map((s) => ({ text: s })), true));
  else blocks.push(text("My checklists don't give submission details for this service. Confirm with the office that receives it.", "warn"));
  const portals = portalsFor(t.category);
  if (portals.length > 0) {
    blocks.push(heading("Official portals for this category"));
    blocks.push(actions(portals.map((p) => ({ kind: "external", label: p.name, href: p.url }) as Action)));
    blocks.push(text("These open the official site. You sign in there: I never see your login.", "note"));
  }
  blocks.push(text(DISCLAIMER, "note"));
  return { blocks, focus: { templateId: t.id } };
}

function fallbackReply(matches: ServiceMatch[]): Reply {
  const blocks: Block[] = [text("I couldn't match that to one of my checklists, and I'd rather say so than guess.")];
  if (matches.length > 0) {
    blocks.push(text("These are the closest services I know:"));
    blocks.push(actions(matches.slice(0, 3).map((m) => ask(m.template.name, `What do I need for ${m.template.name}?`, { templateId: m.template.id }))));
  }
  blocks.push(text("Try naming the service or the form (for example \"report a deceased estate\", \"register a trade mark\" or \"form CoR39\"), or browse everything in Templates."));
  blocks.push(actions([{ kind: "link", label: "Browse all services", href: "/templates" }, ask("What can you do?", "What can you do?")]));
  return { blocks };
}

const DANGER = /\b(abus\w*|hits?|hitting|beat\w*|violen\w*|threat\w*|attack\w*|hurt\w*|unsafe|scared|afraid|stalk\w*)\b/i;
const SAFETY = "If you are in immediate danger, contact the police straight away. A protection order is a separate step: I can show what it needs.";

/** Docubuddy's reply to one question. Pure: the same question and context always give the same answer. */
export function answer(question: string, ctx: Context): Reply {
  const reply = answerCore(question, ctx);
  // Someone describing harm needs to hear about safety first, whatever else the reply says.
  if (DANGER.test(question)) reply.blocks.unshift(text(SAFETY, "warn"));
  return reply;
}

function answerCore(question: string, ctx: Context): Reply {
  const forms = indexForms(ctx.templates);
  const intent = detectIntent(question, ctx, forms);

  switch (intent) {
    case "help":
      return helpReply();
    case "greeting":
      return helpReply();
    case "thanks":
      return { blocks: [text("You're welcome. Ask me anything else about your packs or the services.")], focus: ctx.focus };
    case "legal":
      return {
        blocks: [
          text("I can't give legal advice or tell you what to do in a dispute. I can only show what the official checklists ask for. For legal questions, speak to an attorney or the office that deals with your matter."),
          actions([ask("What can you do?", "What can you do?")]),
        ],
      };
    case "form": {
      const token = (question.match(FORM_PATTERN) ?? []).map(normForm).find((k) => forms.has(k))!;
      return formReply(token, forms);
    }
    case "due":
      return dueReply(ctx);
    case "pack": {
      const p = resolvePack(question, ctx);
      if (p) return packReply(p, ctx);
      if (ctx.packs.length === 0) return { blocks: [text("You don't have any packs yet. Start one from a service and I can tell you what's missing."), actions([{ kind: "link", label: "Start a pack", href: "/packs/new" }])] };
      return choosePackReply(ctx, "Which pack do you mean?");
    }
    case "where": {
      // Words that only say "send it somewhere" must not be mistaken for a service.
      const aboutService = words(question).filter((w) => !WHERE_WORDS.has(w)).join(" ");
      const matches = aboutService ? searchServices(aboutService, ctx.templates, 5) : [];
      const fromQuestion = judge(matches) === "clear" ? matches[0].template : null;
      const t = fromQuestion ?? ctx.templates.find((x) => x.id === ctx.focus?.templateId) ?? ctx.templates.find((x) => x.id === ctx.packs.find((p) => p.id === ctx.currentPackId)?.templateId) ?? null;
      if (!t && judge(matches) === "several") return choicesReply(matches, "Which service do you mean? The steps depend on it.");
      return whereReply(t, ctx);
    }
    default: {
      const matches = searchServices(question, ctx.templates, 5);
      const verdict = judge(matches);
      if (verdict === "clear") return serviceReply(matches[0].template);
      if (verdict === "several") {
        // A service just discussed wins when the new question is only a short follow-up about it.
        return choicesReply(matches, "A few services fit. Which one do you mean?");
      }
      return fallbackReply(matches);
    }
  }
}

export { PRIVACY };
