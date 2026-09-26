// The boot notice (src/app/notice): shown once per browser session, like the
// Wii's health and safety screen at power-on.

/** Set when the notice is acknowledged. A session cookie, so it shows again after the browser closes. */
export const NOTICE_COOKIE = "wwp-notice";

/**
 * Where to go after the notice. Only same-site paths are allowed, so a crafted
 * link like /notice?next=https://evil.example can't send people off-site.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  // "//host" and "/\host" are treated as other origins by browsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/notice" || next.startsWith("/notice?") || next.startsWith("/notice/")) return "/";
  return next;
}
