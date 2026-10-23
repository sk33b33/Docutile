/** How close a sign-in session is to ending. Pure so it can be tested without a clock or a browser. */
export type SessionStatus =
  | { state: "ok"; label: string }
  | { state: "soon"; label: string }
  | { state: "expired"; label: string };

/** Warn when less than this much of the session is left. */
export const SESSION_WARN_MS = 24 * 60 * 60 * 1000;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** `expires` is the ISO timestamp Auth.js puts on the session. An unreadable value is treated as "ok" and unlabelled. */
export function sessionStatus(expires: string | null | undefined, now: number = Date.now()): SessionStatus | null {
  if (!expires) return null;
  const end = Date.parse(expires);
  if (Number.isNaN(end)) return null;
  const left = end - now;
  if (left <= 0) return { state: "expired", label: "Your sign-in has expired" };
  if (left >= DAY) {
    const days = Math.floor(left / DAY);
    return { state: "ok", label: `Signed in for ${plural(days, "more day")}` };
  }
  const label = left >= HOUR ? `Sign-in ends in ${plural(Math.floor(left / HOUR), "hour")}` : "Sign-in ends in under an hour";
  return { state: left < SESSION_WARN_MS ? "soon" : "ok", label };
}
