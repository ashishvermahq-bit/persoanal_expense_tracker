import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * script-src keeps 'unsafe-inline' on purpose: with cacheComponents (Partial
 * Prerendering) the static shell is built once, so a per-request nonce can't be
 * stamped into it, and Next streams the RSC payload as inline <script> tags whose
 * contents change per page, so they can't be hashed either. (Adding a nonce or hash
 * would also make browsers ignore 'unsafe-inline' and break hydration.) Everything
 * else is locked to this origin: no third-party scripts, no eval in production,
 * no plugins, no framing, no form posts or <base> elsewhere. React escapes all
 * rendered text, so the remaining inline-script risk is limited to code we write
 * with dangerouslySetInnerHTML (only the static theme boot script).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "frame-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Lets the e2e runner boot its own `next dev` beside a developer's running one
  // (Next locks one dev server per distDir). See tests/e2e/server.mjs.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The Docker image (Dockerfile) builds a self-contained server.js; `next start` and dev don't.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // X-Accel-Buffering: nginx would otherwise buffer streamed (Suspense/PPR) responses.
      { source: "/:path*", headers: [...securityHeaders, { key: "X-Accel-Buffering", value: "no" }] },
      // HSTS only when the request arrived over HTTPS (nginx sets x-forwarded-proto),
      // never on http://localhost, where it would stick to every local dev server.
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }],
      },
      // Authenticated JSON must never sit in a shared or browser cache.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
