"use client";

import { useSyncExternalStore } from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { THEME_EVENT, applyThemeChoice, currentTheme, currentThemeChoice, type Theme, type ThemeChoice } from "@/lib/theme";

const subscribe = (cb: () => void) => {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
};

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "Device", icon: Monitor },
];

/** Dark / Light / Device switch. The server always renders "Dark"; the saved choice applies as soon as the page loads. */
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, currentThemeChoice, () => "dark" as ThemeChoice);
  const shown = useSyncExternalStore(subscribe, currentTheme, () => "dark" as Theme);
  return (
    <div role="group" aria-label="Colour theme" className="flex gap-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button key={value} variant={choice === value ? "primary" : "secondary"} aria-pressed={choice === value} onClick={() => applyThemeChoice(value)}>
          <Icon className="h-4 w-4" aria-hidden /> {label}
          {value === "system" && choice === "system" && <span className="sr-only"> (following your device, now {shown})</span>}
        </Button>
      ))}
    </div>
  );
}
