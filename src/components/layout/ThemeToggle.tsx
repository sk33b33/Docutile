"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { THEME_EVENT, applyTheme, currentTheme, type Theme } from "@/lib/theme";

const subscribe = (cb: () => void) => {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
};

/** Dark / light switch. The server always renders "dark"; the saved choice applies as soon as the page loads. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark" as Theme);
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
  ];
  return (
    <div role="group" aria-label="Colour theme" className="flex gap-1">
      {options.map(({ value, label, icon: Icon }) => (
        <Button key={value} variant={theme === value ? "primary" : "secondary"} aria-pressed={theme === value} onClick={() => applyTheme(value)}>
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </Button>
      ))}
    </div>
  );
}
