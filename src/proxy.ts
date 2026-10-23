import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authEnabled, isPublicPath, safeCallbackPath } from "@/lib/auth/config";

/**
 * Reads the session cookie WITHOUT refreshing it. Auth.js's own `auth()` wrapper re-sends the session cookie on
 * every request it handles, which lets a slow response from before a sign-out (or an account switch) write the old
 * session back. Only the sign-in and sign-out endpoints may set the session cookie.
 */
async function signedInEmail(req: NextRequest): Promise<string | null> {
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  for (const secureCookie of [https, !https]) {
    try {
      const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
      if (token?.email) return String(token.email);
    } catch {
      /* a malformed or foreign cookie simply means "not signed in" */
    }
  }
  return null;
}

/** Keeps signed-out visitors on the sign-in screen when sign-in is configured. Does nothing otherwise. */
export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  const signedIn = !!(await signedInEmail(req));

  if (isPublicPath(pathname)) {
    // Someone who is already signed in has no reason to see the sign-in screen.
    if (signedIn && pathname === "/login") return NextResponse.redirect(new URL("/", req.nextUrl));
    return NextResponse.next();
  }
  if (signedIn) return NextResponse.next();
  const login = new URL("/login", req.nextUrl);
  login.searchParams.set("callbackUrl", safeCallbackPath(pathname + search));
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except build assets and the files an install needs; the gate itself also checks isPublicPath.
  matcher: ["/((?!_next/static|_next/image|icons/|sw.js|manifest.webmanifest|offline.html|icon.svg).*)"],
};
