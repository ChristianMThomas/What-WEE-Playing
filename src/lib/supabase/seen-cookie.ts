// The wwp-seen cookie lets the proxy skip the inactivity check for an hour after
// it last recorded activity. It's signed with a server-only secret and carries
// the time it was issued, so it can't be forged or kept past that hour.

export const SEEN_COOKIE = "wwp-seen";
export const SEEN_CHECK_INTERVAL_S = 60 * 60;

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

/** Cookie value recording that `userId` was seen active at `nowS` (seconds). */
export async function signSeen(secret: string, userId: string, nowS: number): Promise<string> {
  const payload = `${userId}.${nowS}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

/** Whether the cookie is a valid, unexpired record for `userId`. */
export async function verifySeen(
  secret: string,
  value: string | undefined,
  userId: string,
  nowS: number,
): Promise<boolean> {
  if (!value) return false;
  const [id, issued, signature, ...rest] = value.split(".");
  if (rest.length > 0 || id !== userId || !signature) return false;
  const issuedS = Number(issued);
  if (!Number.isInteger(issuedS) || issuedS > nowS || nowS - issuedS >= SEEN_CHECK_INTERVAL_S) return false;

  const expected = await hmac(secret, `${id}.${issued}`);
  // Constant-time comparison.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
