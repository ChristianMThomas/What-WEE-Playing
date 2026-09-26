import { describe, expect, it } from "vitest";
import { SEEN_CHECK_INTERVAL_S, signSeen, verifySeen } from "./seen-cookie";

const SECRET = "test-secret";
const USER = "3f0c9a2e-1111-4222-8333-944455556666";
const NOW = 1_800_000_000;

describe("seen cookie", () => {
  it("accepts a fresh cookie for the same user", async () => {
    const value = await signSeen(SECRET, USER, NOW);
    expect(await verifySeen(SECRET, value, USER, NOW + 60)).toBe(true);
  });

  it("rejects a cookie once the check interval has passed", async () => {
    const value = await signSeen(SECRET, USER, NOW);
    expect(await verifySeen(SECRET, value, USER, NOW + SEEN_CHECK_INTERVAL_S)).toBe(false);
  });

  it("rejects a cookie issued in the future", async () => {
    const value = await signSeen(SECRET, USER, NOW + 60);
    expect(await verifySeen(SECRET, value, USER, NOW)).toBe(false);
  });

  it("rejects another user's cookie", async () => {
    const value = await signSeen(SECRET, "someone-else", NOW);
    expect(await verifySeen(SECRET, value, USER, NOW)).toBe(false);
  });

  it("rejects a forged or tampered cookie", async () => {
    const value = await signSeen(SECRET, USER, NOW);
    const [id, , signature] = value.split(".");
    expect(await verifySeen(SECRET, `${id}.${NOW + 30}.${signature}`, USER, NOW + 60)).toBe(false);
    expect(await verifySeen(SECRET, USER, USER, NOW)).toBe(false);
    expect(await verifySeen(SECRET, `${USER}.${NOW}.x`, USER, NOW)).toBe(false);
    expect(await verifySeen("other-secret", value, USER, NOW)).toBe(false);
    expect(await verifySeen(SECRET, undefined, USER, NOW)).toBe(false);
  });
});
