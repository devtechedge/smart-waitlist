import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEmailOnAllowList, parseAdminAllowList } from "./admin-allowlist.ts";

describe("parseAdminAllowList", () => {
  it("splits, trims, and lowercases", () => {
    assert.deepEqual(parseAdminAllowList(" Admin@x.com, founder@X.com "), [
      "admin@x.com",
      "founder@x.com",
    ]);
  });

  it("returns empty for blank input", () => {
    assert.deepEqual(parseAdminAllowList(""), []);
    assert.deepEqual(parseAdminAllowList(null), []);
    assert.deepEqual(parseAdminAllowList("   ,  "), []);
  });
});

describe("isEmailOnAllowList", () => {
  const list = parseAdminAllowList("admin@example.com,founder@example.com");

  it("is case-insensitive", () => {
    assert.equal(isEmailOnAllowList("Founder@Example.com", list), true);
    assert.equal(isEmailOnAllowList("nobody@example.com", list), false);
  });

  it("denies everyone when the list is empty", () => {
    assert.equal(isEmailOnAllowList("admin@example.com", []), false);
  });
});
