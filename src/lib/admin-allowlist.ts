/**
 * ADMIN_EMAILS parsing. Pure — does not read process.env.
 * `isAdminEmail` in server-env.ts wraps this after loading secrets.
 */

export function parseAdminAllowList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailOnAllowList(email: string, allowList: string[]): boolean {
  if (allowList.length === 0) return false;
  return allowList.includes(email.trim().toLowerCase());
}
