"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme Provider
 * --------------
 * Wraps `next-themes` so the `<Toaster />` (sonner.tsx) can read the current
 * theme and so future dark-mode toggles work. We default to `system` with
 * `disableTransitionOnChange` to avoid a flash of unstyled content.
 *
 * Mounted in the root layout (Phase 4) around `{children}`.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
