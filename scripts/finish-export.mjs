// Finishes the static export in out/ after `next build` (DEPLOY.md):
//
// 1. Flattens Next's segment prefetch files. The client asks for
//    __next.<segments joined with dots>.txt (convertSegmentPathToStaticExportFilename
//    in next/dist/shared/lib/segment-cache), but for routes more than one segment
//    deep the export writes them into nested folders instead, e.g.
//    register/__next.!KGF1dGgp/register/__PAGE__.txt. Without this, those
//    prefetches 404 and navigation falls back to slower full loads.
// 2. Writes out/.htaccess. Hostinger's web server reads it, so this is where the
//    security headers a server would have sent come from, built from
//    src/lib/csp.ts with the same Supabase URL the build used.

import { cpSync, existsSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

function flattenSegmentFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (!name.startsWith("__next.")) {
      flattenSegmentFiles(path);
      continue;
    }
    const files = (function walk(d) {
      return readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    })(path);
    for (const file of files) {
      const flat = [name, ...relative(path, file).split(sep)].join(".");
      cpSync(file, join(dir, flat));
    }
    rmSync(path, { recursive: true });
  }
}
flattenSegmentFiles("out");
import { securityHeaders } from "../src/lib/csp.ts";

// The same files, in the same priority order, that next build reads. loadEnvFile
// never overwrites a variable that's already set, so the first file wins.
for (const file of [".env.production.local", ".env.local", ".env.production", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL isn't set; see DEPLOY.md.");

const headers = securityHeaders(supabaseUrl, false)
  .map(([name, value]) => `  Header always set ${name} "${value}"`)
  .join("\n");
// A private fan project: no search engine should index or follow anything on it,
// including files that aren't pages (public/robots.txt and each page's meta tag cover the rest).
const noIndex = '  Header always set X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex"';

writeFileSync(
  "out/.htaccess",
  `# Written by scripts/finish-export.mjs during npm run build. Edit that, not this.
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_headers.c>
${headers}
${noIndex}

  # Pages always check for a new version; Next's build files have hashed
  # names that change with their content, so browsers can keep them.
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
`,
);
console.log(`Wrote out/.htaccess (Supabase: ${new URL(supabaseUrl).origin})`);
if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)) {
  console.warn(
    "\nThis build uses the LOCAL Supabase. Don't upload it: add .env.production.local with the hosted project first (DEPLOY.md).",
  );
}
