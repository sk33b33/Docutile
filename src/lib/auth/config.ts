import { createHash } from "node:crypto";

/**
 * Sign-in is optional. It turns on only when every credential below is set, so a site without them behaves exactly
 * as before and never pretends to be protected. Read at request time (not build time) so Vercel env changes apply.
 */
export interface AuthEnv {
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  /** Comma-separated exact email addresses allowed to sign in. */
  ALLOWED_EMAILS?: string;
  /** Comma-separated email domains allowed to sign in, e.g. "example.co.za". */
  ALLOWED_DOMAINS?: string;
}

const present = (v: string | undefined) => !!v && v.trim().length > 0;

export function authEnabled(env: AuthEnv = process.env as AuthEnv): boolean {
  return present(env.AUTH_SECRET) && present(env.AUTH_GOOGLE_ID) && present(env.AUTH_GOOGLE_SECRET);
}

/** Which credentials are still missing, for a helpful message on the sign-in page. */
export function missingAuthSettings(env: AuthEnv = process.env as AuthEnv): string[] {
  return (["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const).filter((k) => !present(env[k]));
}

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/**
 * Only Google-verified addresses may sign in. With no allow-list, any verified Google account may (each account
 * still only sees its own data in its own browser). With ALLOWED_EMAILS and/or ALLOWED_DOMAINS, only those.
 */
export function isEmailAllowed(email: string | null | undefined, verified: boolean | undefined, env: AuthEnv = process.env as AuthEnv): boolean {
  if (!email || verified !== true) return false;
  const address = email.trim().toLowerCase();
  const emails = list(env.ALLOWED_EMAILS);
  const domains = list(env.ALLOWED_DOMAINS).map((d) => d.replace(/^@/, ""));
  if (emails.length === 0 && domains.length === 0) return true;
  return emails.includes(address) || domains.includes(address.split("@")[1] ?? "");
}

/** Name of the browser database for a signed-in account: stable per email, without exposing the address. */
export function userStorageName(email: string): string {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `docutile-u-${digest}`;
}

/** Paths reachable without signing in: the sign-in screen itself, the auth endpoints, and what installing needs. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/icons/")
  );
}

/** Only same-site paths are valid post-login destinations (prevents open redirects). */
export function safeCallbackPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.startsWith("/login")) return "/";
  return raw;
}
