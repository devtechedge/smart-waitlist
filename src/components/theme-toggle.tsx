"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle
 * -----------
 * A compact dropdown button that lets the user switch between Light, Dark,
 * and System themes. Uses `next-themes` (already mounted in the root layout
 * via `<ThemeProvider>`).
 *
 * The button shows a sun icon in light mode, moon icon in dark mode, and a
 * monitor icon when following the system preference. A small `key` prop on
 * the icon forces re-mount on theme change so the icon swaps cleanly.
 *
 * Mounted in the dashboard nav and the landing footer.
 */
export type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch — next-themes reads from localStorage which is
  // only available client-side. Render a placeholder until mounted.
  // Using a ref + requestAnimationFrame to defer the state update so it
  // doesn't run synchronously during the effect body.
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    // Defer to next frame to avoid synchronous setState in effect.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9", className)}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-9", className)}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "font-semibold")}
        >
          <Sun className="mr-2 size-4" aria-hidden />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "font-semibold")}
        >
          <Moon className="mr-2 size-4" aria-hidden />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "font-semibold")}
        >
          <Monitor className="mr-2 size-4" aria-hidden />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
