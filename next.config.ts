import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e runner boot its own `next dev` beside a developer's running one
  // (Next locks one dev server per distDir). See tests/e2e/server.mjs.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
};

export default nextConfig;
