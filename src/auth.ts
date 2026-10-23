import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isEmailAllowed } from "@/lib/auth/config";

/**
 * Google sign-in (Auth.js). Credentials come from environment variables: AUTH_SECRET, AUTH_GOOGLE_ID,
 * AUTH_GOOGLE_SECRET. Sessions are signed cookies; no user database is involved, and no documents ever
 * reach the server: Docutile's files stay in the browser.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // `select_account` makes Google always show the account chooser instead of silently reusing the
  // one browser session, so people with several Google accounts can pick the right one.
  providers: [Google({ authorization: { params: { prompt: "select_account" } } })],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Only addresses Google has verified, and only those on the optional allow-list.
    signIn({ profile }) {
      return isEmailAllowed(profile?.email, profile?.email_verified as boolean | undefined);
    },
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email.toLowerCase();
      return token;
    },
    // Auth.js reports "now + maxAge" as the session end, but the cookie is not renewed on page views, so
    // the real end is the token's own expiry. Report that, so the expiry notice is truthful.
    session({ session, token }) {
      if (typeof token.exp === "number") session.expires = new Date(token.exp * 1000).toISOString() as typeof session.expires;
      return session;
    },
  },
});
