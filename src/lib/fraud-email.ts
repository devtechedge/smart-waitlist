/**
 * Pure email heuristics used by the anti-fraud scorer.
 * No DB — unit-tested independently of `assessSignupFraud`.
 */

/** Score threshold above which an entry is flagged for review. */
export const FLAG_THRESHOLD = 70;

/**
 * Extracts the "base" email for plus-addressing detection.
 *   "user+test@gmail.com" → "user@gmail.com"
 * Also strips dots on gmail/googlemail.
 */
export function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return email.toLowerCase();

  const baseLocal = local.split("+")[0] ?? local;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${baseLocal.replace(/\./g, "")}@${domain}`;
  }

  return `${baseLocal}@${domain}`;
}

const TEMP_DOMAINS = new Set([
  "tempmail.com",
  "throwaway.email",
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "getnada.com",
  "temp-mail.org",
  "sharklasers.com",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "dispostable.com",
  "mintemail.com",
]);

export function isTempEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  return domain ? TEMP_DOMAINS.has(domain) : false;
}
