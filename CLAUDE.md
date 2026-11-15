# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Turbopack, http://localhost:3000)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint (not next lint — that was removed in Next.js 16)
npm run typecheck # tsc --noEmit (run `npx next typegen` first if LayoutProps/PageProps are missing)
npm test          # Vitest unit tests in tests/unit (model tests spin up mongodb-memory-server)
npm run test:e2e  # Playwright e2e in tests/e2e
```

## Domain conventions (do not break these)

- **Money is integer paise.** Every `amountPaise` field and every API payload is an integer (₹450.50 → `45050`). Use `toPaise` / `formatPaise` in `lib/money.ts`; never store or compute with rupee floats. Display uses `Intl.NumberFormat('en-IN')` → `₹1,23,456.78`.
- **Dates are IST.** All "today / this month / this FY" logic goes through `lib/dates.ts` (`todayIST`, `monthRange`, `fyRange`, …). Display is DD/MM/YYYY. Indian FY = 1 Apr – 31 Mar, labelled by start year (`fyLabel(2025)` → "FY 2025-26"); users can switch to calendar year via `preferences.fyStart`.
- **Enums live in `types/models.ts`** (`PAYMENT_METHODS`, `TAX_SECTIONS`, …) and are imported by Mongoose schemas, Zod validators and UI alike. Add new values there only.
- **Every query is scoped by `userId`** and soft-deleted rows (`deletedAt !== null`) are excluded. System categories have `userId: null, isSystem: true` and are seeded by `lib/seed/categories.ts`.
- `MonthlySummary` is a cache; recompute it after any expense/income write for the affected month rather than editing it directly.

## Auth & API conventions

- Session = HS256 JWT (`jose`) in an HTTP-only `session` cookie, 7-day TTL. `lib/auth/session.ts` is edge-safe and used by `proxy.ts`; `lib/auth/cookies.ts` wraps `next/headers` for server code. `getCurrentUser()` (`lib/auth/current-user.ts`) is the Server Component helper.
- `proxy.ts` is an *optimistic* gate (signature/expiry only). Every `/api/*` route handler must still use `withAuth` from `lib/api.ts`, which verifies the cookie, connects to Mongo and hands you `{ userId }`.
- API envelope: `{ data }` or `{ error: { code, message, fields? } }`. Throw `ApiError` inside handlers; validate bodies with `parseBody(request, zodSchema)`. Client components call routes through `api()` in `lib/client.ts`, which throws `ApiClientError` with `.fields` for inline form errors.
- Zod v4: put `.trim().toLowerCase()` *before* format checks via `.pipe(z.email())`; map issues to fields with `fieldErrors()` (first issue per field wins).
- Pages that read cookies / DB must render that part inside `<Suspense>` (cacheComponents). Interactive e2e tests live in `tests/e2e` and boot their own in-memory Mongo via `tests/e2e/server.mjs`; they are slow on first run because `next dev` compiles routes on demand.

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
