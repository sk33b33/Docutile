import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "@/app/actions";
import { LogoMark } from "@/components/layout/Logo";
import { authEnabled, safeCallbackPath } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account is not allowed to use this site. Ask the site owner to add your address, or try another account.",
  Configuration: "Sign-in is not set up correctly on this site. Please tell the site owner.",
  Verification: "That sign-in link is no longer valid. Please try again.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.87.92 7.52 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const on = authEnabled();
  const message = error ? (ERRORS[error] ?? "Sign-in did not work. Please try again.") : null;

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4">
      <section aria-labelledby="login-title" className="glass-strong w-full max-w-md rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="splash-logo-wrap" aria-hidden>
            <LogoMark className="splash-logo h-14 w-14" />
          </span>
          <h1 id="login-title" className="title-glow mt-4 text-3xl font-semibold tracking-tight">Docutile</h1>
          <p className="mt-1 text-sm text-slate-300">Sign in to continue</p>
        </div>

        {message && <p role="alert" className="mt-5 rounded-md border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-100">{message}</p>}
        {!on && (
          <p role="status" className="mt-5 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
            Sign-in is not switched on for this site yet, so the app is open to anyone who can reach it. The site owner can switch it on by following &ldquo;Sign-in with Google&rdquo; in the README.
          </p>
        )}

        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="callbackUrl" value={safeCallbackPath(callbackUrl)} />
          <button
            type="submit"
            disabled={!on}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-md bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <GoogleMark /> Continue with Google
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400" aria-hidden>
          <span className="h-px flex-1 bg-white/15" /> or <span className="h-px flex-1 bg-white/15" />
        </div>

        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-100">Email address</label>
          <input id="login-email" type="email" disabled aria-describedby="email-note" placeholder="you@example.com" className="glass-input block w-full cursor-not-allowed rounded-md px-3 py-2 text-sm text-slate-100 opacity-50 placeholder:text-slate-400" />
          <button type="button" disabled className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-medium text-slate-100 opacity-50 cursor-not-allowed">
            <Mail className="h-4 w-4" aria-hidden /> Continue with email
          </button>
          <p id="email-note" className="mt-2 text-xs text-slate-300">
            Email and password sign-in is not available: it needs an account database and an email service, which this version does not have. Please use Google.
          </p>
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs text-slate-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
          <span>Docutile only receives your name and email from Google. Your documents never leave this browser, and each Google account keeps its own packs on this device.</span>
        </p>
      </section>
    </div>
  );
}
