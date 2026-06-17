/**
 * Shared formatting utilities
 * ---------------------------
 * Pure functions, no side effects, safe for both client and server use.
 * Kept separate from env/db modules so they can be imported anywhere
 * without pulling in heavier dependencies.
 */

/**
 * Converts a positive integer into an ordinal string.
 *   1 → "1st",  2 → "2nd",  3 → "3rd",  4 → "4th",
 *   11 → "11th", 12 → "12th", 21 → "21st", 112 → "112th"
 */
export function formatPosition(position: number): string {
  if (!Number.isFinite(position) || position < 1) {
    return "—";
  }

  const lastDigit = position % 10;
  const lastTwoDigits = position % 100;

  // Special case: 11th, 12th, 13th (and 111th, 112th, 113th, …) all use "th".
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th`;
  }

  const suffix =
    lastDigit === 1 ? "st" : lastDigit === 2 ? "nd" : lastDigit === 3 ? "rd" : "th";
  return `${position}${suffix}`;
}

/**
 * Formats a date as "Mon DD, YYYY" (e.g., "Apr 5, 2026").
 * Accepts Date, ISO string, or null/undefined (returns "—").
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (date == null) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats a date-time as "Mon DD, YYYY · HH:MM UTC".
 * Useful for admin tables where precise timestamps matter.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (date == null) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  const datePart = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${datePart} · ${timePart} UTC`;
}

/**
 * Returns a human-friendly relative time string ("just now", "5m ago",
 * "3h ago", "2d ago", "Mar 5" if older than 7 days).
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (date == null) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return "just now";
  if (minutes < 1) return `${seconds}s ago`;
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Masks an email for privacy in admin displays.
 *   "founder@example.com" → "f•••••@e•••••.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const maskedLocal =
    local.length <= 1 ? local : `${local[0]}${"•".repeat(Math.max(4, local.length - 1))}`;

  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  if (!domainName || !tld) return email;

  const maskedDomain =
    domainName.length <= 1
      ? domainName
      : `${domainName[0]}${"•".repeat(Math.max(4, domainName.length - 1))}`;

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

/**
 * Truncates a string to `maxLength` chars, appending an ellipsis if cut.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}
