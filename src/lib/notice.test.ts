import { describe, expect, it } from "vitest";
import { safeNext } from "./notice";

describe("safeNext", () => {
  it.each(["/", "/settings", "/settings/system?page=2", "/login"])("keeps same-site path %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    ["an absolute URL", "https://evil.example"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a tab trick", "/\t/evil.example"],
    ["a newline trick", "/\n/evil.example"],
    ["a carriage return trick", "/\r\n/evil.example"],
    ["a backslash later on", "/foo/..\\..\\evil.example"],
    ["a relative path", "settings"],
    ["the notice itself", "/notice"],
    ["the notice with a query", "/notice?next=/"],
    ["nothing", undefined],
    ["an array", ["/settings"]],
  ])("falls back to home for %s", (_, value) => {
    expect(safeNext(value)).toBe("/");
  });
});
