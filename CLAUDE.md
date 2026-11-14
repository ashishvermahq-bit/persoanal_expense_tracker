# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a personal expense tracker that is currently an untouched `create-next-app` scaffold: [app/page.tsx](app/page.tsx) and the metadata in [app/layout.tsx](app/layout.tsx) are still the template defaults. There is no data layer, API routes, or test setup yet — new features establish those conventions rather than follow existing ones.

## Commands

No lockfile is committed; the README uses npm.

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — production build (also the type check; there is no separate `typecheck` script — use `npx tsc --noEmit` for types only)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript); lint one file with `npx eslint app/page.tsx`

There is no test runner configured.

## Stack and non-default configuration

- Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript strict, Tailwind CSS 4.3.
- These versions are recent — verify Next.js APIs against the installed package (`node_modules/next`) or current docs rather than assuming older behaviour.
- [next.config.ts](next.config.ts) enables options that change how pages must be written:
  - `cacheComponents: true` — routes are prerendered by default; uncached data access or request-time APIs (`cookies()`, `headers()`, `searchParams`, etc.) must be inside a `<Suspense>` boundary or be explicitly cached with the `"use cache"` directive, otherwise the build errors.
  - `partialPrefetching: true` and `experimental.agentFeedback: true` are also on.
- Tailwind is wired through a Turbopack loader rule (`@tailwindcss/turbopack` on `*.css`) in `next.config.ts`, not through PostCSS — there is no `postcss.config.*` or `tailwind.config.*`. Theme tokens are defined in CSS via `@theme inline` in [app/globals.css](app/globals.css) (`background`, `foreground`, Geist font variables), with dark mode driven by `prefers-color-scheme`.
- Path alias `@/*` maps to the repository root (not `src/`).
- Layout props use the globally generated `LayoutProps<"/">` / `PageProps<...>` route types (produced by `next dev` / `next build` / `npx next typegen`), so no import is needed for them.
