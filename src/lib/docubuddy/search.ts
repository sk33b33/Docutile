import { formLabel } from "../format";
import { expandedTerms, stem, terms } from "./text";
import type { Template } from "@/types";

export interface ServiceMatch {
  template: Template;
  score: number;
  /** The query words that matched, for explaining why. */
  matched: string[];
}

interface IndexedService {
  template: Template;
  fields: { weight: number; counts: Map<string, number> }[];
  nameTerms: Set<string>;
}

const count = (ts: string[]) => {
  const m = new Map<string, number>();
  for (const t of ts) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
};

/** Words in a service's name and details, weighted: the name counts most, then the form numbers, then the group. */
export function indexServices(templates: Template[]): IndexedService[] {
  return templates.map((template) => ({
    template,
    nameTerms: new Set(terms(template.name)),
    fields: [
      { weight: 6, counts: count(terms(template.name)) },
      { weight: 5, counts: count(template.slots.flatMap((s) => (s.formRef ? terms(formLabel(s.formRef)) : []))) },
      { weight: 3, counts: count(terms(template.subcategory ?? "")) },
      { weight: 1.5, counts: count(terms(template.category)) },
      { weight: 2, counts: count(terms(template.description)) },
      { weight: 1.5, counts: count(template.slots.flatMap((s) => terms(s.name))) },
    ],
  }));
}

/** Services ranked for a question, best first. Services that match nothing are left out. */
export function searchServices(query: string, templates: Template[], limit = 5, index = indexServices(templates)): ServiceMatch[] {
  const { direct, related } = expandedTerms(query);
  if (direct.length === 0 && related.length === 0) return [];
  const n = index.length;
  const df = (t: string) => index.filter((s) => s.fields.some((f) => f.counts.has(t))).length;
  const idf = new Map<string, number>();
  for (const t of [...direct, ...related]) idf.set(t, Math.log(1 + n / (1 + df(t))));

  const wanted = new Set(terms(query));
  const ranked = index.map((s) => {
    let score = 0;
    const matched = new Set<string>();
    const add = (ts: string[], factor: number) => {
      for (const t of ts) {
        let hit = 0;
        for (const f of s.fields) hit += f.weight * Math.min(f.counts.get(t) ?? 0, 2);
        if (hit > 0) { score += hit * (idf.get(t) ?? 1) * factor; matched.add(t); }
      }
    };
    add(direct, 1);
    add(related, 0.45);
    // Asking for a service by (nearly) its own name beats everything else.
    if (s.nameTerms.size > 0) {
      const overlap = [...s.nameTerms].filter((t) => wanted.has(t)).length;
      if (overlap === s.nameTerms.size) score += 40;
      else score += (overlap / s.nameTerms.size) * 6;
    }
    // On a tie, the service people most likely want (the one named "Apply for ...", "Register ...") comes first.
    if (score > 0 && /^(apply|register|report|claim|reserve)\b/i.test(s.template.name)) score += 2.5;
    return { template: s.template, score, matched: [...matched] };
  });
  return ranked.filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name)).slice(0, limit);
}

/** How sure the best match is: a clear winner, a few close contenders, or nothing worth showing. */
export function judge(matches: ServiceMatch[]): "clear" | "several" | "none" {
  if (matches.length === 0 || matches[0].score < 8) return "none";
  const [best, second] = matches;
  if (!second || best.score >= second.score * 1.35) return "clear";
  return "several";
}

export { stem };
