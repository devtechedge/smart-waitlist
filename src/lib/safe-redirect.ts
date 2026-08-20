/**
 * Defensive guard: only allow redirects to same-origin relative paths.
 * Prevents open-redirect attacks via crafted `?redirect=https://evil.com`.
 */
export function safeRedirectPath(input: string, fallback = "/dashboard"): string {
  if (!input) return fallback;

  if (/^\/\//.test(input) || /^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return fallback;
  }

  if (input.includes("\\")) return fallback;

  if (!input.startsWith("/")) return fallback;

  return input;
}
