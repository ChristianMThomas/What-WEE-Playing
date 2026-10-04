// Security headers (md/02-authentication-and-sessions.md). Session cookies are
// readable by page scripts, so the CSP is what stops an injected script from
// sending them anywhere.
//
// The site is static files (DEPLOY.md). In production these headers come from
// the .htaccess that scripts/finish-export.mjs writes into the build; in
// development next.config.ts sends them.

/**
 * Builds the Content-Security-Policy.
 * - Scripts: this site only. 'unsafe-inline' is needed because a static export
 *   carries Next's page data in inline scripts and there's no server to add a
 *   per-request nonce; nothing renders user content as HTML, so there's no
 *   route for injected markup. 'wasm-unsafe-eval' is for Rapier's WASM, and
 *   'unsafe-eval' only for React's dev tooling.
 * - Styles: 'unsafe-inline', because React style props are inline style attributes.
 * - Connections: this site, plus the Supabase API and its Realtime websocket.
 */
export function contentSecurityPolicy(supabaseUrl: string, isDev: boolean): string {
  const supabase = new URL(supabaseUrl);
  const realtime = `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`;

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
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

/** Every security header, as [name, value] pairs. */
export function securityHeaders(supabaseUrl: string, isDev: boolean): [string, string][] {
  return [
    ["Content-Security-Policy", contentSecurityPolicy(supabaseUrl, isDev)],
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    // Keeps pairing tokens in URLs from leaking to other sites through Referer.
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    // Only this site may use the phone's camera (QR scan), motion sensors (swings
    // and the pointer) and wake lock (/controller); everything else is off.
    // The magnetometer is needed because Chromium gates deviceorientationabsolute
    // on it, which is the pointer's fallback where the relative event never fires.
    [
      "Permissions-Policy",
      "camera=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), screen-wake-lock=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    ],
    ...(isDev ? [] : [["Strict-Transport-Security", "max-age=63072000; includeSubDomains"] as [string, string]]),
  ];
}
