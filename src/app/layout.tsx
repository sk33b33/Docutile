import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: { default: "Docutile", template: "%s · Docutile" },
  description: "Assemble, check and export document packs. Local-first: your files stay in this browser.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Avoid a flash of the splash on reload within a session that already entered. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("docutile:entered")==="1")document.documentElement.dataset.splash="done"}catch(e){}` }} />
        <ToastProvider>
          <AppProvider>
            <Shell>{children}</Shell>
          </AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
