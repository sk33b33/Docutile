import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers/AppProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Shell } from "@/components/layout/Shell";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorker";
import { authEnabled, userStorageName } from "@/lib/auth/config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Docutile", template: "%s · Docutile" },
  description: "Assemble, check and export document packs. Local-first: your files stay in this browser.",
  applicationName: "Docutile",
  appleWebApp: { capable: true, title: "Docutile", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#050816" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sign-in settings are read per request (not frozen at build time), so this layout is rendered on demand.
  await connection();
  const signInOn = authEnabled();
  const session = signInOn ? await auth() : null;
  const email = session?.user?.email ?? null;
  const user = email ? { email, name: session?.user?.name ?? null, image: null, expires: session?.expires ?? null } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Avoid a flash of the splash on reload within a session that already entered. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("docutile:entered")==="1")document.documentElement.dataset.splash="done"}catch(e){}` + THEME_INIT_SCRIPT }} />
        <ToastProvider>
          {signInOn && !user ? (
            // Signed out: only the sign-in screen is reachable (the proxy redirects everything else here).
            <main id="main">{children}</main>
          ) : (
            <AppProvider storageName={email ? userStorageName(email) : undefined} user={user}>
              <ServiceWorkerRegister />
              <Shell>{children}</Shell>
            </AppProvider>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
