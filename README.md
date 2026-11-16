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
| `CRON_SECRET` | for recurring entries | ≥ 32 random characters; the compose `jobs` service sends it to `/api/cron/recurring`. Unset = route disabled. |
| `RESEND_API_KEY` | for password reset | Resend API key (`re_…`), sending access only. Set together with `EMAIL_FROM`. |
| `EMAIL_FROM` | for password reset | Sender, e.g. `Paisa <no-reply@paisa.example.com>`, on a domain verified in Resend. |
| `AUTH_RATE_LIMIT_MAX` | no | Sign-in/up attempts per IP and per email per 15 min (default 10). |

## Deploy: a VM on ESXi, Docker Compose, nginx

```
browser ──https──▶ nginx (host, :443) ──▶ app (Docker, 127.0.0.1:3000) ──▶ mongo (Docker, no port)
                                           ▲
                                  jobs (Docker, hourly: recurring entries + receipt cleanup)
```

Files: [Dockerfile](Dockerfile), [deploy/compose.yaml](deploy/compose.yaml),
[deploy/.env.example](deploy/.env.example), [deploy/nginx/paisa.conf](deploy/nginx/paisa.conf),
[deploy/backup.sh](deploy/backup.sh).

1. **VM**: Ubuntu Server 24.04 LTS, 2 vCPU, 4 GB RAM, 40 GB disk (thin provisioned is fine).
   - MongoDB 5+ needs a CPU with AVX. Check with `grep -c avx /proc/cpuinfo` (must be > 0). If it's 0, the
     ESXi host is masking it (EVC mode); raise or disable EVC for the VM's cluster.
   - Give the VM a fixed IP (DHCP reservation or netplan).
2. **Software** on the VM: Docker Engine + Compose plugin (docs.docker.com/engine/install/ubuntu), plus
   `sudo apt install nginx git` and, for a public domain, `certbot`.
3. **Code and secrets**
   ```bash
   sudo git clone https://github.com/<you>/<repo>.git /opt/paisa && cd /opt/paisa/deploy
   sudo cp .env.example .env && sudo chmod 600 .env
   openssl rand -hex 32   # run 4×: AUTH_SECRET, CRON_SECRET, MONGO_ROOT_PASSWORD, MONGO_APP_PASSWORD
   sudo nano .env         # also APP_URL (exact https address people will use), Resend if you have it
   sudo docker compose up -d --build       # first build takes a few minutes
   sudo docker compose ps                  # app and mongo should say (healthy)
   ```
   The MongoDB users are created on the very first start only. If you change `MONGO_*` passwords later you
   must change them inside MongoDB too (or, with no data yet, `docker compose down -v` and start again).
4. **HTTPS + nginx** (required: the session cookie is `Secure`, so plain `http://` sign-in never works)
   - Public domain: point its DNS at your public IP, forward ports 80 and 443 on your router to the VM, then
     `sudo certbot certonly --webroot -w /var/www/html -d paisa.example.com`.
   - LAN only: use a certificate from your own CA (e.g. `mkcert`, with its root CA installed on each phone and
     laptop). A self-signed certificate that browsers warn about also stops the app's offline service worker.
   - Install the site: `sudo cp deploy/nginx/paisa.conf /etc/nginx/sites-available/paisa`, replace
     `paisa.example.com` and the two certificate paths, `sudo ln -s /etc/nginx/sites-available/paisa
     /etc/nginx/sites-enabled/`, `sudo rm /etc/nginx/sites-enabled/default`, `sudo nginx -t && sudo systemctl
     reload nginx`.
   - Firewall: `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`. Port 3000 is bound
     to 127.0.0.1 and MongoDB has no published port, so neither is reachable from the network.
   - nginx must stay the only way in: the app trusts its `X-Real-IP` for sign-in rate limits and its
     `X-Forwarded-Host` for the CSRF check. If something else sits in front (Cloudflare Tunnel, another
     proxy), configure nginx's `real_ip` module for it.
5. **Email (Resend)**
   - Add your domain in Resend → Domains and create the DNS records it lists (SPF, DKIM, and optionally DMARC). Wait until it shows *Verified*.
   - Create an API key with **Sending access** only, restricted to that domain, and put it in `RESEND_API_KEY`.
   - Use an address on that domain as `EMAIL_FROM`. The app checks both at boot and refuses to start if only one is set.
   - After editing `deploy/.env`: `sudo docker compose up -d` (recreates the app with the new values; no rebuild needed).
6. **Recurring entries and cleanup**: the `jobs` service calls `/api/cron/recurring` every hour with
   `Authorization: Bearer $CRON_SECRET` (runs are idempotent). The same run deletes receipts no expense uses
   after a 24-hour grace period; receipts of deleted-but-undoable expenses are kept.
   `sudo docker compose logs jobs` shows each run's `{ users, generated, … }`.
7. **Backups**: `sudo crontab -e` and add
   `15 2 * * * /opt/paisa/deploy/backup.sh >> /var/log/paisa-backup.log 2>&1` (daily dump, 14 kept, in
   `deploy/backups/`; restore command in the script). Copy them off the VM too: a VM snapshot or an ESXi-level
   backup is not a substitute, and a dump on the same disk dies with it.
   - **Storage**: receipts are stored in MongoDB, capped at 4 MB each, 50 MB per user and 30 uploads per hour.
8. **Updates**: `cd /opt/paisa && sudo git pull && cd deploy && sudo docker compose up -d --build`. Sign-ins
   survive (they're in the cookie, signed with `AUTH_SECRET`); a running request gets 30 s to finish.
9. **Indexes**: Mongoose creates the schema indexes on first connect, including the unique email index, `{userId, deletedAt, date}`, `{userId, categoryId, date}`, and the TTL indexes for rate limits and reset tokens.
10. **Smoke test** after each deploy (see below).

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
- [ ] `sudo docker compose logs jobs` shows `{"data":{"users":…,"generated":…}}`, not an error.
- [ ] From another machine, `http://<vm-ip>:3000` and `<vm-ip>:27017` do not connect.
- [ ] Delete a throwaway account, then confirm it can't sign in.

## Email

Password reset email goes through Resend's HTTP API ([lib/mail.ts](lib/mail.ts), plain `fetch`, no SDK).
The token write and the send run after the response (`after()`), so the forgot endpoint answers equally
fast for registered and unknown addresses. Without `RESEND_API_KEY`/`EMAIL_FROM`, development prints the
reset link to the server console and production shows "email isn't set up" on `/forgot-password`.
