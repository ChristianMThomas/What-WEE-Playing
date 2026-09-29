import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/csp";

// Production is a static export (out/), uploaded to Hostinger as plain files
// (DEPLOY.md), so there's no server: no proxy, Server Actions, headers or
// rewrites. The dev server keeps the headers and the /supabase rewrite below;
// in production the headers come from the .htaccess that
// scripts/finish-export.mjs adds to the build.
const isDev = process.env.NODE_ENV === "development";

// Without a trailing slash, to match src/lib/supabase/env.ts.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
// The local Supabase stack is plain http on this machine, which a phone can't
// reach. Serve it under /supabase on this site instead (Realtime's websocket
// included), so a phone on the https tunnel only needs this one origin.
// src/lib/supabase/controller.ts makes the phone use it.
const localSupabase = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);

// The tunnel's hostname (NEXT_PUBLIC_APP_URL), so the dev server accepts requests through it.
const publicHost = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null;

const nextConfig: NextConfig = isDev
  ? {
      ...(publicHost ? { allowedDevOrigins: [publicHost] } : {}),
      async headers() {
        const headers = securityHeaders(supabaseUrl, true).map(([key, value]) => ({ key, value }));
        return [{ source: "/:path*", headers }];
      },
      async rewrites() {
        return localSupabase ? [{ source: "/supabase/:path*", destination: `${supabaseUrl}/:path*` }] : [];
      },
    }
  : {
      output: "export",
      // /bowling/game/index.html rather than /bowling/game.html, so plain file hosting finds every page.
      trailingSlash: true,
    };

export default nextConfig;
