"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; tone: Tone; message: string }
interface ToastApi { notify: (tone: Tone, message: string) => void }

const ToastContext = createContext<ToastApi>({ notify: () => {} });
export const useToast = () => useContext(ToastContext);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = (id: number) => setItems((p) => p.filter((t) => t.id !== id));
  const notify = useCallback((tone: Tone, message: string) => {
    const id = ++counter;
    setItems((p) => [...p.slice(-3), { id, tone, message }]);
    // Errors stay until dismissed so they cannot be missed.
    if (tone !== "error") setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 6000);
  }, []);

  const icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const color = {
    success: "border-green-300 bg-green-50 text-green-900",
    error: "border-red-300 bg-red-50 text-red-900",
    info: "border-blue-300 bg-blue-50 text-blue-900",
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = icon[t.tone];
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-md border p-3 text-sm shadow-md ${color[t.tone]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1 break-words">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded p-0.5 hover:bg-black/5">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
