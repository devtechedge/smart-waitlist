/**
 * Pure waitlist ranking + referral-code helpers.
 * No I/O — safe to unit-test and share between queries, actions, and CI.
 *
 * Ranking (single source of truth):
 *   ORDER BY referral_count DESC, created_at ASC
 *   position = 1 + count of rows strictly ahead
 */

export const REFERRAL_CODE_MAX_LEN = 32;
export const GENERATED_REFERRAL_CODE_LEN = 6;
const GENERATED_CODE_SPACE = 36 ** GENERATED_REFERRAL_CODE_LEN; // 2_176_782_336

export type Rankable = {
  referralCount: number;
  createdAt: Date | number | string;
};

function toTime(value: Rankable["createdAt"]): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

/** True when `other` ranks strictly ahead of `me`. */
export function isAheadOf(me: Rankable, other: Rankable): boolean {
  if (other.referralCount > me.referralCount) return true;
  if (other.referralCount < me.referralCount) return false;
  return toTime(other.createdAt) < toTime(me.createdAt);
}

/**
 * Position among `cohort` (including `me` if present).
 * `cohort` may omit `me`; then position is 1 + ahead-count of the rest.
 */
export function computePositionFromCohort(me: Rankable, cohort: Rankable[]): number {
  let ahead = 0;
  for (const other of cohort) {
    if (isAheadOf(me, other)) ahead += 1;
  }
  return ahead + 1;
}

export function compareWaitlistRank(a: Rankable, b: Rankable): number {
  if (b.referralCount !== a.referralCount) return b.referralCount - a.referralCount;
  return toTime(a.createdAt) - toTime(b.createdAt);
}

/** Normalize + validate a referral code. Returns null if invalid. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!s || s.length > REFERRAL_CODE_MAX_LEN) return null;
  if (!/^[a-z0-9]+$/.test(s)) return null;
  return s;
}

/**
 * 6-char base36 code via `crypto.getRandomValues`.
 * Collision retry is the caller's job (unique constraint).
 */
export function generateReferralCode(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const num = (buffer[0] ?? 0) % GENERATED_CODE_SPACE;
  return num.toString(36).padStart(GENERATED_REFERRAL_CODE_LEN, "0");
}

/** A user cannot refer themselves. */
export function isSelfReferral(
  referrerUserId: string | null | undefined,
  currentUserId: string,
): boolean {
  return Boolean(referrerUserId) && referrerUserId === currentUserId;
}
