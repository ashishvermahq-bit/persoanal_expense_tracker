# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Turbopack, http://localhost:3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint (not next lint — that was removed in Next.js 16)
```

## This is Next.js 16 — read the bundled docs before writing code

APIs, conventions, and defaults differ significantly from Next.js 13–15. Before writing or modifying any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Key breaking changes from Next.js 15→16:

**Async Request APIs (required)** — `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are all async. Always `await` them:
```tsx
export default async function Page(props: PageProps<'/[slug]'>) {
  const { slug } = await props.params
}
```
Run `npx next typegen` to generate globally available `PageProps<>`, `LayoutProps<>`, and `RouteContext<>` helpers (already used in `app/layout.tsx`).

**Turbopack is the default** — `next dev` and `next build` both use Turbopack. No `--turbopack` flag needed. Use `--webpack` to opt out. Sass tilde imports (`~bootstrap/...`) are not supported; remove the `~` prefix.

**`cacheComponents: true`** — This project has PPR (Partial Prerendering / Cache Components) enabled. Data fetches outside `<Suspense>` will cause build errors. Wrap dynamic data in Suspense.

**`next lint` is removed** — Use `npm run lint` (runs `eslint` directly). `next build` no longer lints.

**`middleware.ts` → `proxy.ts`** — The middleware file convention is renamed. The `edge` runtime is not supported in proxy; use `nodejs` runtime or keep using `middleware.ts` for edge.

**Parallel routes require `default.js`** — Every `@slot` directory needs an explicit `default.tsx` or the build fails.

**`revalidateTag` requires a second argument** — `revalidateTag('key', 'max')` not `revalidateTag('key')`. Use `updateTag` for immediate read-your-writes semantics in Server Actions.

**`serverRuntimeConfig` / `publicRuntimeConfig` removed** — Use environment variables: `process.env.SECRET` for server, `NEXT_PUBLIC_VAR` for client.

## Architecture

- **App Router** (`app/`) — all routes use the App Router. No Pages Router.
- **Server Components by default** — layouts and pages are Server Components unless marked `'use client'`.
- **Tailwind CSS 4** — configured via `@tailwindcss/turbopack` loader in `next.config.ts`, not via `tailwind.config.js`.
- **Path alias** — `@/*` maps to the repo root (e.g. `@/app/...`, `@/components/...`).
- **TypeScript strict mode** — `strict: true` in `tsconfig.json`.
