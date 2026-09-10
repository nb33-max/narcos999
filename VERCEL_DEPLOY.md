# Deploying NARCOS BAY to Vercel

This project is now Vercel-ready. The backend runs as a single serverless
function (`api/index.js` -> Express), the storefront is the Vercel static
output, and everything data-related lives in Supabase + Cloudinary + Telegram
(no local disk state).

## 1. One-time Supabase migration (required)

The storefront data already lives in Supabase, but 5 tables previously lived in
a local SQLite file. They must exist in Supabase before deploying.

1. Open your Supabase project: **Dashboard -> SQL Editor**.
2. Open `supabase/migration_vercel.sql` from this repo, copy the whole file.
3. Paste it into the SQL Editor and click **Run**. (Safe to run twice.)
4. Verify: `stories`, `story_likes`, `telegram_users`, `telegram_broadcasts`,
   `payment_method_details` now appear under **Table Editor**. Existing stories,
   Telegram users, and payment methods are seeded automatically.

## 2. Push the repo and import into Vercel

```bash
# create an empty repo on github.com/gitlab.com first, then:
git remote add origin <your-repo-url>
git push -u origin master
```

Then in Vercel: **Add New -> Project -> Import** the repository. The
`vercel.json` configures the build automatically:

- buildCommand: `npm run build` (builds the frontend)
- outputDirectory: `frontend/dist`
- `/api/*` -> serverless function, everything else -> SPA

Set the project's **Root Directory** to `/` (default).

## 3. Environment variables

In Vercel: **Project -> Settings -> Environment Variables** (Production), copy
the values from `backend/.env` (or create from `.env.example`):

| Variable                | Required | Notes                                  |
| ----------------------- | -------- | -------------------------------------- |
| `SUPABASE_URL`          | yes      | from Supabase settings                 |
| `SUPABASE_SERVICE_KEY`  | yes      | service role key                       |
| `CLOUDINARY_CLOUD_NAME` | yes      |                                        |
| `CLOUDINARY_API_KEY`    | yes      |                                        |
| `CLOUDINARY_API_SECRET` | yes      |                                        |
| `TELEGRAM_BOT_TOKEN`    | yes      | from @BotFather                        |
| `TELEGRAM_ADMIN_ID`     | yes      | your Telegram user id                  |
| `AUTH_SECRET`           | yes      | **must match** `backend/.env` exactly  |

## 4. Deploy

Click **Deploy**. Vercel builds the frontend, bundles the API function, and
gives you a `*.vercel.app` URL. Admin login is the usual email + password
(`admin@narcosbay.com` / your password), then the admin gate code `10042`.

> **Large media uploads:** Vercel serverless functions cap request bodies
> (~4.5 MB). Uploading big product videos from the hosted admin panel will
> fail. Do large media uploads from your local environment instead
> (`npm --prefix backend run dev` while your local DB matches production via
> Supabase). Everything else (products, orders, settings, stories) works fine.

## 5. Point the Telegram bot at the webhook

Once the site is live, register the webhook (run locally, needs `backend/.env`):

```bash
npm run bot:webhook -- https://narcosbay.store
```

Expected: `{ "ok": true, "url": "https://narcosbay.store/api/telegram/webhook", "username": "..." }`

The bot will now receive Telegram updates through Vercel instead of local
polling. Your local backend will stop answering the bot (Telegram only allows
one source) - this is expected.

You can also (re)register the webhook from the web admin: `POST
/api/telegram/set-webhook` (admin token) with `{ "url": "https://narcosbay.store" }`.

## 5b. Replacing a deleted bot (no redeploy)

Telegram can delete a bot account. When that happens you do **not** need to
change code or environment variables:

1. Create a new bot in @BotFather, copy its token.
2. Open the site's admin **Bot Panel** (`/admin/bot`) -> **Bot Identity — Replace Bot**.
3. Paste the new token (and optionally a new admin Telegram ID) and click
   **Connect / Replace bot**.
4. That one action validates the token via `getMe`, stores it in the
   Supabase `telegram_config` table (which overrides `TELEGRAM_BOT_TOKEN`),
   registers the webhook against the current domain, and repoints the
   storefront's Telegram link at the new bot.

Run `supabase/migration_telegram_config.sql` once in the Supabase SQL Editor
before using this (RLS is enabled with no public policy, so only the backend
service key can read the token — make sure `SUPABASE_SERVICE_KEY` is set).

Existing site<->Telegram links are kept: stored `telegram_id`s are Telegram
*user* IDs, so users just need to `/start` the new bot once.

## 6. Custom domain (e.g. NARCOSBAY.store)

You must **buy** the domain yourself (registrars: Cloudflare, Porkbun,
Namecheap...). Both `narcosbay.store` and `narcosbay.com` were available at
last check. Then:

1. In Vercel: **Project -> Settings -> Domains -> Add** -> type
   `narcosbay.store`.
2. Vercel shows the DNS records to add at your registrar (typically a `CNAME`
   `narcosbay.store` -> `cname.vercel-dns.com`, or A/AAAA records).
3. Add the records at your registrar, then click **Verify** in Vercel.
4. Vercel provisions a free HTTPS certificate automatically (a few minutes).
5. **Re-run the webhook step** with `https://narcosbay.store` so the bot uses
   the custom domain.

## Local development (unchanged)

```bash
bash start.sh          # backend on :3001 + Vite dev on :5173
npm run build          # production build (same as Vercel)
npm run dev:backend    # backend only, serves frontend/dist + polls the bot
```

Note: once you've registered the production webhook (step 5), the local bot
polling will get `409` from Telegram. For local bot testing, temporarily point
the webhook back to empty (`deleteWebhook`) or use a test bot token.
