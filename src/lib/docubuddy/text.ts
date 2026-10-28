import { normalize } from "../search";

const STOP = new Set(
  "a an and are as at be been but by can could do does for from had has have how i if in into is it its me my of on or our so than that the their them then there these they this to up us was we were what when where which who why will with would you your am im ive please need want like get got just some any about also very business start open make help form forms document documents service services pack packs checklist requirement requirements required".split(" "),
);

/** Lower-case words with accents removed; apostrophes dropped ("Guardian's" becomes "guardians"). */
export function words(text: string): string[] {
  return normalize(text).replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}

/** A light stemmer: enough to match "died/dies", "directors/director", "registering/register". */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Meaningful stemmed terms of a text (stop words removed). */
export function terms(text: string): string[] {
  return words(text).filter((w) => !STOP.has(w)).map(stem);
}

/**
 * Everyday words people use, mapped to the words the checklists use. They add weaker matches, so a question
 * like "my father died" finds the deceased-estate services even though the checklists never say "died".
 */
const CONCEPTS: Record<string, string> = {
  died: "deceased estate death", die: "deceased estate death", dies: "deceased estate death", dead: "deceased estate death", death: "deceased estate",
  passed: "deceased estate death", deceased: "estate death", funeral: "deceased estate death", executor: "estate deceased", heir: "estate deceased", heirs: "estate deceased",
  inherit: "estate deceased", inheritance: "estate deceased", inherited: "estate deceased",
  abuse: "protection order domestic violence", abused: "protection order domestic violence", abusive: "protection order domestic violence",
  violence: "protection order domestic", violent: "protection order domestic violence", beaten: "protection order domestic violence", assault: "protection order domestic violence",
  stalking: "protection order domestic violence", harassment: "protection order domestic violence", abusing: "protection order domestic violence",
  hits: "protection order domestic violence", hitting: "protection order domestic violence", beating: "protection order domestic violence", threatens: "protection order domestic violence",
  threatening: "protection order domestic violence",
  alimony: "maintenance", support: "maintenance", divorce: "maintenance",
  start: "register company incorporation", incorporate: "register company incorporation", incorporation: "register company", pty: "company register", ltd: "company register", npc: "non-profit company register",
  nonprofit: "non-profit company", charity: "non-profit company",
  director: "directors change company", directors: "directors change company", resign: "directors change company", resigned: "directors change company", resignation: "directors change company",
  appoint: "directors change company", appointed: "directors change company",
  shut: "deregister wind company", dissolve: "deregister wind company", dissolved: "deregister wind company", closing: "deregister wind", dormant: "deregister company",
  liquidate: "wind up insolvent", liquidation: "wind up insolvent liquidation",
  brand: "trade mark", logo: "trade mark", slogan: "trade mark", trademark: "trade mark",
  invention: "patent", invent: "patent", inventor: "patent",
  movie: "copyright film cinematograph", film: "copyright cinematograph", copyrights: "copyright",
  orphan: "guardians fund minor", minor: "guardians fund", guardian: "guardians fund",
  bankrupt: "insolvent estate liquidation", bankruptcy: "insolvent estate liquidation", sequestrate: "insolvent estate", sequestration: "insolvent estate",
  struggling: "business rescue", rescue: "business rescue practitioner",
  foreign: "external foreign company", overseas: "external foreign company",
};

/**
 * Whole phrases that say clearly what someone wants. Each adds terms that count as much as the words typed, because
 * the wording is specific ("close my company" is not about close corporations).
 */
const PHRASES: [RegExp, string][] = [
  [/child support|child maintenance|support (for )?(my|the) child|pay(ing)? for my (kid|child|children)/, "maintenance order"],
  [/start(ing)? (a |my |an |our )?(own |new )*(business|company)|open(ing)? (a |my )?(own )?(business|company)|form(ing)? (a |my )?company|set(ting)? up (a |my )?(own )?(business|company)|new company|incorporate/, "register company incorporation"],
  [/(close|shut|closing|shutting)( down)? (my|the|a|our) (company|business|cc|close corporation)|dissolv|stop trading/, "deregister wind company"],
  [/(change|update|new|moved?) (my |the |our |of )?(company )?(address|office)|moved? (offices?|premises)/, "registered office change company"],
  [/(name|rename) (my|the|a|our) (company|business)|company name|business name|name for (my|the|a) (company|business)/, "reserve name company"],
  [/(wife|husband|partner|boyfriend|girlfriend|ex|spouse)\b.*\b(hit|hits|hitting|beat|beats|beating|abus|threat|attack|hurt)|(hit|beat|abuse|threaten|attack|hurt)\w*\b.*\b(me|my)\b/, "protection order domestic violence"],
  [/funeral|lost (my|a) (mother|father|mom|dad|parent|spouse|wife|husband|brother|sister|child|grandmother|grandfather)|someone (has )?(died|passed)|passed away|last will|will and testament/, "deceased estate report"],
  [/trade ?mark|brand name/, "trade mark"],
  [/director\w* (has |have )?(left|resigned|quit|died)|new director|remove (a )?director/, "directors change company"],
];

/** The query's own terms (and those from specific phrases), plus weaker related terms from everyday words. */
export function expandedTerms(query: string): { direct: string[]; related: string[] } {
  const all = words(query);
  const flat = all.join(" ");
  const direct = new Set(all.filter((w) => !STOP.has(w)).map(stem));
  for (const [pattern, extra] of PHRASES) {
    if (pattern.test(flat)) for (const w of extra.split(" ")) direct.add(stem(w));
  }
  const related = new Set<string>();
  for (const w of all) for (const extra of (CONCEPTS[w] ?? "").split(" ").filter(Boolean)) related.add(stem(extra));
  for (const t of direct) related.delete(t);
  return { direct: [...direct], related: [...related] };
}
