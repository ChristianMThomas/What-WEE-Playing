import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

const directive = (policy: string, name: string) =>
  policy.split("; ").find((d) => d.startsWith(`${name} `));

describe("contentSecurityPolicy", () => {
  it("allows a hosted Supabase project over https and wss", () => {
    const policy = contentSecurityPolicy("abc", "https://xyz.supabase.co", false);
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("allows local Supabase over http and ws in development", () => {
    const policy = contentSecurityPolicy("abc", "http://127.0.0.1:54321", true);
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("only runs nonced scripts, plus WASM, and eval only in development", () => {
    expect(directive(contentSecurityPolicy("abc", "https://x.supabase.co", false), "script-src")).toBe(
      "script-src 'self' 'nonce-abc' 'strict-dynamic' 'wasm-unsafe-eval'",
    );
    expect(directive(contentSecurityPolicy("abc", "https://x.supabase.co", true), "script-src")).toContain(
      "'unsafe-eval'",
    );
  });

  it("can't be framed", () => {
    expect(contentSecurityPolicy("abc", "https://x.supabase.co", false)).toContain("frame-ancestors 'none'");
  });
});
