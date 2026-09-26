import { describe, expect, it } from "vitest";
import { parseLogin, parseRegistration, passwordChecks } from "./validation";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  email: "bowler@example.com",
  password: "Strikes4days!",
  username: "Pin_Pal",
  skinTone: "medium",
  hairstyle: "curly",
  hairColor: "auburn",
  outfit: "bowling-shirt",
};

describe("parseRegistration", () => {
  it("accepts a valid registration and trims email and username", () => {
    const result = parseRegistration(form({ ...valid, email: " bowler@example.com ", username: " Pin_Pal " }));
    expect(result).toEqual({ ok: true, data: valid });
  });

  it.each([
    ["username", "ab"],
    ["username", "a".repeat(21)],
    ["username", "has space"],
    ["username", "emoji🎳"],
    ["email", "not-an-email"],
    ["password", "Sh0rt!"],
    ["password", "nocapital4!"],
    ["password", "NOLOWER4!"],
    ["password", "NoNumber!!"],
    ["password", "NoSymbol44"],
    ["password", "Unicode4€€"],
    ["password", `Aa1!${"x".repeat(69)}`],
    ["skinTone", "green"],
    ["hairstyle", ""],
    ["hairColor", "rainbow"],
    ["outfit", "default"],
  ])("rejects a bad %s (%s)", (field, value) => {
    const result = parseRegistration(form({ ...valid, [field]: value }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual([field]);
  });

  it("reports every bad field at once", () => {
    const result = parseRegistration(new FormData());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["email", "hairColor", "hairstyle", "outfit", "password", "skinTone", "username"],
      );
    }
  });
});

describe("parseLogin", () => {
  it("accepts an email and password", () => {
    expect(parseLogin(form({ email: "bowler@example.com", password: "x" }))).toEqual({
      ok: true,
      data: { email: "bowler@example.com", password: "x" },
    });
  });

  it("requires both fields", () => {
    const result = parseLogin(form({ email: "", password: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "password"]);
  });
});

describe("passwordChecks", () => {
  it("marks each rule as it's met", () => {
    expect(passwordChecks("").map((c) => c.met)).toEqual([false, false, false, false, false]);
    expect(passwordChecks("abcdefgh").map((c) => c.met)).toEqual([true, false, true, false, false]);
    expect(passwordChecks("Abcdefg1?").map((c) => c.met)).toEqual([true, true, true, true, true]);
  });

  it("lists everything that's missing in one message", () => {
    const result = parseRegistration(form({ ...valid, password: "abc" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.password).toBe(
        "Your password needs: at least 8 characters, an uppercase letter, a number, a symbol (like ! ? # or @).",
      );
    }
  });
});
