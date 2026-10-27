/** Neon glow colours as "r g b" triplets, for use in `rgb(var(--glow) / alpha)`. */
export const GLOWS = {
  cyan: "34 211 238",
  violet: "167 139 250",
  magenta: "244 114 182",
  lime: "163 230 53",
  amber: "251 191 36",
  sky: "96 165 250",
} as const;

const ORDER = Object.values(GLOWS);

const CATEGORY_GLOW: Record<string, string> = {
  "General business": GLOWS.cyan,
  "South African DOJ": GLOWS.violet,
  "Master of the High Court: other services": GLOWS.magenta,
  "South African Courts": GLOWS.lime,
  CIPC: GLOWS.amber,
};

/** A fixed colour for each known category, so it never changes between visits; others take the next free colour. */
export function glowForCategory(name: string, index: number): string {
  return CATEGORY_GLOW[name] ?? ORDER[index % ORDER.length];
}

/** Subcategories are tinted differently from each other and from their parent category. */
export function glowForSub(parentGlow: string, index: number): string {
  const start = Math.max(0, ORDER.indexOf(parentGlow as (typeof ORDER)[number]));
  return ORDER[(start + 1 + index) % ORDER.length];
}
