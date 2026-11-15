# Paisa: personal expense tracker for India

Next.js 16 (App Router, Cache Components), MongoDB/Mongoose, JWT cookie auth.
Money is integer paise, dates are IST, the financial year runs April to March. See
[CLAUDE.md](CLAUDE.md) for conventions and [docs/design-system.md](docs/design-system.md) for the UI.

## Develop

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET
npm run dev:local            # local MongoDB on :27017 (persisted in .data/) + next dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e:prod`.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string. |
| `AUTH_SECRET` | yes | ≥ 32 random characters; signs session cookies. Checked at boot. |
| `APP_URL` | production | Public base URL for links in emails, e.g. `https://paisa.example.com`. |
| `CRON_SECRET` | for recurring entries | ≥ 32 random characters; Vercel Cron sends it to `/api/cron/recurring`. Unset = route disabled. |
| `AUTH_RATE_LIMIT_MAX` | no | Sign-in/up attempts per IP and per email per 15 min (default 10). |

## Deploy on Vercel + MongoDB Atlas

1. **Atlas**
   - Create a cluster in Mumbai (`ap-south-1`) to keep data in India and latency low.
   - Add a database user with the built-in role **readWrite on the `paisa` database only** (not `atlasAdmin`).
   - Network Access: Vercel's IPs change, so allow `0.0.0.0/0` and rely on the strong password, or use Vercel's Secure Compute / Atlas private endpoints on paid plans.
   - The connection string is `mongodb+srv://USER:PASS@cluster.../paisa?retryWrites=true&w=majority`.
2. **Vercel**
   - Import the repo. The framework preset is Next.js; keep the default build command.
   - Set `MONGODB_URI`, `AUTH_SECRET`, `CRON_SECRET` and `APP_URL` for Production (and Preview, with a separate database).
   - Function region: `bom1` (Mumbai), next to the database.
3. **Cron**: `vercel.json` schedules `/api/cron/recurring` daily at 00:30 UTC (06:00 IST). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
4. **Indexes**: Mongoose creates the schema indexes on first connect, including the unique email index, `{userId, deletedAt, date}`, `{userId, categoryId, date}`, and the TTL indexes for rate limits and reset tokens. Check them in Atlas → Collections → Indexes after the first sign-up.
5. **Smoke test** after each deploy (see below).

### Post-deploy smoke test

- [ ] `GET /api/health` → `{"status":"ok"}`.
- [ ] Response headers on `/login` include `content-security-policy`, `strict-transport-security` and `x-content-type-options: nosniff`.
- [ ] Signed out, `/manifest.json`, `/sw.js` and `/icon-192.png` load (no redirect to `/login`).
- [ ] Sign up → dashboard, then add an expense with a receipt and open the receipt.
- [ ] In a private window, open that receipt URL: you get 401, not the file.
- [ ] Sign out, then sign in. Five wrong passwords lock that email for 15 minutes.
- [ ] Preferences → change password; a second signed-in browser is signed out.
- [ ] Preferences → download JSON and CSV; the CSV opens cleanly in Excel or Sheets.
- [ ] Trigger the cron once in Vercel → Settings → Cron Jobs → Run, and check the logs show `{ users, generated }`.
- [ ] Delete a throwaway account, then confirm it can't sign in.

## Email (not wired yet)

Password reset needs an email provider. Until one is configured, production shows "email isn't set up" on
`/forgot-password` and sends nothing; in development the reset link is printed to the server console.
`lib/mail.ts` is the single place to plug a provider in.
