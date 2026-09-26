// Content-Security-Policy (md/02-authentication-and-sessions.md). Session cookies
// are readable by page scripts, so the CSP is what stops an injected script from
// running or sending them anywhere. The proxy sets it with a fresh nonce per
// request, and Next adds the nonce to its own scripts.

/**
 * Builds the policy for one request.
 * - Scripts: only ones carrying the nonce, plus what they load ('strict-dynamic').
 *   'wasm-unsafe-eval' is for Rapier's WASM; 'unsafe-eval' is only for React's dev tooling.
 * - Styles: 'unsafe-inline', because React style props are inline style attributes,
 *   which a nonce can't cover.
 * - Connections: this site, plus the Supabase API and its Realtime websocket.
 */
export function contentSecurityPolicy(nonce: string, supabaseUrl: string, isDev: boolean): string {
  const supabase = new URL(supabaseUrl);
  const realtime = `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "media-src 'self'",
    `connect-src 'self' ${supabase.origin} ${realtime}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Local Supabase is plain http, so only upgrade in production.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
