// The boot notice (src/app/notice): shown once per browser session, like the
// Wii's health and safety screen at power-on.

/** Set when the notice is acknowledged. A session cookie, so it shows again after the browser closes. */
export const NOTICE_COOKIE = "wwp-notice";

/** Whether this browser session has seen the notice. Browser only. */
export function noticeSeen(): boolean {
  return document.cookie.split("; ").includes(`${NOTICE_COOKIE}=1`);
}

export function markNoticeSeen() {
  // No max-age, so the browser drops it when it closes.
  document.cookie = `${NOTICE_COOKIE}=1; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

/**
 * Where to go after the notice. Only same-site paths are allowed, so a crafted
 * link like /notice?next=https://evil.example can't send people off-site.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  // "//host" and "/\host" are treated as other origins by browsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  // Browsers strip tabs and newlines from URLs, so "/\t/host" also becomes "//host".
  if (/[\x00-\x1f\x7f\\]/.test(next)) return "/";
  if (next === "/notice" || next.startsWith("/notice?") || next.startsWith("/notice/")) return "/";
  return next;
}
