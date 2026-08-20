import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csvRow, escapeCsv } from "./csv.ts";

describe("escapeCsv", () => {
  it("leaves simple fields unquoted", () => {
    assert.equal(escapeCsv("hello"), "hello");
    assert.equal(escapeCsv(42), "42");
    assert.equal(escapeCsv(null), "");
  });

  it("quotes commas, quotes, and newlines", () => {
    assert.equal(escapeCsv("a,b"), '"a,b"');
    assert.equal(escapeCsv('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCsv("line1\nline2"), '"line1\nline2"');
  });
});

describe("csvRow", () => {
  it("joins escaped fields", () => {
    assert.equal(csvRow(["a", "b,c", 3]), 'a,"b,c",3');
  });
});
