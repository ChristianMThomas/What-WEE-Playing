import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./csp";

const directive = (policy: string, name: string) => policy.split("; ").find((d) => d.startsWith(`${name} `));

describe("contentSecurityPolicy", () => {
  it("allows the hosted Supabase API and its Realtime websocket", () => {
    const policy = contentSecurityPolicy("https://xyz.supabase.co", false);
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("uses plain ws for the local stack in development", () => {
    const policy = contentSecurityPolicy("http://127.0.0.1:54321", true);
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("only runs this site's scripts, and allows eval only in development", () => {
    expect(directive(contentSecurityPolicy("https://x.supabase.co", false), "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    );
    expect(directive(contentSecurityPolicy("https://x.supabase.co", true), "script-src")).toContain("'unsafe-eval'");
  });

  it("can't be framed", () => {
    expect(contentSecurityPolicy("https://x.supabase.co", false)).toContain("frame-ancestors 'none'");
  });
});

describe("securityHeaders", () => {
  it("sends HSTS only in production", () => {
    const names = (isDev: boolean) => securityHeaders("https://x.supabase.co", isDev).map(([name]) => name);
    expect(names(false)).toContain("Strict-Transport-Security");
    expect(names(true)).not.toContain("Strict-Transport-Security");
  });
});
