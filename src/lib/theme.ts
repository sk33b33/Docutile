/** The two colour themes. Dark is the default; the choice is remembered in this browser. */
export type Theme = "dark" | "light";

export const THEME_KEY = "docutile:theme";
export const THEME_EVENT = "docutile:theme";
/** Browser toolbar colour for each theme (must match --bg in globals.css). */
export const THEME_COLOR: Record<Theme, string> = { dark: "#050816", light: "#e9eff8" };

export const isTheme = (v: unknown): v is Theme => v === "dark" || v === "light";

/** Runs before the page paints, so a saved light theme never flashes dark first. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var c=t==="light"?${JSON.stringify(THEME_COLOR.light)}:${JSON.stringify(THEME_COLOR.dark)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}}catch(e){}`;

/** The theme now on the page (read from the document, so it is right even before React has run). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Next can leave more than one theme-color tag in the head after a navigation: keep them all in step.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[theme]));
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* the choice just will not be remembered */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}
