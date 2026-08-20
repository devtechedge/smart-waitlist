import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FLAG_THRESHOLD, isTempEmail, normalizeEmail } from "./fraud-email.ts";

describe("normalizeEmail", () => {
  it("strips plus-addressing", () => {
    assert.equal(normalizeEmail("user+test@example.com"), "user@example.com");
  });

  it("strips gmail dots", () => {
    assert.equal(normalizeEmail("u.s.e.r@gmail.com"), "user@gmail.com");
    assert.equal(normalizeEmail("u.s.e.r+tag@googlemail.com"), "user@googlemail.com");
  });

  it("lowercases", () => {
    assert.equal(normalizeEmail("Founder@Example.COM"), "founder@example.com");
  });
});

describe("isTempEmail", () => {
  it("flags known throwaway domains", () => {
    assert.equal(isTempEmail("a@mailinator.com"), true);
    assert.equal(isTempEmail("a@yopmail.com"), true);
  });

  it("allows real domains", () => {
    assert.equal(isTempEmail("founder@gmail.com"), false);
    assert.equal(isTempEmail("not-an-email"), false);
  });
});

describe("FLAG_THRESHOLD", () => {
  it("is 70", () => {
    assert.equal(FLAG_THRESHOLD, 70);
  });
});
