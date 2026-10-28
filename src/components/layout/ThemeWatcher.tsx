"use client";

import { useEffect } from "react";
import { watchDeviceTheme } from "@/lib/theme";

/** Keeps the page in step with the device's light/dark setting while "Device" is the chosen theme. Renders nothing. */
export function ThemeWatcher() {
  useEffect(() => watchDeviceTheme(), []);
  return null;
}
