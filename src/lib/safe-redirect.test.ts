import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "./safe-redirect.ts";

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
    assert.equal(safeRedirectPath("/admin?tab=fraud"), "/admin?tab=fraud");
  });

  it("rejects open redirects", () => {
    assert.equal(safeRedirectPath("https://evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("javascript:alert(1)"), "/dashboard");
    assert.equal(safeRedirectPath("\\evil"), "/dashboard");
    assert.equal(safeRedirectPath("dashboard"), "/dashboard");
    assert.equal(safeRedirectPath(""), "/dashboard");
  });

  it("honors a custom fallback", () => {
    assert.equal(safeRedirectPath("https://evil.com", "/"), "/");
  });
});
