/** The colour themes a page can show. */
export type Theme = "dark" | "light";
/** What the user picked: a fixed theme, or "system" to follow the device's light/dark setting. */
export type ThemeChoice = Theme | "system";

export const THEME_KEY = "docutile:theme";
export const THEME_EVENT = "docutile:theme";
/** Browser toolbar colour for each theme (must match --bg in globals.css). */
export const THEME_COLOR: Record<Theme, string> = { dark: "#050816", light: "#e9eff8" };
const LIGHT_QUERY = "(prefers-color-scheme: light)";

export const isThemeChoice = (v: unknown): v is ThemeChoice => v === "dark" || v === "light" || v === "system";

/** The theme to show for a choice. Dark is the default, so a device that does not say it prefers light gets dark. */
export function resolveTheme(choice: ThemeChoice, deviceIsLight: boolean): Theme {
  return choice === "system" ? (deviceIsLight ? "light" : "dark") : choice;
}

/**
 * Runs before the page paints, so a saved theme never flashes the wrong colours first. It sets `data-theme` (what to
 * show) and `data-theme-choice` (what the user picked). Keep it in step with resolveTheme above.
 */
export const THEME_INIT_SCRIPT = `try{var k=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(k==="light"||k==="dark"||k==="system"){var e=document.documentElement;var t=k==="system"?(window.matchMedia(${JSON.stringify(LIGHT_QUERY)}).matches?"light":"dark"):k;e.dataset.themeChoice=k;e.dataset.theme=t;var c=t==="light"?${JSON.stringify(THEME_COLOR.light)}:${JSON.stringify(THEME_COLOR.dark)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}}catch(e){}`;

/** The theme now on the page (read from the document, so it is right even before React has run). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** What the user picked. Nothing saved means dark, the default. */
export function currentThemeChoice(): ThemeChoice {
  const v = document.documentElement.dataset.themeChoice;
  return isThemeChoice(v) ? v : "dark";
}

export const deviceIsLight = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(LIGHT_QUERY).matches;

/** Shows a theme on the page without saving anything. */
function show(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Next can leave more than one theme-color tag in the head after a navigation: keep them all in step.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[theme]));
}

/** Saves the user's choice and applies it. */
export function applyThemeChoice(choice: ThemeChoice): void {
  document.documentElement.dataset.themeChoice = choice;
  show(resolveTheme(choice, deviceIsLight()));
  try { localStorage.setItem(THEME_KEY, choice); } catch { /* the choice just will not be remembered */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Follows the device while the choice is "system": call once on the page; returns a function that stops. */
export function watchDeviceTheme(): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(LIGHT_QUERY);
  const onChange = () => {
    if (currentThemeChoice() !== "system") return; // a fixed choice ignores the device
    show(resolveTheme("system", query.matches));
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
