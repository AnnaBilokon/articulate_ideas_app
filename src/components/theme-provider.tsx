"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light, dark or system mode, as a "dark" class on <html>. The palette is
// separate: see usePalette.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
