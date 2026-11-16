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
| `RESEND_API_KEY` | for password reset | Resend API key (`re_…`), sending access only. Set together with `EMAIL_FROM`. |
| `EMAIL_FROM` | for password reset | Sender, e.g. `Paisa <no-reply@paisa.example.com>`, on a domain verified in Resend. |
| `AUTH_RATE_LIMIT_MAX` | no | Sign-in/up attempts per IP and per email per 15 min (default 10). |

## Deploy on Vercel + MongoDB Atlas

1. **Atlas**
   - Create a cluster in Mumbai (`ap-south-1`) to keep data in India and latency low.
   - Add a database user with the built-in role **readWrite on the `paisa` database only** (not `atlasAdmin`).
   - Network Access: Vercel's IPs change, so allow `0.0.0.0/0` and rely on the strong password, or use Vercel's Secure Compute / Atlas private endpoints on paid plans.
   - The connection string is `mongodb+srv://USER:PASS@cluster.../paisa?retryWrites=true&w=majority`.
2. **Vercel**
   - Import the repo. The framework preset is Next.js; keep the default build command.
   - Set `MONGODB_URI`, `AUTH_SECRET`, `CRON_SECRET`, `APP_URL`, `RESEND_API_KEY` and `EMAIL_FROM` for Production (and Preview, with a separate database).
   - Functions run in `bom1` (Mumbai, set in `vercel.json`), next to the database.
   - Env var changes need a redeploy (the `/forgot-password` page reads the email setting at build time).
3. **Resend**
   - Add your domain in Resend → Domains and create the DNS records it lists (SPF, DKIM, and optionally DMARC) at your DNS provider. Wait until it shows *Verified*.
   - Create an API key with **Sending access** only, restricted to that domain, and put it in `RESEND_API_KEY`.
   - Use an address on that domain as `EMAIL_FROM`. The app checks both at boot and refuses to start if only one is set.
4. **Cron**: `vercel.json` schedules `/api/cron/recurring` daily at 00:30 UTC (06:00 IST). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. The same run deletes receipts no expense uses (after a 24-hour grace period; receipts of deleted-but-undoable expenses are kept).
   - **Storage**: receipts are stored in MongoDB, capped at 4 MB each, 50 MB per user and 30 uploads per hour. Atlas M0 holds 512 MB in total, so move to a paid tier (or a bucket behind `lib/storage.ts`) before you have many users who attach receipts.
5. **Indexes**: Mongoose creates the schema indexes on first connect, including the unique email index, `{userId, deletedAt, date}`, `{userId, categoryId, date}`, and the TTL indexes for rate limits and reset tokens. Check them in Atlas → Collections → Indexes after the first sign-up.
6. **Smoke test** after each deploy (see below).

### Post-deploy smoke test

- [ ] `GET /api/health` → `{"status":"ok"}`.
- [ ] Response headers on `/login` include `content-security-policy`, `strict-transport-security` and `x-content-type-options: nosniff`.
- [ ] Signed out, `/manifest.json`, `/sw.js` and `/icon-192.png` load (no redirect to `/login`).
- [ ] Sign up → dashboard, then add an expense with a receipt and open the receipt.
- [ ] In a private window, open that receipt URL: you get 401, not the file.
- [ ] Sign out, then sign in. Five wrong passwords lock that email for 15 minutes.
- [ ] Forgot password with your own email: the email arrives (check spam the first time), the link works once, and other signed-in devices are signed out.
- [ ] Preferences → change password; a second signed-in browser is signed out.
- [ ] Preferences → download JSON and CSV; the CSV opens cleanly in Excel or Sheets.
- [ ] Trigger the cron once in Vercel → Settings → Cron Jobs → Run, and check the logs show `{ users, generated }`.
- [ ] Delete a throwaway account, then confirm it can't sign in.

## Email

Password reset email goes through Resend's HTTP API ([lib/mail.ts](lib/mail.ts), plain `fetch`, no SDK).
The token write and the send run after the response (`after()`), so the forgot endpoint answers equally
fast for registered and unknown addresses. Without `RESEND_API_KEY`/`EMAIL_FROM`, development prints the
reset link to the server console and production shows "email isn't set up" on `/forgot-password`.
