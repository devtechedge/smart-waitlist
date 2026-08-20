import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { passwordField, signInSchema, signUpSchema } from "./auth-validation.ts";

describe("passwordField", () => {
  it("accepts a strong password", () => {
    const parsed = passwordField.safeParse("Secret1x");
    assert.equal(parsed.success, true);
  });

  it("rejects short, lowercase-only, or missing-digit passwords", () => {
    assert.equal(passwordField.safeParse("Ab1").success, false);
    assert.equal(passwordField.safeParse("alllowercase1").success, false);
    assert.equal(passwordField.safeParse("NoDigitsHere").success, false);
  });
});

describe("signInSchema", () => {
  it("lowercases email", () => {
    const parsed = signInSchema.safeParse({
      email: "Founder@Example.com",
      password: "x",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.email, "founder@example.com");
  });

  it("rejects missing password", () => {
    assert.equal(signInSchema.safeParse({ email: "a@b.com", password: "" }).success, false);
  });
});

describe("signUpSchema", () => {
  it("accepts a complete payload", () => {
    const parsed = signUpSchema.safeParse({
      email: "user@example.com",
      password: "Secret1x",
      fullName: "  Ada Lovelace  ",
      refCode: "ABC123",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.fullName, "Ada Lovelace");
      assert.equal(parsed.data.refCode, "abc123");
    }
  });
});
