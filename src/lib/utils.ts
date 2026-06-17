import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — className combiner
 * -------------------------
 * Merges clsx (conditional class names) with tailwind-merge (resolves
 * conflicting Tailwind utility classes, keeping the last one wins).
 *
 * @example
 *   cn("px-2 py-1", condition && "bg-red-500", "px-4")
 *   // → "py-1 bg-red-500 px-4"  (px-2 was overridden by px-4)
 *
 * Used by every shadcn/ui component and our custom components.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
