/**
 * Form numbers (J294, JM21, MBU 09(A) ...) as they appear in official DOJ pages and in Docutile's checklists.
 * Used by the source-change check to confirm every form a checklist names still exists on the official pages.
 */
const FORM_TOKEN = /\b(?:J\d{2,3}[A-Z]?|JM\d{1,3}(?:_\d+)?|MBU\s?0?\d{1,2}\s?\(?[A-Z]?\)?)(?![A-Za-z0-9])/gi;

/** "MBU 09 (A)" and "mbu09a" both become "MBU09A". */
export function normalizeToken(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_]/g, "").toUpperCase();
}

export function extractFormTokens(text: string): string[] {
  return [...new Set((text.match(FORM_TOKEN) ?? []).map(normalizeToken))].sort();
}

/** Plain text of an HTML page: scripts, styles and tags removed, entities decoded for the few we meet. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;|&#8211;|&mdash;/g, "-")
    .replace(/\s+/g, " ");
}

/** "Updated: 31/10/2024" -> "2024-10-31" (day/month/year, as the Master's pages write it). */
export function pageUpdatedIso(text: string): string | null {
  const m = text.match(/Updated:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** "31 Oct 2024" (how templates record it) -> "2024-10-31". */
export function templateDateIso(label: string): string | null {
  const m = label.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  return m && MONTHS[m[2].toLowerCase()] ? `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}` : null;
}

/**
 * CIPC form numbers (CoR14.1, CoR15.1A, CK2A, CM26, CR1, JM12, and the IP forms TM1, P1, D1, RF1 ...). Kept apart from the DOJ pattern so that DOJ pages
 * are never read with it.
 */
const CIPC_FORM_TOKEN = /\b(?:CoR\s?\d{1,3}(?:\.\s?\d)?\s?[A-E]?|CK\s?\d[A]?|CM\s?\d{2,3}[A]?|CR\s?\d{1,2}|JM\s?\d{1,3}|TM\s?\d{1,2}|RF\s?\d{1,2}|P\s?\d{1,2}|D\s?\d{1,2})(?![A-Za-z0-9])/gi;

export function extractCipcFormTokens(text: string): string[] {
  return [...new Set((text.match(CIPC_FORM_TOKEN) ?? []).map(normalizeToken))].sort();
}

/** The right extractor for a source: CIPC pages use CIPC form numbers, everything else uses the DOJ ones. */
export function formTokensFor(url: string, text: string): string[] {
  return /(^|\.)cipc\.co\.za\//i.test(url) ? extractCipcFormTokens(text) : extractFormTokens(text);
}

/**
 * The forms list on a CIPC forms page: the text from its "FORM CODE" heading to the sidebar that follows. Every CIPC
 * page also carries popups that name forms (service standards), so tokens from the whole page prove nothing.
 * Returns null when the heading is missing, which means the page layout changed.
 */
export function cipcFormsSection(pageText: string): string | null {
  const start = pageText.search(/FORM CODE/i);
  if (start < 0) return null;
  const rest = pageText.slice(start);
  const end = rest.search(/Related links|USEFUL RESOURCES/i);
  return end > 0 ? rest.slice(0, end) : rest;
}

/** The main content of a CIPC page: everything before its sidebar ("Related links" / "Useful resources"). */
export function cipcMainText(pageText: string): string {
  const end = pageText.search(/Related links|USEFUL RESOURCES/i);
  return end > 0 ? pageText.slice(0, end) : pageText;
}

