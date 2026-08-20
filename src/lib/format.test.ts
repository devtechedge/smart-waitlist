import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTime,
  formatPosition,
  formatRelativeTime,
  maskEmail,
  truncate,
} from "./format.ts";

describe("formatPosition", () => {
  it("uses st/nd/rd/th correctly", () => {
    assert.equal(formatPosition(1), "1st");
    assert.equal(formatPosition(2), "2nd");
    assert.equal(formatPosition(3), "3rd");
    assert.equal(formatPosition(4), "4th");
    assert.equal(formatPosition(11), "11th");
    assert.equal(formatPosition(12), "12th");
    assert.equal(formatPosition(13), "13th");
    assert.equal(formatPosition(21), "21st");
    assert.equal(formatPosition(112), "112th");
  });

  it("returns em dash for invalid positions", () => {
    assert.equal(formatPosition(0), "—");
    assert.equal(formatPosition(-1), "—");
    assert.equal(formatPosition(Number.NaN), "—");
  });
});

describe("formatDate / formatDateTime", () => {
  it("formats UTC dates", () => {
    assert.equal(formatDate("2026-04-05T00:00:00.000Z"), "Apr 5, 2026");
    assert.equal(formatDateTime("2026-04-05T15:04:00.000Z"), "Apr 5, 2026 · 15:04 UTC");
  });

  it("returns em dash for empty/invalid", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate("not-a-date"), "—");
    assert.equal(formatDateTime(undefined), "—");
  });
});

describe("formatRelativeTime", () => {
  it("says just now for recent timestamps", () => {
    assert.equal(formatRelativeTime(new Date()), "just now");
  });

  it("returns em dash for missing values", () => {
    assert.equal(formatRelativeTime(null), "—");
  });
});

describe("maskEmail", () => {
  it("masks local and domain", () => {
    assert.equal(maskEmail("founder@example.com"), "f••••••@e••••••.com");
  });

  it("returns the input if it is not an email", () => {
    assert.equal(maskEmail("not-an-email"), "not-an-email");
  });
});

describe("truncate", () => {
  it("leaves short strings intact", () => {
    assert.equal(truncate("hello", 10), "hello");
  });

  it("appends an ellipsis when cut", () => {
    assert.equal(truncate("hello world", 6), "hello…");
  });
});
