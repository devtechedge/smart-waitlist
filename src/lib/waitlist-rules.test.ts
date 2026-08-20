import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareWaitlistRank,
  computePositionFromCohort,
  generateReferralCode,
  GENERATED_REFERRAL_CODE_LEN,
  isAheadOf,
  isSelfReferral,
  normalizeReferralCode,
} from "./waitlist-rules.ts";

const t = (iso: string) => new Date(iso);

describe("ranking", () => {
  it("ranks higher referral counts first", () => {
    const me = { referralCount: 2, createdAt: t("2026-01-02T00:00:00Z") };
    const ahead = { referralCount: 5, createdAt: t("2026-01-10T00:00:00Z") };
    const behind = { referralCount: 0, createdAt: t("2026-01-01T00:00:00Z") };
    assert.equal(isAheadOf(me, ahead), true);
    assert.equal(isAheadOf(me, behind), false);
  });

  it("breaks ties by earlier createdAt", () => {
    const me = { referralCount: 3, createdAt: t("2026-01-02T00:00:00Z") };
    const earlier = { referralCount: 3, createdAt: t("2026-01-01T00:00:00Z") };
    assert.equal(isAheadOf(me, earlier), true);
    assert.equal(isAheadOf(earlier, me), false);
  });

  it("computes 1-based position from a cohort", () => {
    const a = { referralCount: 10, createdAt: t("2026-01-01T00:00:00Z") };
    const b = { referralCount: 5, createdAt: t("2026-01-01T00:00:00Z") };
    const c = { referralCount: 5, createdAt: t("2026-01-02T00:00:00Z") };
    assert.equal(computePositionFromCohort(a, [a, b, c]), 1);
    assert.equal(computePositionFromCohort(b, [a, b, c]), 2);
    assert.equal(computePositionFromCohort(c, [a, b, c]), 3);
  });

  it("sorts with the same comparator as SQL ORDER BY", () => {
    const rows = [
      { referralCount: 1, createdAt: t("2026-01-03T00:00:00Z") },
      { referralCount: 4, createdAt: t("2026-01-10T00:00:00Z") },
      { referralCount: 4, createdAt: t("2026-01-01T00:00:00Z") },
    ];
    const sorted = [...rows].sort(compareWaitlistRank);
    assert.equal(sorted[0]!.createdAt.toISOString().startsWith("2026-01-01"), true);
    assert.equal(sorted[1]!.createdAt.toISOString().startsWith("2026-01-10"), true);
    assert.equal(sorted[2]!.referralCount, 1);
  });
});

describe("referral codes", () => {
  it("normalizes valid codes", () => {
    assert.equal(normalizeReferralCode("  AbC123  "), "abc123");
  });

  it("rejects empty, overlong, or non-alphanumeric codes", () => {
    assert.equal(normalizeReferralCode(""), null);
    assert.equal(normalizeReferralCode("ab_cd"), null);
    assert.equal(normalizeReferralCode("x".repeat(33)), null);
    assert.equal(normalizeReferralCode(12), null);
  });

  it("generates 6-char base36 codes", () => {
    const code = generateReferralCode();
    assert.equal(code.length, GENERATED_REFERRAL_CODE_LEN);
    assert.match(code, /^[0-9a-z]{6}$/);
  });
});

describe("isSelfReferral", () => {
  it("detects matching user ids", () => {
    assert.equal(isSelfReferral("user-1", "user-1"), true);
    assert.equal(isSelfReferral("user-1", "user-2"), false);
    assert.equal(isSelfReferral(null, "user-1"), false);
  });
});
